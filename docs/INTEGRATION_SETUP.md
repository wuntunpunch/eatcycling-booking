# Integration Setup Guide

This guide will walk you through setting up the WhatsApp integration for your booking system. This integration sends WhatsApp notifications to customers for booking confirmations, bike ready alerts, and reminders.

---

## Table of Contents

1. [WhatsApp Business API Setup](#whatsapp-business-api-setup)
2. [Providing Credentials to Your Developer](#providing-credentials-to-your-developer)

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

After your developer has set up the integration, you can test it:

### Test WhatsApp Integration

1. Create a test booking with your own phone number
2. You should receive a WhatsApp confirmation message
3. In the admin dashboard, mark the booking as "ready"
4. You should receive another WhatsApp message saying the bike is ready

---

## Troubleshooting

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
   - [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)

---

**Last Updated:** February 2026
