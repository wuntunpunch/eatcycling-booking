# Deployment Guide: book.eatcycling.co.uk

This guide walks you through deploying the EAT Cycling booking system to Vercel.

## Prerequisites

- ✅ Project is in GitHub
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com) if needed)
- ✅ Domain access to `eatcycling.co.uk` DNS settings

---

## Step 1: Connect GitHub Repository to Vercel

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in or create an account

2. **Import Project**
   - Click **"Add New..."** → **"Project"**
   - Select **"Import Git Repository"**
   - Find and select your `eatcyclingbooking` repository
   - Click **"Import"**

3. **Configure Project**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

4. **Click "Deploy"** (we'll add environment variables next)

---

## Step 2: Configure Environment Variables

Before the first deployment completes, add all required environment variables:

1. **In Vercel Project Settings**
   - Go to your project → **Settings** → **Environment Variables**

2. **Add Supabase Variables** (Required)
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   SUPABASE_SECRET_KEY=your_supabase_service_role_key
   ```
   - Find these in: Supabase Dashboard → Project Settings → API

3. **Add WhatsApp Variables** (Required)
   ```
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_API_TOKEN=your_whatsapp_access_token
   ```
   - Get these from Meta Business Suite → WhatsApp Business API

4. **Add WhatsApp Template Variables** (Optional - with defaults)
   ```
   WHATSAPP_BOOKING_TEMPLATE_NAME=booking_confirmation
   WHATSAPP_READY_TEMPLATE_NAME=bike_ready
   WHATSAPP_REMINDER_TEMPLATE_NAME=service_reminder
   WHATSAPP_TEMPLATE_LANGUAGE=en_GB
   ```
   - Adjust these to match your approved WhatsApp templates

5. **Add Other Optional Variables**
   ```
   BOOKING_FORM_URL=https://book.eatcycling.co.uk
   NEXT_PUBLIC_SITE_URL=https://book.eatcycling.co.uk
   ADMIN_EMAIL=your-admin@email.com
   RESEND_API_KEY=your_resend_api_key
   CRON_SECRET=your_random_secret_string
   REMINDER_BATCH_SIZE=20
   ```
   - **CRON_SECRET**: Generate a random string for cron job security
   - **RESEND_API_KEY**: Only needed if using email features
   - **ADMIN_EMAIL**: Email for admin notifications

7. **Set Environment Scope**
   - For each variable, select: **Production**, **Preview**, and **Development**
   - Click **"Save"** after adding each variable

---

## Step 3: Configure Custom Domain

1. **In Vercel Project Settings**
   - Go to **Settings** → **Domains**

2. **Add Domain**
   - Enter: `book.eatcycling.co.uk`
   - Click **"Add"**

3. **Configure DNS**
   - Vercel will show you DNS records to add
   - You'll need to add a **CNAME** record:
     ```
     Type: CNAME
     Name: book
     Value: cname.vercel-dns.com
     ```
   - Or an **A** record if CNAME isn't supported:
     ```
     Type: A
     Name: book
     Value: 76.76.21.21
     ```

4. **Update DNS at Your Domain Provider**
   - Log into your domain registrar (where you manage `eatcycling.co.uk`)
   - Go to DNS settings
   - Add the CNAME or A record shown by Vercel
   - Save changes

5. **Wait for DNS Propagation**
   - DNS changes can take 5 minutes to 48 hours
   - Vercel will show "Valid Configuration" when ready
   - Check status in Vercel Dashboard → Domains

---

## Step 4: Verify Deployment

1. **Check Build Status**
   - Go to Vercel Dashboard → **Deployments**
   - Wait for build to complete (should show "Ready")
   - If build fails, check logs for errors

2. **Test Production URL**
   - Visit `https://book.eatcycling.co.uk` (once DNS propagates)
   - Or use the Vercel-provided URL: `your-project.vercel.app`

3. **Test Key Features**
   - ✅ Booking form loads
   - ✅ Can submit a test booking
   - ✅ Admin login works at `/admin/login`
   - ✅ WhatsApp confirmation sent (check test phone)

---

## Step 5: Configure Cron Jobs

Your `vercel.json` already includes cron configuration for reminders:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**This is already configured!** The cron job runs daily at 9 AM UTC.

**To verify cron jobs:**
- Go to Vercel Dashboard → **Settings** → **Cron Jobs**
- You should see the scheduled job listed
- Ensure `CRON_SECRET` environment variable is set (for security)

---

## Step 6: Set Up Production Database Migrations

1. **Run Migrations in Supabase**
   - Go to Supabase Dashboard → **SQL Editor**
   - Run all migration files from `supabase/migrations/` in order:
     - `001_initial_schema.sql`
     - `002_update_booking_status.sql`
     - `003_add_completion_tracking.sql`
     - `004_add_message_logs.sql`
     - `005_add_message_logs_rls.sql`

2. **Verify Tables**
   - Go to **Table Editor** in Supabase
   - Confirm these tables exist:
     - `customers`
     - `bookings`
     - `message_logs`

---

## Step 7: Security Checklist

- [ ] All environment variables are set (especially `CRON_SECRET`)
- [ ] Supabase RLS (Row Level Security) policies are enabled
- [ ] Admin authentication is working
- [ ] Cron endpoint is protected with `CRON_SECRET`
- [ ] HTTPS is enabled (automatic with Vercel)

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Verify all required environment variables are set
- Ensure `package.json` has correct build script

### Domain Not Working
- Wait 24-48 hours for DNS propagation
- Verify DNS records are correct
- Check Vercel Domains page for errors

### Environment Variables Not Working
- Ensure variables are set for **Production** environment
- Redeploy after adding variables (Vercel → Deployments → Redeploy)
- Check variable names match exactly (case-sensitive)

### WhatsApp Not Working
- Verify phone number ID and access token
- Check template names match approved templates
- Ensure phone numbers are in correct format (with country code)

---

## Next Steps After Deployment

1. **Test Full Booking Flow**
   - Submit a real booking
   - Verify WhatsApp message sent

2. **Set Up Monitoring**
   - Enable Vercel Analytics (optional)
   - Set up error tracking (e.g., Sentry)

3. **Create Admin Account**
   - Use Supabase Dashboard → Authentication → Users
   - Create admin user for password login

4. **Share the URL**
   - Share `https://book.eatcycling.co.uk` with customers

---

## Useful Vercel Commands

If you install Vercel CLI locally:
```bash
npm i -g vercel
vercel login
vercel link  # Link to your project
vercel env pull .env.local  # Pull environment variables locally
```

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/app/building-your-application/deploying)
- [Supabase Documentation](https://supabase.com/docs)
