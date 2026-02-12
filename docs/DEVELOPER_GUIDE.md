# Developer Guide - EAT Cycling Booking System

This guide is for developers working on or maintaining the EAT Cycling booking system. Use this when returning to the project after time away.

---

## Quick Start

### Getting the Project Running

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd eatcyclingbooking
   npm install
   ```

2. **Set Up Environment Variables**
   - Copy `.env.local.example` to `.env.local` (if exists) or create `.env.local`
   - Add required variables (see [Environment Variables](#environment-variables))

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   - Open [http://localhost:3000](http://localhost:3000)

4. **Access Admin Dashboard**
   - Go to [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
   - Log in with admin credentials (see [ADMIN_SETUP.md](./ADMIN_SETUP.md))

---

## Project Structure

```
eatcyclingbooking/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Public booking form
│   │   ├── admin/             # Admin dashboard pages
│   │   │   ├── page.tsx       # Dashboard home
│   │   │   ├── bookings/      # Bookings management
│   │   │   ├── customers/     # Customer search
│   │   │   ├── availability/  # Availability settings
│   │   │   ├── service-limits/ # Service limits
│   │   │   └── reminders/     # Reminder management
│   │   └── api/               # API routes
│   │       ├── bookings/      # Booking CRUD
│   │       ├── admin/         # Admin-only endpoints
│   │       ├── auth/          # Authentication
│   │       └── cron/           # Scheduled jobs
│   ├── components/            # React components
│   │   ├── booking-form.tsx   # Main booking form
│   │   ├── admin-header.tsx   # Admin navigation
│   │   └── ...
│   └── lib/                    # Utility functions
│       ├── supabase.ts        # Supabase client (client-side)
│       ├── supabase-server.ts # Supabase client (server-side)
│       ├── whatsapp.ts        # WhatsApp integration
│       └── types.ts           # TypeScript types
├── supabase/
│   └── migrations/            # Database migrations
├── public/                     # Static assets
└── .env.local                  # Environment variables (gitignored)
```

---

## Key Files to Know

### Core Application Files

- **`src/app/page.tsx`** - Public booking form (main entry point)
- **`src/app/admin/page.tsx`** - Admin dashboard home
- **`src/components/booking-form.tsx`** - Booking form component (used by public and admin)
- **`src/lib/types.ts`** - All TypeScript types/interfaces

### API Routes

- **`src/app/api/bookings/route.ts`** - Create bookings (public)
- **`src/app/api/admin/bookings/route.ts`** - Admin booking management
- **`src/app/api/auth/login/route.ts`** - Magic link authentication
- **`src/app/api/auth/password-login/route.ts`** - Password authentication

### Configuration

- **`middleware.ts`** - Authentication middleware for admin routes
- **`next.config.ts`** - Next.js configuration
- **`vercel.json`** - Vercel deployment configuration
- **`.env.local`** - Environment variables (not in git)

### Database

- **`supabase/migrations/`** - Database schema migrations (run in order)

---

## Environment Variables

### Required for Development

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# WhatsApp (Optional for basic testing)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_TOKEN=
```

### Optional Variables

```bash
# WhatsApp Templates
WHATSAPP_BOOKING_TEMPLATE_NAME=booking_confirmation
WHATSAPP_READY_TEMPLATE_NAME=bike_ready_notification
WHATSAPP_REMINDER_TEMPLATE_NAME=service_reminder_6months
WHATSAPP_CANCELLATION_TEMPLATE_NAME=booking_cancellation
WHATSAPP_TEMPLATE_LANGUAGE=en

# Other
CRON_SECRET=
RESEND_API_KEY=
ADMIN_EMAIL=
```

**Note:** See [ADMIN_SETUP.md](./ADMIN_SETUP.md) for where to find these values.

---

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes**
   - Follow existing code patterns
   - Use TypeScript types from `src/lib/types.ts`
   - Use Tailwind CSS for styling

3. **Test locally**
   ```bash
   npm run dev
   ```
   - Test the booking form
   - Test admin dashboard
   - Check browser console for errors

4. **Run linter**
   ```bash
   npm run lint
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

### Testing Checklist

Before deploying:
- [ ] Booking form works end-to-end
- [ ] Admin dashboard loads and functions
- [ ] Authentication works (magic link and password)
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Database migrations run successfully (if any)

---

## Common Development Tasks

### Adding a New Service Type

1. **Update Types** (`src/lib/types.ts`)
   ```typescript
   export type ServiceType = 
     | 'basic_service'
     | 'full_service'
     | 'strip_and_rebuild'
     | 'bosch_diagnostics'
     | 'your_new_service'; // Add here
   ```

2. **Update Labels** (`src/lib/types.ts`)
   ```typescript
   export const SERVICE_LABELS: Record<ServiceType, string> = {
     // ... existing
     your_new_service: 'Your New Service',
   };
   ```

3. **Update Booking Form** (`src/components/booking-form.tsx`)
   - Add to `SERVICES` array

### Adding a New Booking Status

1. **Update Types** (`src/lib/types.ts`)
   ```typescript
   export type BookingStatus = 
     | 'pending'
     | 'confirmed'
     | 'in_progress'
     | 'ready'
     | 'collected'
     | 'cancelled'
     | 'your_new_status';
   ```

2. **Update Database** (if needed)
   - Add migration if status needs database constraint

3. **Update UI** (admin dashboard)
   - Add status filter/display in `src/app/admin/bookings/page.tsx`

### Adding a New API Endpoint

1. **Create route file** (`src/app/api/your-endpoint/route.ts`)
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   
   export async function GET(request: NextRequest) {
     // Your code
     return NextResponse.json({ data: 'result' });
   }
   ```

