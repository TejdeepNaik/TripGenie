import { db } from '../db/prisma.js';
import { getPlaceProvider, PlaceProvider } from '../places/place.provider.js';
import { getAIProvider, AIProvider } from './ai.provider.js';
import type { PlaceDTO } from '@tripgenie/types';
import type { AITripPlanResponse, AICopilotCommandResponse } from '@tripgenie/types';
import { mapActivityToDTO } from '../trips/activity.schemas.js';

function mapTripToResponseDTO(trip: any): any {
  return {
    id: trip.id,
    ownerId: trip.ownerId,
    title: trip.title,
    destination: trip.destination,
    startDate: trip.startDate.toISOString(),
    endDate: trip.endDate.toISOString(),
    budget: trip.budget ? Number(trip.budget) : null,
    currency: trip.currency,
    status: trip.status,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
    daysCount: trip.days?.length || 0,
    days: trip.days?.map((d: any) => ({
      id: d.id,
      date: d.date.toISOString(),
      title: d.title,
      note: d.note,
      activities: d.activities?.map((a: any) => mapActivityToDTO(a)),
    })),
  };
}

export async function generateTripPlanService(
  prompt: string,
  userId: string,
  providerOverride?: AIProvider,
  placeProviderOverride?: PlaceProvider
): Promise<AITripPlanResponse> {
  const aiProvider = providerOverride || getAIProvider();
  const placeProvider = placeProviderOverride || getPlaceProvider();

  // Pipeline Step 1: Extract structured intent
  const intent = await aiProvider.extractIntent(prompt);
  const requestedBudget = intent.budget !== undefined && intent.budget !== null ? intent.budget : null;

  // Pipeline Step 2: Retrieve candidate places via PlaceProvider
  let candidateResult = await placeProvider.searchPlaces({
    city: intent.destination,
    page: 1,
    limit: 25,
  });

  if (!candidateResult.places || candidateResult.places.length === 0) {
    candidateResult = await placeProvider.searchPlaces({
      q: intent.destination,
      page: 1,
      limit: 25,
    });
  }

  let candidatePlaces: PlaceDTO[] = candidateResult.places || [];

  const candidateMap = new Map<string, PlaceDTO>();
  candidatePlaces.forEach((p) => candidateMap.set(p.id, p));

  // Pipeline Step 3: AI selects ONLY candidate place IDs
  const planOutput = await aiProvider.generateTripPlan(prompt, intent, candidatePlaces);

  // Pipeline Step 4: Validate every returned placeId & calculate SERVER ACTUAL COST
  let serverTotalCost = 0;
  const validatedDays = planOutput.days.map((day) => {
    const validatedActivities = day.activities.map((act) => {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(act.placeId);
      const place = candidateMap.get(act.placeId);

      // Server-side cost calculation (completely ignore AI-provided estimatedTotalCost overrides)
      const serverCost = place?.priceLevel ? place.priceLevel * 150 : (act.estimatedCost || 100);
      serverTotalCost += serverCost;

      return {
        placeId: isUuid && place ? act.placeId : null,
        title: act.title || place?.name || 'Local Destination Spot',
        description: act.reason || place?.description || null,
        startTime: act.preferredStartTime || '10:00',
        durationMinutes: act.durationMinutes || 90,
        estimatedCost: serverCost,
      };
    });

    return {
      dayNumber: day.dayNumber,
      activities: validatedActivities,
    };
  });

  // HARD BUDGET ENFORCEMENT: actualTotalCost <= requestedBudget
  if (requestedBudget !== null && serverTotalCost > requestedBudget) {
    // Attempt deterministic trimming of optional activities
    for (const day of validatedDays) {
      while (day.activities.length > 1 && serverTotalCost > requestedBudget) {
        const removed = day.activities.pop();
        if (removed) {
          serverTotalCost -= removed.estimatedCost;
        }
      }
    }

    // If serverTotalCost still exceeds requested budget after trimming, throw controlled error BEFORE DB transaction
    if (serverTotalCost > requestedBudget) {
      throw new Error(
        `BUDGET_EXCEEDED: Requested budget of ${intent.currency} ${requestedBudget} cannot accommodate a valid itinerary (minimum calculated cost is ${intent.currency} ${serverTotalCost}).`
      );
    }
  }

  // Pipeline Step 5: Date bounds calculation
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + Math.max(0, intent.durationDays - 1));

  // Pipeline Step 6: Atomic Prisma transaction persistence
  const createdTrip = await db.$transaction(async (tx) => {
    const trip = await tx.trip.create({
      data: {
        ownerId: userId,
        title: planOutput.tripTitle || `${intent.destination} Trip`,
        destination: intent.destination,
        startDate,
        endDate,
        budget: requestedBudget !== null ? requestedBudget : serverTotalCost, // NEVER mutate requested budget upward
        currency: intent.currency || 'INR',
        status: 'PLANNING',
      },
    });

    await tx.tripMember.create({
      data: {
        tripId: trip.id,
        userId,
        role: 'OWNER',
      },
    });

    let totalActivitiesCount = 0;

    for (let i = 0; i < validatedDays.length; i++) {
      const dayData = validatedDays[i];
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);

      const day = await tx.tripDay.create({
        data: {
          tripId: trip.id,
          date: dayDate,
          title: `Day ${i + 1}: ${intent.destination} Highlights`,
        },
      });

      for (let j = 0; j < dayData.activities.length; j++) {
        const actData = dayData.activities[j];
        await tx.activity.create({
          data: {
            tripDayId: day.id,
            placeId: actData.placeId,
            title: actData.title,
            description: actData.description,
            startTime: actData.startTime,
            durationMinutes: actData.durationMinutes,
            estimatedCost: actData.estimatedCost,
            sortOrder: j,
          },
        });
        totalActivitiesCount++;
      }
    }

    return { trip, totalActivitiesCount };
  });

  return {
    tripId: createdTrip.trip.id,
    title: createdTrip.trip.title,
    destination: createdTrip.trip.destination,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    budget: createdTrip.trip.budget ? Number(createdTrip.trip.budget) : null,
    currency: createdTrip.trip.currency,
    summary: planOutput.summary || `Custom ${intent.durationDays}-day trip to ${intent.destination}`,
    estimatedTotalCost: serverTotalCost,
    daysCount: intent.durationDays,
    activitiesCount: createdTrip.totalActivitiesCount,
    explanation: `Generated itinerary with ${createdTrip.totalActivitiesCount} activities grounded in real places within your budget of ${intent.currency} ${requestedBudget ?? serverTotalCost}.`,
  };
}

