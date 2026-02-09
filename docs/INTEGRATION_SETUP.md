# Integration Setup Guide

This guide will walk you through setting up Google Calendar and WhatsApp integrations for your booking system. These integrations allow bookings to automatically appear in your calendar and send WhatsApp notifications to customers.

---

## Table of Contents

1. [Google Calendar Setup](#google-calendar-setup)
2. [WhatsApp Business API Setup](#whatsapp-business-api-setup)
3. [Providing Credentials to Your Developer](#providing-credentials-to-your-developer)

---

## Google Calendar Setup

**Important:** You must use **your own Google account** (Customer's account) for this setup. The bookings will appear in **your calendar**, so you need to:

- Create the Google Cloud project with your Google account
- Share your calendar with the service account
- Use your calendar ID (e.g., `your-email@gmail.com`)

**Do NOT use customer accounts** - this is for your business calendar only.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top
3. Click **"New Project"**
4. Enter a project name (e.g., "EAT Cycling Booking")
5. Click **"Create"**
6. Wait for the project to be created, then select it from the dropdown

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Calendar API"**
3. Click on **"Google Calendar API"**
4. Click **"Enable"**
5. Wait for it to enable (this may take a minute)

### Step 3: Create a Service Account

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"Service account"**
4. Enter a name (e.g., "booking-calendar")
5. Click **"Create and Continue"**
6. Skip the optional steps and click **"Done"**

### Step 4: Create and Download Service Account Key

1. In the **"Credentials"** page, find your service account in the list
2. Click on the service account email address
3. Go to the **"Keys"** tab
4. Click **"Add Key"** → **"Create new key"**
5. Select **"JSON"** format
6. Click **"Create"**
7. A JSON file will download automatically - **keep this file safe!**

### Step 5: Share Your Calendar with the Service Account

**This is YOUR calendar** (Customer's calendar) where bookings will appear. You're giving the service account permission to add events to it.

1. Open [Google Calendar](https://calendar.google.com/) **with your Google account**
2. On the left sidebar, find **"My calendars"** and hover over **your calendar** (the one where you want bookings to appear)
3. Click the three dots (⋮) next to your calendar name
4. Select **"Settings and sharing"**
5. Scroll down to **"Share with specific people"**
6. Click **"Add people"**
7. Enter the service account email address (found in the JSON file you downloaded, it looks like: `something@project-name.iam.gserviceaccount.com`)
8. Set permission to **"Make changes to events"**
9. Click **"Send"**

### Step 6: Get Your Calendar ID

**This is YOUR calendar ID** (Customer's calendar) where bookings will appear.

1. Still in Google Calendar settings (for your calendar)
2. Scroll down to **"Integrate calendar"**
3. Find **"Calendar ID"** - it will look like:
   - `your-email@gmail.com` (for your personal calendar), OR
   - `something@group.calendar.google.com` (for a shared calendar)
4. **Copy this Calendar ID** - this is what your developer will use to add bookings to your calendar

### Step 7: Prepare the Service Account Key

The JSON file you downloaded needs to be converted to a special format. You have two options:

**Option A: Using a Website (Easiest)**

1. Go to [Base64 Encode](https://www.base64encode.org/)
2. Open the JSON file you downloaded in a text editor
3. Copy the entire contents of the file
4. Paste it into the Base64 encoder website
5. Click **"Encode"**
6. Copy the encoded text (it will be a very long string)

**Option B: Using Command Line (Mac/Linux)**

1. Open Terminal
2. Navigate to where you saved the JSON file
3. Run: `cat your-service-account-file.json | base64`
4. Copy the output (it will be a very long string)

**What you now have:**

- ✅ **Calendar ID**: Your calendar ID (e.g., `your-email@gmail.com`)
- ✅ **Service Account Key**: The base64-encoded string from the JSON file

---

## WhatsApp Business API Setup

### Step 1: Create a Meta Business Account

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. If you don't have a business account, click **"Create Account"**
3. Follow the prompts to create your business account
4. Verify your business if required

### Step 2: Set Up WhatsApp Business API

1. In Meta Business Suite, go to **"WhatsApp"** in the left menu
2. Click **"Get Started"** or **"Set Up WhatsApp"**
3. Follow the setup wizard to connect WhatsApp Business API
4. You may need to verify your phone number

### Step 3: Get Your Phone Number ID

1. In Meta Business Suite, go to **"WhatsApp"** → **"API Setup"** or **"Phone Numbers"**
2. Find your WhatsApp Business phone number
3. Click on it to view details
4. Look for **"Phone number ID"** - it's a long number (e.g., `123456789012345`)
5. **Copy this Phone Number ID** - you'll need it later

**Alternative way to find Phone Number ID:**

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app (or create one if needed)
3. Go to **"WhatsApp"** → **"API Setup"**
4. Find **"Phone number ID"** in the displayed information

### Step 4: Get Your Access Token

1. In Meta Business Suite, go to **"WhatsApp"** → **"API Setup"**
2. Look for **"Temporary access token"** or **"Access token"**
3. Click **"Copy"** or **"Generate token"**
4. **Copy this token** - it's a very long string starting with something like `EAAM...`

**Important Notes:**

- Temporary tokens expire after a certain time
- For production use, you'll need a permanent token (System User token)
- Your developer can help set up a permanent token if needed

### Step 5: Set Up Permanent Access Token (Recommended)

For production use, you'll want a permanent token:

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **"Tools"** → **"WhatsApp"** → **"API Setup"**
4. Scroll down to **"System users"**
5. Click **"Create System User"** or use an existing one
6. Assign WhatsApp permissions to the system user
7. Generate a token for the system user
8. **Copy this token** - this is your permanent access token

**What you now have:**

- ✅ **Phone Number ID**: Your WhatsApp phone number ID (long number)
- ✅ **Access Token**: Your WhatsApp API access token (long string)

---

## Providing Credentials to Your Developer

Once you have all the credentials, provide them to your developer in this format:

### Google Calendar Credentials

```
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_KEY=your-base64-encoded-service-account-key
```

**Example:**

```
GOOGLE_CALENDAR_ID=eatcycling@gmail.com
GOOGLE_SERVICE_ACCOUNT_KEY=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6...
```

### WhatsApp Credentials

```
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_API_TOKEN=your-access-token
```

**Example:**

```
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_API_TOKEN=EAAMaHPpdxEUBQnFupayR4V9l2b7uXZBZAw3R5azM5qn1NUjbK9JT7FQjiFFiGHhJYDB5WwD1exCgjQAEbnv2nEWSZB8ZAWWf66D0hGYbODJp9ZAdI9ZAFjbgndWyygtQoP8VP24PEagQxXn1oXX56Pqh4Vhlt4TzwuGeTfl5Syq3387YZCNlRjHZBT7JjjOxs8rjlbJFPpc1qZAdfl9rt28PvovIeZCP7aUwr2a5K0KUmSzZBefrNMbmLv8W5nZAy66IGENlph487hYodLsJn7ZCTJKm67SwjmNMyblDH1LgZD
```

### Security Note

**Important:** These credentials are sensitive. Share them securely with your developer:

- Use a secure method (encrypted email, password manager share, or secure messaging)
- Don't share them in public channels or unsecured emails
- Your developer will add them to the system securely

---

## Testing Your Integrations

After your developer has set up the integrations, you can test them:

### Test Google Calendar Integration

1. Create a test booking through the booking form
2. Check your Google Calendar - the booking should appear automatically
3. The event should show:
   - Service type
   - Customer name
   - Phone number
   - Bike details

### Test WhatsApp Integration

1. Create a test booking with your own phone number
2. You should receive a WhatsApp confirmation message
3. In the admin dashboard, mark the booking as "ready"
4. You should receive another WhatsApp message saying the bike is ready

---

## Troubleshooting

### Google Calendar Issues

**Problem:** Bookings not appearing in calendar

- **Check:** Service account has "Make changes to events" permission
- **Check:** Calendar ID is correct
- **Check:** Service account key is correctly base64 encoded
- **Solution:** Re-share calendar with service account email

**Problem:** "Permission denied" errors

- **Check:** Service account email is added to calendar sharing
- **Check:** Permission level is "Make changes to events" or "Make changes and manage sharing"
- **Solution:** Remove and re-add service account with correct permissions

### WhatsApp Issues

**Problem:** WhatsApp messages not sending

- **Check:** Phone Number ID is correct
- **Check:** Access token is valid (not expired)
- **Check:** Phone numbers are in correct format (with country code)
- **Solution:** Generate a new access token if expired

**Problem:** "Template not found" errors

- **Note:** WhatsApp requires approved message templates
- **Solution:** Your developer needs to set up WhatsApp message templates in Meta Business Suite
- Templates need to be approved by Meta before use

**Problem:** Rate limits

- **Note:** WhatsApp has rate limits on messages
- **Solution:** Wait and retry, or contact Meta support if limits are too restrictive

---

## Additional WhatsApp Setup (For Your Developer)

Your developer will also need to set up WhatsApp message templates. These are pre-approved message formats that WhatsApp requires for automated messages.

**Required Templates:**

1. **Booking Confirmation** - Sent when a booking is created
2. **Bike Ready Notification** - Sent when you mark a booking as ready
3. **Service Reminder** - Sent for 6-month reminders
4. **Booking Cancellation** - Sent when a booking is cancelled

**Template Setup:**

1. Go to Meta Business Suite → **WhatsApp** → **Message Templates**
2. Create templates for each message type
3. Submit for approval (can take 24-48 hours)
4. Once approved, provide template names to your developer

---

## Quick Reference Checklist

### Google Calendar Setup

- [ ] Created Google Cloud project
- [ ] Enabled Google Calendar API
- [ ] Created service account
- [ ] Downloaded service account JSON key
- [ ] Base64 encoded the JSON key
- [ ] Shared calendar with service account email
- [ ] Got Calendar ID
- [ ] Provided credentials to developer

### WhatsApp Setup

- [ ] Created Meta Business account
- [ ] Set up WhatsApp Business API
- [ ] Got Phone Number ID
- [ ] Got Access Token (or permanent token)
- [ ] Set up message templates (or provided to developer)
- [ ] Provided credentials to developer

---

**Need Help?**

If you get stuck at any step:

1. Check the troubleshooting section above
2. Contact your developer for assistance
3. Refer to official documentation:
   - [Google Calendar API Docs](https://developers.google.com/calendar/api)
   - [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)

---

**Last Updated:** February 2026
