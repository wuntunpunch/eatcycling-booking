# Cancellation Flow Implementation Plan

## Overview

Implement Phase 1 (admin-only) cancellation flow for bookings. This allows admins to cancel bookings through the admin interface, with cancelled bookings excluded from daily capacity calculations and hidden by default in the bookings list. Includes restore functionality to reverse cancellations.

## Key Decisions Made

### Cancellation Rules
- **Allowed from**: Only `pending` status (not `ready` or `complete`)
- **Past dates**: Allow cancellation of past bookings (useful for data cleanup)
- **Reversibility**: Yes - add "Restore Booking" action that resets to `pending` and clears all tracking fields
- **Status color**: Red badge (`bg-red-100 text-red-800`) for cancelled bookings

### WhatsApp Notifications
- **Default behavior**: Show confirmation dialog asking each time ("Send cancellation notification via WhatsApp?")
- **Message content**: Include rebooking link (pre-filled with customer name/phone)
- **Template**: New env var `WHATSAPP_CANCELLATION_TEMPLATE_NAME`
- **Tone**: Friendly/casual
- **Scope**: Only mention the specific cancelled booking (not other customer bookings)
- **Error handling**: Allow partial success - booking cancelled even if WhatsApp fails (log error)

### UI/UX Decisions
- **Cancellation action**: In dropdown menu only (no separate button)
- **Confirmation dialog**: Show booking details (customer, date, service) + confirmation question
- **Visibility filter**: Simple checkbox "Show cancelled bookings" (hidden by default)
- **Search behavior**: Include cancelled bookings in search results even when filter is off
- **Display style**: Same style as active bookings, just different status badge color
- **Restore action**: In dropdown menu for cancelled bookings
- **Bulk cancellation**: Yes - select multiple → Cancel → single confirmation → cancel all

### Google Calendar Integration
- **Event deletion**: Add `calendar_event_id` field to bookings table (requires migration)
- **Strategy**: Store event ID going forward, backfill existing if needed
- **On cancellation**: Delete calendar event using stored event ID

### Analytics & Reporting
- **Reports**: Include cancelled bookings in all reports
- **Cancellation rate**: Calculate and display cancellation rate percentage in admin dashboard

### Technical Details
- **Restore logic**: Reset all tracking fields (`completed_at`, `reminder_sent_at`, etc.) when restoring
- **Capacity**: Cancelled bookings excluded from daily capacity (already handled by current queries)
- **Audit trail**: No special tracking (just `updated_at` timestamp)

## Database Changes

### Migration 1: `010_add_cancelled_status.sql`

Add `'cancelled'` value to the `booking_status` PostgreSQL enum:

```sql
-- Add 'cancelled' to booking_status enum
ALTER TYPE booking_status ADD VALUE 'cancelled';
```

**Note**: PostgreSQL enum values cannot be removed once added, so this is a permanent change.

### Migration 2: `011_add_calendar_event_id.sql`

Add `calendar_event_id` field to store Google Calendar event IDs for event deletion on cancellation:

```sql
-- Add calendar_event_id column to bookings table
ALTER TABLE bookings ADD COLUMN calendar_event_id VARCHAR(255);

-- Add index for efficient lookups
CREATE INDEX idx_bookings_calendar_event_id ON bookings(calendar_event_id);
```

**Note**: This field is nullable since existing bookings won't have event IDs. Future bookings will have this populated.

## TypeScript Type Updates

### File: `src/lib/types.ts`

1. **Update BookingStatus type**:
   ```typescript
   export type BookingStatus = 'pending' | 'ready' | 'complete' | 'cancelled';
   ```

2. **Update MessageLog message_type**:
   ```typescript
   message_type: 'reminder' | 'confirmation' | 'ready' | 'cancellation';
   ```

3. **Update Booking interface**:
   ```typescript
   export interface Booking {
     // ... existing fields
     calendar_event_id?: string | null;
   }
   ```

## API Endpoints

### File: `src/app/api/bookings/[id]/cancel/route.ts` (new)

Create new POST endpoint following the pattern of `/ready` and `/complete` routes:

