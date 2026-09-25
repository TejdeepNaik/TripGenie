import { PrismaClient, TripStatus, ExpenseCategory, TripRole, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash a default password for dev user
  const passwordHash = await bcrypt.hash('DevPassword123!', 10);

  // 1. Create or update primary dev user
  const devUser = await prisma.user.upsert({
    where: { email: 'dev-user@tripgenie.app' },
    update: {
      name: 'Alex Developer',
      passwordHash,
      role: Role.CUSTOMER,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    create: {
      email: 'dev-user@tripgenie.app',
      name: 'Alex Developer',
      passwordHash,
      role: Role.CUSTOMER,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
  });

  console.log(`👤 Seeded user: ${devUser.name} (${devUser.id}) [Role: ${devUser.role}]`);

  // 2. Create or update user preference
  const preference = await prisma.userPreference.upsert({
    where: { userId: devUser.id },
    update: {
      preferredCurrency: 'USD',
      theme: 'dark',
      language: 'en',
    },
    create: {
      userId: devUser.id,
      preferredCurrency: 'USD',
      theme: 'dark',
      language: 'en',
    },
  });

  console.log(`⚙️ Seeded preferences for user ID: ${preference.userId}`);

  // 3. Create rich set of demo places across destinations and categories
  const demoPlacesData = [
    {
      externalId: 'place_baga_beach_goa',
      name: 'Baga Beach',
      description: 'Famous beach in North Goa known for water sports, beach shacks, and vibrant nightlife.',
      category: 'Beaches',
      city: 'Goa',
      country: 'India',
      latitude: 15.5553,
      longitude: 73.7517,
      address: 'Baga Beach, Calangute, Goa 403516',
      rating: 4.6,
      priceLevel: 1,
      imageUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80',
    },
    {
      externalId: 'place_amber_fort_jaipur',
      name: 'Amber Fort & Palace',
      description: 'Majestic 16th-century hilltop fort overlooking Maota Lake, showcasing Hindu and Mughal architecture.',
      category: 'Culture',
      city: 'Jaipur',
      country: 'India',
      latitude: 26.9855,
      longitude: 75.8513,
      address: 'Devisinghpura, Amer, Jaipur, Rajasthan 302001',
      rating: 4.8,
      priceLevel: 2,
      imageUrl: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
    },
    {
      externalId: 'place_gateway_mumbai',
      name: 'Gateway of India',
      description: 'Iconic 26m-high arch overlooking the Arabian Sea, built in the early 20th century.',
      category: 'Culture',
      city: 'Mumbai',
      country: 'India',
      latitude: 18.922,
      longitude: 72.8347,
      address: 'Apollo Bandar, Colaba, Mumbai, Maharashtra 400001',
      rating: 4.7,
      priceLevel: 1,
      imageUrl: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80',
    },
    {
      externalId: 'place_britlos_shack_goa',
      name: 'Brittos Beach Shack',
      description: 'Iconic seafood beach shack serving fresh Goan delicacies, cocktails, and live music.',
      category: 'Food',
      city: 'Goa',
      country: 'India',
      latitude: 15.5562,
      longitude: 73.7518,
      address: 'House No. 7/171, Saunta Vaddo, Baga Beach, Goa 403516',
      rating: 4.4,
      priceLevel: 2,
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
    },
    {
      externalId: 'place_taj_lake_palace_udaipur',
      name: 'Taj Lake Palace',
      description: 'Luxury floating palace hotel in Lake Pichola, offering regal hospitality and stunning views.',
      category: 'Stays',
      city: 'Udaipur',
      country: 'India',
      latitude: 24.5753,
      longitude: 73.68,
      address: 'Pichola, Udaipur, Rajasthan 313001',
      rating: 4.9,
      priceLevel: 4,
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },
    {
      externalId: 'place_solang_valley_manali',
      name: 'Solang Valley Adventure Park',
      description: 'Picturesque valley known for paragliding, zorbing, skiing, and snow sports.',
      category: 'Adventure',
      city: 'Manali',
      country: 'India',
      latitude: 32.3166,
      longitude: 77.1578,
      address: 'Solang Valley, Manali, Himachal Pradesh 175131',
      rating: 4.5,
      priceLevel: 2,
      imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    },
    {
      externalId: 'place_tito_lane_goa',
      name: 'Titos Nightclub & Bar Street',
      description: 'Legendary nightlife hub in Goa filled with vibrant bars, DJs, and dance floors.',
      category: 'Nightlife',
      city: 'Goa',
      country: 'India',
      latitude: 15.5545,
      longitude: 73.7525,
      address: 'Tito Lane, Saunta Vaddo, Baga, Goa 403516',
      rating: 4.3,
      priceLevel: 3,
      imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    },
    {
      externalId: 'place_bapu_bazaar_jaipur',
      name: 'Bapu Bazaar Handicrafts',
      description: 'Vibrant traditional market famous for Jaipuri textiles, footwear (mojris), and handicrafts.',
      category: 'Shopping',
      city: 'Jaipur',
      country: 'India',
      latitude: 26.9189,
      longitude: 75.8239,
      address: 'Bapu Bazaar, Biseswarji, Jaipur, Rajasthan 302007',
      rating: 4.5,
      priceLevel: 2,
      imageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    },
    {
      externalId: 'place_cubbon_park_bengaluru',
      name: 'Cubbon Park & Bamboo Groves',
      description: 'Lush 300-acre green sanctuary in the heart of Bengaluru, perfect for morning walks.',
      category: 'Things to do',
      city: 'Bengaluru',
      country: 'India',
      latitude: 12.9763,
      longitude: 77.5929,
      address: 'Kasturba Road, Sampangi Rama Nagar, Bengaluru, Karnataka 560001',
      rating: 4.6,
      priceLevel: 1,
      imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    },
    {
      externalId: 'place_google_tokyo_sensoji',
      name: 'Sensō-ji Temple',
      description: 'Ancient Buddhist temple located in Asakusa, Tokyo, featuring the iconic Kaminarimon gate.',
      category: 'Culture',
      city: 'Tokyo',
      country: 'Japan',
      latitude: 35.7148,
      longitude: 139.7967,
      address: '2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan',
      rating: 4.8,
      priceLevel: 1,
      imageUrl: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80',
    },
  ];

  for (const placeData of demoPlacesData) {
    await prisma.place.upsert({
      where: { externalId: placeData.externalId },
      update: placeData,
      create: placeData,
    });
  }

  const samplePlace = await prisma.place.findFirst({ where: { externalId: 'place_google_tokyo_sensoji' } });
  console.log(`📍 Seeded ${demoPlacesData.length} places across multiple cities.`);

  // 4. Create example trip
  const existingTrip = await prisma.trip.findFirst({
    where: { ownerId: devUser.id, title: 'Kyoto & Tokyo Heritage Explorer' },
  });

  const trip = existingTrip
    ? existingTrip
    : await prisma.trip.create({
        data: {
          ownerId: devUser.id,
          title: 'Kyoto & Tokyo Heritage Explorer',
          destination: 'Tokyo & Kyoto, Japan',
          startDate: new Date('2026-10-10T00:00:00.000Z'),
          endDate: new Date('2026-10-20T00:00:00.000Z'),
          budget: 4500.0,
          currency: 'USD',
          status: TripStatus.PLANNING,
          members: {
            create: {
              userId: devUser.id,
              role: TripRole.OWNER,
            },
          },
          days: {
            create: [
              {
                date: new Date('2026-10-10T00:00:00.000Z'),
                title: 'Arrival in Tokyo',
                note: 'Check into hotel, explore Asakusa district.',
              },
              {
                date: new Date('2026-10-11T00:00:00.000Z'),
                title: 'Temples & Gardens',
                note: 'Visit Senso-ji Temple and Imperial Palace Gardens.',
              },
            ],
          },
        },
      });

  console.log(`🗺️ Seeded trip: ${trip.title} (${trip.id})`);

  // Add initial sample activity if none exists
  const firstDay = await prisma.tripDay.findFirst({ where: { tripId: trip.id } });
  if (firstDay && samplePlace) {
    const existingActivity = await prisma.activity.findFirst({ where: { tripDayId: firstDay.id } });
    if (!existingActivity) {
      await prisma.activity.create({
        data: {
          tripDayId: firstDay.id,
          placeId: samplePlace.id,
          title: samplePlace.name,
          description: 'Morning exploration of Senso-ji Temple grounds.',
          startTime: '09:00',
          endTime: '11:00',
          durationMinutes: 120,
          estimatedCost: 0,
          sortOrder: 1,
        },
      });
      console.log('📌 Seeded sample activity for trip day 1.');
    }
  }

  // 5. Create example expense
  const existingExpense = await prisma.expense.findFirst({
    where: { tripId: trip.id, description: 'Traditional Ryokan Stay in Kyoto' },
  });

  if (!existingExpense) {
    const expense = await prisma.expense.create({
      data: {
        tripId: trip.id,
        payerId: devUser.id,
        amount: 320.0,
        currency: 'USD',
        category: ExpenseCategory.HOTEL,
        description: 'Traditional Ryokan Stay in Kyoto',
        expenseDate: new Date('2026-10-12T12:00:00.000Z'),
        splits: {
          create: {
            userId: devUser.id,
            amount: 320.0,
          },
        },
      },
    });

    console.log(`💳 Seeded expense: ${expense.description} ($${expense.amount})`);
  }

  console.log('✅ Database seeding finished successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
