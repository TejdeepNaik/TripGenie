# TripGenie UI/UX Design System & Frontend Architecture

## Overview
TripGenie's frontend (`apps/web`) is engineered to provide a polished, modern, premium travel experience adhering to the **Discover → Decide → Book → Travel** product framework.

---

## 1. Visual Design Tokens & Palette

- **Background**: Warm off-white (`#f8fafc` / `#f1f5f9`).
- **Surfaces & Cards**: Pure white (`#ffffff`) with subtle borders (`#e2e8f0`) and soft shadows (`shadow-sm`, `shadow-md`).
- **Primary Brand Color**: Deep Indigo / Ocean Blue (`#2563eb` / `#1d4ed8`) for primary CTAs, links, and active states.
- **Accent Color**: Emerald / Teal (`#0d9488` / `#10b981`) for pricing, confirmations, and success badges.
- **Typography**: Dark charcoal (`#0f172a`) for display/headings and slate gray (`#64748b`) for body/captions.
- **Borders & Shadows**: Soft neutral borders (`border-slate-200`) without heavy drop shadows.

---

## 2. Reusable Component Library (`packages/ui`)

1. **Button** (`packages/ui/src/components/Button.tsx`):
   - Variants: `primary`, `secondary`, `outline`, `danger`, `ghost`, `success`.
   - Sizes: `sm`, `md`, `lg`.
   - Spinner loading state and icon slot support.
2. **Card** (`packages/ui/src/components/Card.tsx`):
   - Pure white surface, subtle border, hoverable animation effects (`hover:-translate-y-0.5`).
3. **Badge** (`packages/ui/src/components/Badge.tsx`):
   - Status indicators (`success`, `warning`, `danger`, `info`, `purple`, `neutral`) with indicator dot.
4. **Input** (`packages/ui/src/components/Input.tsx`):
   - Clean light input with left/right icons, helper text, and error validation feedback.
5. **Modal** (`packages/ui/src/components/Modal.tsx`):
   - Glassmorphic backdrop blur (`bg-slate-900/60`), ESC listener, close button, body, and footer actions.
6. **Alert** (`packages/ui/src/components/Alert.tsx`):
   - Inline alert notification banners (`info`, `success`, `warning`, `danger`).
7. **EmptyState** (`packages/ui/src/components/EmptyState.tsx`):
   - Zero-state placeholder with icon, description, and call to action.

---

## 3. Product Routes & Navigation

- **Landing Page (`/`)**: Inspiring travel header, prominent search box (`📍 Where`, `👥 Guests`), popular destinations grid, system integrity status card.
- **Customer Dashboard (`/app`)**: Personalized greeting, 4 quick action cards (`Plan a Trip`, `Explore Places`, `My Bookings`, `My Trips`), active journey spotlight card.
- **Explore Places (`/app/explore`)**: Category tabs, search query filter, city selection, split-screen place card grid & interactive map (`MapView.tsx`).
- **My Bookings (`/app/bookings`)**: Filter tabs (`ALL`, `UPCOMING`, `PAST`, `CANCELLED`), status badges (`CONFIRMED`, `PENDING_PAYMENT`, `CANCELLED`, `REFUNDED`), "Pay Now" action, and cancellation trigger.
- **My Trips (`/app/trips`) & Detail (`/app/trips/[tripId]`)**: Itinerary day views, cost calculator, budget progress bar, activity modals.
- **Auth Pages (`/login` & `/register`)**: Form validation, error alerts, role selection, session restoration.

---

## 5. Phase 16.5 Visual QA & Accessibility Refinements

- **Accessibility & ARIA Attributes**:
  - `Modal`: Added `role="dialog"`, `aria-modal="true"`, dynamic `useId()` binding for `aria-labelledby` and `aria-describedby`, body scroll locking (`overflow: hidden`), keyboard `ESC` dismissal, and explicit accessible close button (`aria-label`).
  - `Input`: Dynamic `useId()` linking between label `<label htmlFor>` and input `<input id>`, along with `aria-invalid` and `aria-describedby` error announcement.
  - `Alert`: Added `role="alert"` and accessible dismiss button.
  - `Button`: Standardized default `type="button"` and `aria-busy={isLoading}` states.
- **Mobile Navigation Drawer**:
  - Toggable backdrop blur with touch overlay dismiss.
  - Body scroll lock during drawer open state.
  - Accessible `aria-expanded` and `aria-label` controls for touch targets.
- **Theme Cohesion**:
  - Converted legacy dark theme pages (`/login`, `/register`, `BookingModal`, `MockPaymentModal`, `PlaceCard`, `TripDetailPage`, `AICopilotBar`, `AITripPlannerModal`, `AddActivityModal`, `EditActivityModal`, `ConfirmDeleteModal`, `CreateTripPage`) to the light warm design system (`bg-slate-50`, `bg-white`, `border-slate-200`, `text-slate-900`).
- **Cancellation UX**:
  - Replaced browser-native `confirm()` popups with an interactive confirmation modal detailing refund policies and server-authoritative status guidance before proceeding with booking cancellations.
