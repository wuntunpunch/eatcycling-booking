# Cancellation Flow Setup Guide

This document contains the SQL migration scripts and WhatsApp template setup instructions for the cancellation flow feature.

## SQL Migration Scripts

### Migration 1: Add Cancelled Status

**File:** `supabase/migrations/010_add_cancelled_status.sql`

```sql
-- Add 'cancelled' status to booking_status enum
-- This allows bookings to be marked as cancelled by admins

ALTER TYPE booking_status ADD VALUE 'cancelled';
```

**To run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the SQL above
3. Click "Run" to execute

**Note:** PostgreSQL enum values cannot be removed once added, so this is a permanent change.

---

### Migration 2: Add Calendar Event ID

**File:** `supabase/migrations/011_add_calendar_event_id.sql`

```sql
-- Add calendar_event_id column to store Google Calendar event IDs
-- This allows us to delete calendar events when bookings are cancelled

ALTER TABLE bookings ADD COLUMN calendar_event_id VARCHAR(255);

-- Add index for efficient lookups
CREATE INDEX idx_bookings_calendar_event_id ON bookings(calendar_event_id);

-- Note: This field is nullable since existing bookings won't have event IDs
-- Future bookings will have this populated when calendar events are created
```

**To run:**
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the SQL above
3. Click "Run" to execute

**Note:** Existing bookings will have `NULL` for `calendar_event_id`. Only new bookings created after this migration will have calendar event IDs stored.

---

## WhatsApp Template Setup

### Template Requirements

You need to create a WhatsApp Business API template for cancellation notifications. This template must be approved by Meta before it can be used.

### Template Parameters

The cancellation notification uses the following parameters (in order):

1. **{{1}}** - Customer name (e.g., "John Smith")
2. **{{2}}** - Formatted date (e.g., "Monday, 15 January 2024")
3. **{{3}}** - Service type label (e.g., "Basic Service", "Full Service")
4. **{{4}}** - Reference number (optional, only if booking has a reference)
5. **{{5}}** - Rebooking link (pre-filled booking form URL)

**Important:** If the booking doesn't have a reference number, only 4 parameters are sent:
- {{1}} - Customer name
- {{2}} - Formatted date
- {{3}} - Service type
- {{4}} - Rebooking link (note: this becomes {{4}} instead of {{5}})

### Template Example (With Reference)

**Template Name:** `booking_cancellation` (or your preferred name)

**Category:** `UTILITY` or `TRANSACTIONAL`

**Language:** `en` (or `en_GB`)

**Template Body:**
```
Hi {{1}}! 👋

Your booking with EAT Cycling has been cancelled:

📅 {{2}}
🔧 {{3}}
🔖 Ref: {{4}}

Need to rebook? Use this link:
{{5}}

If you have any questions, please get in touch!

- Eddie, EAT Cycling
```

### Template Example (Without Reference - Alternative)

If you want a simpler template that doesn't include reference numbers:

**Template Body:**
```
Hi {{1}}! 👋

Your booking with EAT Cycling has been cancelled:

📅 {{2}}
🔧 {{3}}

Need to rebook? Use this link:
{{4}}

If you have any questions, please get in touch!

- Eddie, EAT Cycling
```

**Note:** The code handles both cases automatically - if a booking has a reference, it uses 5 parameters; if not, it uses 4.

### Creating the Template in Meta Business Manager

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp** → **Message Templates**
3. Click **Create Template**
4. Fill in:
   - **Template Name:** `booking_cancellation` (or your preferred name)
   - **Category:** `UTILITY` or `TRANSACTIONAL`
   - **Language:** `en` (or `en_GB`)
5. In the template body, use the format above with placeholders `{{1}}`, `{{2}}`, etc.
6. Submit for approval (can take 24-48 hours)

### Environment Variable

After the template is approved, add this to your `.env.local`:

```bash
WHATSAPP_CANCELLATION_TEMPLATE_NAME=booking_cancellation
```

Or whatever name you used when creating the template.

**Note:** If this environment variable is not set, the system will fall back to free-form messages (which only work within the 24-hour messaging window).

### Fallback Message (No Template)

If no template is configured or the template fails, the system uses this free-form message:

```
Hi {customerName}! 👋

Your booking with EAT Cycling has been cancelled:

📅 {formattedDate}
🔧 {serviceType}
🔖 Ref: {referenceNumber} (if available)

Need to rebook? Use this link:
{rebookingUrl}

If you have any questions, please get in touch!

- Eddie, EAT Cycling
```

**Limitation:** Free-form messages only work within 24 hours of the last customer message. For outbound notifications, you must use an approved template.

---

## Testing the Setup

### 1. Test Database Migrations

After running the SQL migrations, verify:

```sql
-- Check that 'cancelled' status exists
SELECT unnest(enum_range(NULL::booking_status));

-- Should show: pending, ready, complete, cancelled

-- Check calendar_event_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'calendar_event_id';
```

### 2. Test WhatsApp Template

1. Create a test booking
2. Cancel it via the admin interface
3. Choose "Yes, Send WhatsApp" in the cancellation modal
4. Verify the customer receives the cancellation message
5. Check that the rebooking link works and pre-fills their details

### 3. Test Calendar Event Deletion

1. Create a booking (this creates a Google Calendar event)
2. Cancel the booking via admin
3. Verify the calendar event is deleted from Google Calendar

---

## Troubleshooting

### Template Not Approved

If you see errors about template not being approved:
- Check Meta Business Manager for template approval status
- Wait 24-48 hours for approval
- Use free-form messages as fallback (limited to 24-hour window)

### Calendar Event Not Deleted

If calendar events aren't being deleted:
- Check that `calendar_event_id` is being stored when bookings are created
- Verify Google Calendar API credentials are correct
- Check server logs for calendar deletion errors

### Cancelled Bookings Still Count Toward Capacity

This shouldn't happen, but if it does:
- Verify the migration `010_add_cancelled_status.sql` ran successfully
- Check that cancelled bookings have `status = 'cancelled'` in the database
- Capacity queries only count `'pending'` and `'ready'` statuses

---

## Additional Notes

- **Cancellation is only allowed from `pending` status** - bookings that are `ready` or `complete` cannot be cancelled
- **Restore functionality** - Cancelled bookings can be restored to `pending` status via the admin interface
- **Bulk cancellation** - Multiple bookings can be cancelled at once via the bulk actions toolbar
- **Search includes cancelled** - Cancelled bookings appear in search results even when the filter is off