**Request Body**:
```typescript
{
  skipWhatsApp?: boolean; // Optional, defaults to false
}
```

**Logic**:
1. Accept booking ID from route params
2. Parse request body for `skipWhatsApp` option (default: false)
3. Fetch booking with customer details
4. **Validation**: Only allow cancellation if status is `'pending'` (return 400 if not)
5. Update booking status to `'cancelled'`
6. Delete Google Calendar event if `calendar_event_id` exists
7. Show WhatsApp confirmation dialog (if not skipped) - handled by frontend
8. Send WhatsApp cancellation notification (unless skipped)
9. Log message to `message_logs` table if WhatsApp sent (with `message_type: 'cancellation'`)
10. Return success response

**Error Handling**:
- Allow partial success: booking cancelled even if WhatsApp fails
- Log WhatsApp errors but don't fail the cancellation
- Handle calendar deletion errors gracefully

### File: `src/app/api/bookings/[id]/restore/route.ts` (new)

Create new POST endpoint to restore cancelled bookings:

**Logic**:
1. Accept booking ID from route params
2. Fetch booking and verify status is `'cancelled'`
3. Update booking status to `'pending'`
4. Reset all tracking fields:
   - `completed_at` → `null`
   - `reminder_sent_at` → `null`
5. Return success response

**Note**: Calendar event is NOT recreated (customer would need to rebook)

## WhatsApp Integration

### File: `src/lib/whatsapp.ts`

Add new function `sendCancellationNotification`:

```typescript
export async function sendCancellationNotification({
  customerName,
  customerPhone,
  serviceType,
  date,
  referenceNumber,
}: {
  customerName: string;
  customerPhone: string;
  serviceType: ServiceType;
  date: string;
  referenceNumber?: string;
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const referenceText = referenceNumber ? `🔖 Ref: ${referenceNumber}` : '';
  
  // Generate rebooking link (pre-filled with customer name/phone)
  const rebookingUrl = `${process.env.BOOKING_FORM_URL || 'https://book.eatcycling.co.uk'}?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(customerPhone)}`;

  // Check if template is configured
  const templateName = process.env.WHATSAPP_CANCELLATION_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (templateName) {
    // Use template message (required for outbound messages)
    // Template should have placeholders: {{1}} name, {{2}} date, {{3}} service, {{4}} reference (optional), {{5}} rebooking link
    try {
      const templateParams = referenceNumber
        ? [customerName, formattedDate, SERVICE_LABELS[serviceType], referenceNumber, rebookingUrl]
        : [customerName, formattedDate, SERVICE_LABELS[serviceType], rebookingUrl];
      
      return await sendWhatsAppTemplateMessage(
        customerPhone,
        templateName,
        templateLanguage,
        templateParams
      );
    } catch (error) {
      // Fallback to free-form message
      console.warn('Template message failed, falling back to free-form message:', error);
      const message = `Hi ${customerName}! 👋

Your booking with EAT Cycling has been cancelled:

📅 ${formattedDate}
🔧 ${SERVICE_LABELS[serviceType]}
${referenceText ? `${referenceText}\n` : ''}
Need to rebook? Use this link:
${rebookingUrl}

If you have any questions, please get in touch!

- Eddie, EAT Cycling`;

      return sendWhatsAppMessage(customerPhone, message);
    }
  } else {
    // Free-form message (only works within 24-hour window)
    const message = `Hi ${customerName}! 👋

Your booking with EAT Cycling has been cancelled:

📅 ${formattedDate}
🔧 ${SERVICE_LABELS[serviceType]}
${referenceText ? `${referenceText}\n` : ''}
Need to rebook? Use this link:
${rebookingUrl}

If you have any questions, please get in touch!

- Eddie, EAT Cycling`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}
```

**Environment Variable Required**:
- `WHATSAPP_CANCELLATION_TEMPLATE_NAME` (optional - falls back to free-form if not set)

## Google Calendar Integration Updates

### File: `src/lib/google-calendar.ts`

Add function to delete calendar events:

```typescript
export async function deleteCalendarEvent(eventId: string) {
  const calendar = getCalendarClient();
  
  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}
```

### File: `src/app/api/bookings/route.ts`

Update booking creation to store calendar event ID:

```typescript
// After creating calendar event
const calendarEvent = await createCalendarEvent({...});
if (calendarEvent?.id) {
  // Update booking with calendar event ID
  await supabase
    .from('bookings')
    .update({ calendar_event_id: calendarEvent.id })
    .eq('id', booking.id);
}
```

## Admin UI Updates

### File: `src/app/admin/bookings/page.tsx`

1. **Add status color for cancelled**:
   ```typescript
   const statusColors: Record<string, string> = {
     pending: 'bg-yellow-100 text-yellow-800',
     ready: 'bg-green-100 text-green-800',
     complete: 'bg-gray-100 text-gray-800',
     cancelled: 'bg-red-100 text-red-800',
   };
   ```

2. **Add status order**:
   ```typescript
   const statusOrder: Record<string, number> = {
     pending: 0,
     ready: 1,
     complete: 2,
     cancelled: 3,
   };
   ```

3. **Add filter toggle for cancelled bookings**:
   - Add state: `const [showCancelled, setShowCancelled] = useState(false);`
   - Save preference to localStorage (like `showComplete`)
   - Add checkbox next to "Show complete bookings" checkbox
   - Filter `filteredOtherBookings` to exclude cancelled when `showCancelled` is false
   - **Search behavior**: Include cancelled bookings in search results even when filter is off

4. **Update ActionDropdown component**:
   - Add "Cancel Booking" option for bookings with status `'pending'` only
   - Add "Restore Booking" option for bookings with status `'cancelled'`
   - Don't show actions for cancelled bookings (except restore)
   - Show "Cancelled" text for cancelled bookings (like complete shows "Complete")

5. **Add cancel handler function**:
   ```typescript
   async function handleCancelBooking(bookingId: string) {
     // Show confirmation dialog with booking details
     // On confirm, show WhatsApp confirmation dialog
     // Call POST /api/bookings/${bookingId}/cancel with skipWhatsApp based on user choice
     // Show success/error toast
     // Refresh bookings list
   }
   ```

6. **Add restore handler function**:
   ```typescript
   async function handleRestoreBooking(bookingId: string) {
     setProcessingBookings((prev) => new Set(prev).add(bookingId));
     try {
       const response = await fetch(`/api/bookings/${bookingId}/restore`, {
         method: 'POST',
       });
       
       if (response.ok) {
         showToast('Booking restored to pending', 'success');
         await fetchBookings();
       } else {
         const error = await response.json();
         showToast(`Failed to restore: ${error.message}`, 'error');
       }
     } catch (error) {
       showToast('Failed to restore booking', 'error');
     } finally {
       setProcessingBookings((prev) => {
         const next = new Set(prev);
         next.delete(bookingId);
         return next;
       });
     }
   }
   ```

7. **Add confirmation modal for cancellation**:
   - Show booking details (customer name, date, service, reference)
   - Ask: "Are you sure you want to cancel this booking?"
   - Show WhatsApp confirmation: "Send cancellation notification via WhatsApp?"
   - Options: "Cancel & Send WhatsApp", "Cancel (No WhatsApp)", "Cancel"

8. **Add bulk cancellation support**:
   - Add "Cancel Selected" button in bulk actions toolbar
   - Only show for selected bookings that are `pending`
   - Show single confirmation dialog listing all bookings to cancel
   - Ask about WhatsApp: "Send WhatsApp notifications to all customers?"
   - Process all cancellations in sequence

## Capacity Calculation Updates

### Files to verify (likely already correct):

1. **`src/app/api/availability/route.ts`**:
   - Current query: `.in('status', ['pending', 'ready'])`
   - This already excludes cancelled (no change needed, but verify)

2. **`src/app/api/admin/service-limits/route.ts`**:
   - Current query: `.in('status', ['pending', 'ready'])`
   - This already excludes cancelled (no change needed, but verify)