export async function modifyTripCommandService(
  tripId: string,
  command: string,
  userId: string,
  providerOverride?: AIProvider,
  placeProviderOverride?: PlaceProvider
): Promise<AICopilotCommandResponse> {
  const aiProvider = providerOverride || getAIProvider();
  const placeProvider = placeProviderOverride || getPlaceProvider();

  // Verify trip membership
  let member;
  try {
    member = await db.tripMember.findFirst({
      where: { tripId, userId },
    });
  } catch {
    member = null;
  }

  if (!member) {
    throw new Error('NOT_FOUND: Trip not found or access denied.');
  }

  // Load existing trip details
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      days: {
        include: {
          activities: {
            include: { place: true },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!trip) {
    throw new Error('NOT_FOUND: Trip not found.');
  }

  // Fetch candidate places for trip destination
  const candidateResult = await placeProvider.searchPlaces({
    city: trip.destination,
    page: 1,
    limit: 15,
  });
  const candidatePlaces = candidateResult.places || [];

  const tripContext = {
    destination: trip.destination,
    budget: trip.budget ? Number(trip.budget) : null,
    days: trip.days.map((d, idx) => ({
      dayIndex: idx + 1,
      dayId: d.id,
      date: d.date.toISOString().split('T')[0],
      activities: d.activities.map((a) => ({
        id: a.id,
        title: a.title,
        cost: a.estimatedCost ? Number(a.estimatedCost) : 0,
        category: a.place?.category || 'General',
      })),
    })),
  };

  // Call AI provider to interpret command
  const commandOutput = await aiProvider.interpretTripCommand(command, tripContext, candidatePlaces);

  let updatedCount = 0;

  // Execute modifications in atomic transaction with hard budget enforcement
  await db.$transaction(async (tx) => {
    // 1. Remove requested activities
    if (commandOutput.removeActivityIds && commandOutput.removeActivityIds.length > 0) {
      const validRemoveIds = commandOutput.removeActivityIds.filter(
        (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (validRemoveIds.length > 0) {
        const deleted = await tx.activity.deleteMany({
          where: {
            id: { in: validRemoveIds },
            tripDay: { tripId },
          },
        });
        updatedCount += deleted.count;
      }
    }

    // 2. Add new activities if requested
    if (commandOutput.newActivities && commandOutput.newActivities.length > 0 && trip.days.length > 0) {
      const targetDayIndex = Math.min(
        trip.days.length - 1,
        Math.max(0, (commandOutput.targetDayIndex || 1) - 1)
      );
      const targetDay = trip.days[targetDayIndex];

      for (const newAct of commandOutput.newActivities) {
        const isUuid = newAct.placeId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newAct.placeId);

        await tx.activity.create({
          data: {
            tripDayId: targetDay.id,
            placeId: isUuid ? newAct.placeId : null,
            title: newAct.title,
            description: newAct.description || null,
            startTime: newAct.preferredStartTime || '14:00',
            durationMinutes: newAct.durationMinutes || 90,
            estimatedCost: newAct.estimatedCost || 150,
            notes: newAct.notes || null,
            sortOrder: targetDay.activities.length + 1,
          },
        });
        updatedCount++;
      }
    }

    // 3. Update budget if requested
    if (commandOutput.newBudget !== undefined && commandOutput.newBudget !== null) {
      await tx.trip.update({
        where: { id: tripId },
        data: { budget: commandOutput.newBudget },
      });
      updatedCount++;
    }

    // 4. Hard budget verification: actual activity total <= active budget
    const activeBudget = commandOutput.newBudget !== undefined && commandOutput.newBudget !== null
      ? commandOutput.newBudget
      : (trip.budget ? Number(trip.budget) : null);

    if (activeBudget !== null) {
      const remainingActivities = await tx.activity.findMany({
        where: { tripDay: { tripId } },
      });
      const calculatedTotal = remainingActivities.reduce(
        (sum, act) => sum + (act.estimatedCost ? Number(act.estimatedCost) : 0),
        0
      );

      if (calculatedTotal > activeBudget) {
        throw new Error(
          `BUDGET_EXCEEDED: Command would cause trip activity cost (${trip.currency} ${calculatedTotal}) to exceed current budget limit of ${trip.currency} ${activeBudget}.`
        );
      }
    }
  });

  // Refetch updated trip
  const updatedTrip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      days: {
        include: {
          activities: {
            include: { place: true },
          },
        },
        orderBy: { date: 'asc' },
      },
    },
  });

  return {
    tripId,
    appliedAction: commandOutput.action,
    explanation: commandOutput.explanation || 'Trip itinerary updated successfully.',
    activitiesUpdatedCount: updatedCount,
    trip: updatedTrip ? mapTripToResponseDTO(updatedTrip) : null,
  };
}
