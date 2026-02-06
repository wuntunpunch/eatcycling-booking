# EAT Cycling Booking System - Technical Admin Setup Guide

This guide is for system administrators setting up and maintaining the EAT Cycling booking system.

**Note:** For Google Calendar and WhatsApp integration setup instructions (to share with customers), see [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md).

---

## Table of Contents

1. [Creating Admin Accounts](#creating-admin-accounts)
2. [Password Management](#password-management)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Troubleshooting](#troubleshooting)
6. [Deployment](#deployment)

---

## Creating Admin Accounts

### Method 1: Using Supabase Dashboard (Recommended)

1. Go to Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   - **Email**: Admin email address
   - **Password**: Secure password
5. Click **"Create user"**

The account is now ready to use for login.

### Method 2: Using SQL Editor

For programmatic creation or bulk account creation:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this SQL (replace `your-admin@email.com` and `your-password`):

```sql
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

**Note:** This uses Supabase's built-in bcrypt password hashing for security.

---

## Password Management

### Password Reset via Email

Users can reset passwords through the login page:
1. Go to `/admin/login`
2. Switch to password login
3. Click "Forgot password?"
4. Enter email
5. Check email for reset link

**Limitation:** Supabase limits email sending to **2 emails per hour** per email address. This affects both magic link login and password reset emails.

### Password Reset via SQL (When Rate Limited)

When email rate limits prevent password reset, reset directly in Supabase:

1. Go to Supabase Dashboard → **SQL Editor**
2. Find the user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

3. Reset the password (replace `USER_ID` and `NEW_PASSWORD`):
```sql
UPDATE auth.users 
SET encrypted_password = crypt('NEW_PASSWORD', gen_salt('bf'))
WHERE id = 'USER_ID_FROM_ABOVE';
```

4. After resetting, user can use password login at `/admin/login?fallback=true`

### Alternative Solutions for Rate Limits

- Wait up to 1 hour for rate limit to expire
- Use a different email address for admin account
- Increase rate limits in Supabase Dashboard (paid plans only)
- Use password login instead of magic links

---

## Environment Variables

Required environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

### Where to Find Supabase Credentials

1. Go to Supabase Dashboard → **Project Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → `SUPABASE_SECRET_KEY` (keep this secret!)

### Additional Environment Variables

For production deployment, you may also need:

```bash
# Google Calendar API (for calendar integration)
GOOGLE_CALENDAR_ID=
GOOGLE_SERVICE_ACCOUNT_KEY=

# WhatsApp API (for notifications)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_TOKEN=
```

**Note:** See [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md) for detailed instructions on how to obtain these credentials. This guide is customer-facing and can be shared with the business owner to walk them through the setup process.

---

## Database Setup

### Running Migrations

The database schema is managed through Supabase migrations in `/supabase/migrations/`.

**To apply migrations:**

1. Go to Supabase Dashboard → **SQL Editor**
2. Run each migration file in order (001, 002, 003, etc.)
3. Or use Supabase CLI:
```bash
supabase db push
```

### Key Database Tables

- **customers**: Customer information (phone is primary identifier)
- **bookings**: Booking records
- **availability_settings**: Day exclusion and service limit settings
- **excluded_dates**: Blocked dates/ranges
- **reminder_logs**: Reminder sending history

### Database Schema Notes

- Phone number is the primary customer identifier (not email)
- Bookings reference customers via `customer_id`
- Availability settings control date exclusions and service limits
- Reminder logs track 6-month service reminder sends

---

## Troubleshooting

### Authentication Issues

**Problem:** Users can't log in with magic links
- **Check:** Email rate limits (2 per hour per email)
- **Solution:** Use password login or wait for rate limit to expire
- **Check:** Supabase email configuration in dashboard

**Problem:** Password login not working
- **Check:** User exists in `auth.users` table
- **Check:** Password was set correctly (bcrypt hash)
- **Verify:** User email is confirmed (`email_confirmed_at` is not null)

**Problem:** Session expires immediately
- **Check:** Cookie settings in middleware
- **Check:** Supabase session configuration
- **Check:** Browser cookie settings

### Booking Issues

**Problem:** Bookings not appearing in Google Calendar
- **Check:** Google Calendar API credentials
- **Check:** Refresh token is valid
- **Check:** Calendar API permissions
- **Review:** Server logs for calendar API errors

**Problem:** WhatsApp notifications not sending
- **Check:** WhatsApp API credentials
- **Check:** Phone number format (must include country code)
- **Check:** WhatsApp API rate limits
- **Review:** Server logs for WhatsApp API errors

**Problem:** Date availability not working correctly
- **Check:** `availability_settings` table has correct data
- **Check:** `excluded_dates` table
- **Check:** Service limits in `availability_settings.max_services_per_day`
- **Verify:** Timezone settings (system uses Europe/London)

### Database Issues

**Problem:** Tables not found
- **Solution:** Run database migrations
- **Check:** Supabase connection credentials
- **Verify:** Database schema in Supabase dashboard

**Problem:** Data not syncing
- **Check:** Supabase connection is active
- **Check:** Row Level Security (RLS) policies
- **Review:** Server logs for database errors

### Performance Issues

**Problem:** Slow page loads
- **Check:** Supabase connection pooling
- **Check:** Database query performance
- **Review:** Vercel function logs for timeout issues
- **Consider:** Adding database indexes

---

## Deployment

### Vercel Deployment

The system is hosted on Vercel. To deploy:

1. **Connect Repository:**
   - Go to Vercel Dashboard
   - Import Git repository
   - Configure build settings

2. **Set Environment Variables:**
   - Add all required environment variables in Vercel dashboard
   - **Important:** Use `NEXT_PUBLIC_` prefix for client-side variables

3. **Build Configuration:**
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **Domain Configuration:**
   - Add custom domain: `book.eatcycling.co.uk`
   - Configure DNS records as instructed by Vercel

### Environment Variables in Vercel

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
GOOGLE_CALENDAR_ID
GOOGLE_SERVICE_ACCOUNT_KEY
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_API_TOKEN
```

**Note:** For Google Calendar and WhatsApp setup instructions, see [INTEGRATION_SETUP.md](./INTEGRATION_SETUP.md). This document can be shared with the customer to guide them through obtaining the necessary credentials.

### Post-Deployment Checklist

- [ ] Verify admin accounts can log in
- [ ] Test booking creation
- [ ] Verify Google Calendar integration
- [ ] Test WhatsApp notifications
- [ ] Check availability settings work
- [ ] Verify service limits function
- [ ] Test reminder system
- [ ] Check mobile responsiveness

---

## API Endpoints

### Public Endpoints

- `POST /api/bookings` - Create a new booking
- `GET /api/availability` - Get availability settings

### Admin Endpoints (Require Authentication)

- `GET /api/admin/bookings` - Get all bookings
- `PUT /api/admin/bookings/[id]` - Update booking
- `GET /api/admin/customers` - Search customers
- `GET /api/admin/availability` - Get availability settings
- `PUT /api/admin/availability` - Update availability settings
- `GET /api/admin/reminders` - Get reminders
- `POST /api/admin/reminders/send` - Send reminder

### Authentication Endpoints

- `POST /api/auth/login` - Request magic link
- `POST /api/auth/password-login` - Password login
- `POST /api/auth/forgot-password` - Request password reset
- `GET /api/auth/callback` - Handle magic link callback

---

## Security Considerations

### Authentication

- Uses Supabase's built-in authentication with secure password hashing (bcrypt)
- Session management handled by Supabase
- Magic links expire after use
- Password reset links have expiration

### API Security

- Admin endpoints protected by middleware authentication check
- Uses Supabase RLS (Row Level Security) where applicable
- Service role key only used server-side (never exposed to client)

### Data Protection

- Customer phone numbers are primary identifiers (GDPR consideration)
- Email addresses are optional
- Booking data stored securely in Supabase
- No sensitive payment information stored

---

## Monitoring and Logs

### Vercel Logs

- View function logs in Vercel Dashboard → Project → Functions
- Check for errors in API routes
- Monitor function execution times

### Supabase Logs

- View database logs in Supabase Dashboard → Logs
- Check authentication logs
- Monitor API usage

### Error Tracking

Consider adding error tracking service (e.g., Sentry) for production:
- Track client-side errors
- Monitor API errors
- Alert on critical issues

---

## Backup and Recovery

### Database Backups

- Supabase provides automatic daily backups
- Manual backups available in Supabase Dashboard → Database → Backups
- Can restore to point-in-time if needed

### Exporting Data

To export booking data:

```sql
-- Export all bookings with customer info
SELECT 
  b.id,
  b.reference_number,
  b.date,
  b.service_type,
  b.status,
  b.bike_details,
  b.created_at,
  c.name as customer_name,
  c.phone as customer_phone,
  c.email as customer_email
FROM bookings b
JOIN customers c ON b.customer_id = c.id
ORDER BY b.date DESC;
```

---

## Support and Maintenance

### Regular Maintenance Tasks

- Monitor booking volume and system performance
- Review failed reminders and retry if needed
- Check for and resolve any data inconsistencies
- Update availability settings as needed
- Review and clean up old excluded dates

### Common Admin Tasks

- Creating new admin accounts
- Resetting passwords (especially when rate limited)
- Adjusting service limits
- Blocking dates for holidays/closures
- Reviewing reminder statistics

---

**Last Updated:** February 2026