**Note**: Since cancelled bookings should not count toward capacity, and the current queries only include `'pending'` and `'ready'`, cancelled bookings are already excluded. Verify this is working correctly.

## Analytics & Reporting

### File: `src/app/admin/page.tsx` (or create new analytics component)

Add cancellation rate calculation:

```typescript
const cancellationRate = useMemo(() => {
  const totalBookings = bookings.length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  if (totalBookings === 0) return 0;
  return ((cancelledBookings / totalBookings) * 100).toFixed(1);
}, [bookings]);
```

Display in admin dashboard:
- Show cancellation count
- Show cancellation rate percentage
- Include cancelled bookings in all reports/analytics

## Files Summary

**New files**:
- `supabase/migrations/010_add_cancelled_status.sql`
- `supabase/migrations/011_add_calendar_event_id.sql`
- `src/app/api/bookings/[id]/cancel/route.ts`
- `src/app/api/bookings/[id]/restore/route.ts`

**Modified files**:
- `src/lib/types.ts` - Add 'cancelled' to BookingStatus, add 'cancellation' to MessageLog message_type, add calendar_event_id to Booking
- `src/lib/whatsapp.ts` - Add sendCancellationNotification function
- `src/lib/google-calendar.ts` - Add deleteCalendarEvent function
- `src/app/api/bookings/route.ts` - Store calendar_event_id when creating events
- `src/app/admin/bookings/page.tsx` - Add cancel/restore actions, filter toggle, status colors, bulk cancellation
- `src/app/api/availability/route.ts` - Verify cancelled excluded from counts (likely already handled)
- `src/app/api/admin/service-limits/route.ts` - Verify cancelled excluded from counts (likely already handled)
- `src/app/admin/page.tsx` - Add cancellation rate analytics (if dashboard exists)

## Testing Considerations

- Test cancelling a pending booking
- Test cancelling with WhatsApp notification
- Test cancelling without WhatsApp notification
- Test cancelling past bookings
- Test that ready/complete bookings cannot be cancelled (should return 400)
- Test restore functionality (cancelled → pending)
- Test that restored bookings have tracking fields reset
- Verify cancelled bookings don't appear in capacity calculations
- Verify cancelled bookings are hidden by default
- Verify cancelled bookings appear when filter is enabled
- Verify cancelled bookings appear in search results even when hidden
- Verify status color displays correctly (red)
- Verify cancelled bookings show "Restore" action in dropdown
- Test bulk cancellation with multiple bookings
- Test bulk cancellation with WhatsApp option
- Test Google Calendar event deletion on cancellation
- Test calendar event ID storage on new bookings
- Verify cancellation rate calculation in dashboard
- Test error handling (WhatsApp fails, calendar deletion fails)
- Test that cancelled bookings are included in reports

## Edge Cases

1. **WhatsApp fails**: Booking still cancelled, error logged
2. **Calendar deletion fails**: Booking still cancelled, error logged
3. **Multiple bookings same customer**: Only mention specific cancelled booking in WhatsApp
4. **Search with cancelled filter off**: Cancelled bookings still appear in search results
5. **Bulk cancel mixed statuses**: Only allow if all selected are pending
6. **Restore without calendar event**: Booking restored, but no calendar event recreated
7. **Cancellation rate calculation**: Handle division by zero (no bookings)

## Environment Variables

**New required** (optional):
- `WHATSAPP_CANCELLATION_TEMPLATE_NAME` - WhatsApp template name for cancellation messages (optional, falls back to free-form)

**Existing**:
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone number ID
- `WHATSAPP_API_TOKEN` - WhatsApp API access token
- `WHATSAPP_TEMPLATE_LANGUAGE` - Template language code (defaults to 'en')
- `GOOGLE_CALENDAR_ID` - Google Calendar ID for event deletion
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Base64 encoded service account key

## Future Considerations (Phase 2)

- Self-service cancellation via secure link in WhatsApp confirmation
- Cancellation reason tracking (optional field)
- Cancellation analytics (by reason, by date range, etc.)
- Automated cancellation for no-shows after X days
- Cancellation email notifications (in addition to WhatsApp)
