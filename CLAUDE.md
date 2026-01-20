# EAT Cycling Booking System

## Project Overview

Booking system for EAT Cycling (bike servicing business) owned by Eddie. Replaces existing £50/month booking widget. Will be hosted at book.eatcycling.co.uk.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS

## Phase 1 Features

### Booking Form
- Service type selection
- Date picker (no time slots - Eddie manages his own schedule)
- Customer details: name, phone (required), email (optional)
- Bike details

### Services Offered
1. Basic service
2. Full service
3. Strip and rebuild
4. Bosch diagnostics

### Database Schema
- **customers**: phone (primary identifier), name, email
- **bookings**: customer_id, service_type, date, bike_details, status

### Integrations
- **Google Calendar**: Write bookings as calendar events
- **WhatsApp**:
  - Booking confirmation messages
  - "Bike ready" notification button
  - 6-month service reminder automation

### Admin Dashboard
- View all bookings
- Search customers by phone/name
- Mark bikes as ready (triggers WhatsApp notification)

## Key Business Rules

- Phone number is the primary customer identifier (not email)
- Date-based booking only - no specific time slots
- Eddie manages his own daily schedule manually

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

## Project Structure

```
/app
  /page.tsx              # Booking form (public)
  /admin
    /page.tsx            # Admin dashboard
    /bookings/page.tsx   # Bookings list
    /customers/page.tsx  # Customer search
/components
  /booking-form.tsx
  /date-picker.tsx
  /service-selector.tsx
/lib
  /supabase.ts           # Supabase client
  /types.ts              # TypeScript types
```