2. **Add authentication** (if admin-only)
   - Use `checkAuth()` from `src/lib/auth-helpers.ts`
   - Or add to `middleware.ts` for route protection

### Running Database Migrations

1. **Go to Supabase Dashboard**
   - Navigate to SQL Editor

2. **Run migrations in order**
   - Run each file in `supabase/migrations/` sequentially
   - Check for errors

3. **Verify**
   - Check tables exist
   - Verify RLS policies are set

---

## Architecture Decisions

### Why Phone Number as Primary Identifier?

- Business requirement: Customers may not have emails
- Phone is more reliable for WhatsApp notifications
- Simplifies customer lookup

### Why Date-Based Booking (No Time Slots)?

- Business requirement: Eddie manages his own schedule
- Reduces complexity
- More flexible for the business owner

### Authentication Strategy

- **Magic Links** (default): Better UX, passwordless
- **Password Fallback**: For when email rate limits hit
- **Session Management**: Handled by Supabase
- **Cache**: LocalStorage cache for offline resilience

### Calendar Integration

- **Service Account**: More reliable than OAuth tokens
- **Base64 Encoding**: Required for environment variable storage
- **All-Day Events**: No specific times, just dates

### WhatsApp Integration

- **Template Messages**: Required by Meta for automated messages
- **Phone Formatting**: Automatic UK number formatting (0 → 44)
- **Error Handling**: Graceful degradation if WhatsApp fails

---

## Important Notes

### ⚠️ Critical Things to Remember

1. **Phone Number Format**
   - System automatically converts UK numbers (0xxx → 44xxx)
   - Always store in E.164 format (+44...)

2. **Date Handling**
   - All dates stored as YYYY-MM-DD strings
   - Timezone: Europe/London
   - Use date-fns for date operations

3. **Environment Variables**
   - `NEXT_PUBLIC_*` variables are exposed to client
   - Never put secrets in `NEXT_PUBLIC_*` variables

4. **Database Migrations**
   - Always run migrations in order
   - Test migrations on a copy first
   - Never modify existing migrations (create new ones)

5. **WhatsApp Templates**
   - Templates must be approved by Meta before use
   - Approval can take 24-48 hours
   - Template names must match exactly

6. **Supabase Rate Limits**
   - Email sending: 2 emails/hour per address
   - Use password login when rate limited
   - Consider caching for frequently accessed data

### Common Gotchas

- **WhatsApp Messages**: Template names are case-sensitive
- **Date Picker**: Excludes unavailable dates client-side, but server validates too
- **Session Expiry**: Admin sessions may expire - just re-login

---

## Deployment

### Pre-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations run
- [ ] WhatsApp templates approved
- [ ] Google Calendar shared with service account
- [ ] Test booking created successfully
- [ ] Admin login works
- [ ] No console errors

### Deployment Process

1. **Push to main branch**
   ```bash
   git push origin main
   ```

2. **Vercel auto-deploys**
   - Check Vercel dashboard for deployment status
   - Review build logs for errors

3. **Verify Deployment**
   - Test booking form on production
   - Test admin dashboard
   - Check integrations (Calendar, WhatsApp)

### Rollback

If something breaks:
1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

---

## Troubleshooting

### Development Issues

**Problem:** `npm install` fails
- **Solution:** Delete `node_modules` and `package-lock.json`, then `npm install` again

**Problem:** TypeScript errors
- **Solution:** Run `npm run build` to see all errors, fix type issues

**Problem:** Environment variables not working
- **Solution:** Restart dev server after changing `.env.local`
- **Check:** Variable names match exactly (case-sensitive)

### Database Issues

**Problem:** Migrations fail
- **Solution:** Check Supabase logs, verify SQL syntax
- **Note:** Some migrations depend on previous ones

**Problem:** RLS policies blocking queries
- **Solution:** Check policies in Supabase Dashboard → Authentication → Policies
- **Verify:** Service role key is used for admin operations

### Integration Issues

**Problem:** Google Calendar not working
- **Check:** Service account key is base64 encoded correctly
- **Check:** Calendar is shared with service account email
- **Check:** Calendar ID is correct format

**Problem:** WhatsApp not sending
- **Check:** Phone Number ID is correct
- **Check:** Access token is valid (not expired)
- **Check:** Template names match exactly
- **Check:** Templates are approved in Meta Business Suite

---

## Maintenance Tasks

### Regular Maintenance

**Weekly:**
- Check for failed WhatsApp messages (admin dashboard → Reminders → Failed)
- Review booking volume and system performance

**Monthly:**
- Review reminder statistics
- Check for any error patterns in logs
- Update availability settings if needed

**As Needed:**
- Add excluded dates for holidays
- Adjust service limits
- Create new admin accounts
- Reset passwords (if rate limited)

### Monitoring

- **Vercel Logs**: Check function logs for errors
- **Supabase Logs**: Check database and auth logs
- **Admin Dashboard**: Check reminder failures, booking issues

---

## Getting Help

### Documentation

- **USER_GUIDE.md** - Customer-facing usage guide
- **ADMIN_SETUP.md** - Technical admin setup
- **INTEGRATION_SETUP.md** - Integration setup (customer-facing)
- **CLAUDE.md** - Project overview and business rules

### External Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Google Calendar API](https://developers.google.com/calendar/api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

---

## Quick Reference

### Common Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Important URLs

- **Local Dev**: http://localhost:3000
- **Admin Login**: http://localhost:3000/admin/login
- **Production**: https://book.eatcycling.co.uk
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard

### Key Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SECRET_KEY` - Server-side Supabase key
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone number ID
- `WHATSAPP_API_TOKEN` - WhatsApp access token

---

**Last Updated:** February 2026
