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

### Password-Based Fallback Authentication

For emergency access when Supabase magic links are unavailable, password-based authentication is available via `/admin/login?fallback=true`.

**To create an admin account:**
1. Go to Supabase Dashboard > Authentication > Users
2. Click "Add user" > "Create new user"
3. Enter your email and password
4. The account will be created and can be used for password login

**Or create via SQL:**
```sql
-- In Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'your-admin@email.com',
  crypt('your-password', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated'
);
```

This uses Supabase's industry-standard authentication with secure password hashing (bcrypt), session management, and built-in security features.

### Password Reset & Rate Limits

**Email Rate Limits:**
- Supabase limits email sending to **2 emails per hour** per email address
- This affects magic link login and password reset emails
- Rate limit errors show: "email rate limit exceeded" (429 status)

**If Rate Limited - Reset Password via SQL:**

When email rate limits prevent password reset, you can reset the password directly in Supabase:

1. Go to Supabase Dashboard → SQL Editor
2. Find your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

3. Reset the password (replace `USER_ID` and `NEW_PASSWORD`):
```sql
UPDATE auth.users 
SET encrypted_password = crypt('NEW_PASSWORD', gen_salt('bf'))
WHERE id = 'USER_ID_FROM_ABOVE';
```

4. After resetting, use password login at `/admin/login?fallback=true`

**Alternative Solutions:**
- Wait up to 1 hour for rate limit to expire
- Use a different email address for admin account
- Increase rate limits in Supabase Dashboard (paid plans only)

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
