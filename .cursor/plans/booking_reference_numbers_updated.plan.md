# Implementation Plan: Booking Reference Numbers (Updated)

## Overview
Add human-readable reference numbers to bookings in the format `EAT-2026-0142` (prefix + year + 4-digit sequential number). Sequence resets to 0001 at the start of each year. This helps customers quote their reference when dropping off bikes and helps Eddie match bikes to bookings.

## Key Decisions Made

### Format & Sequence
- **Format**: `EAT-2026-0142` (prefix-year-4digits)
- **Sequence**: Resets to 0001 at the start of each year
- **Max capacity**: 9,999 bookings per year before format change needed
- **Backfill**: Group by year, assign sequentially by creation date within each year

### Error Handling
- **Reference generation**: Optional - booking succeeds even if generation fails
- **On failure**: Log error, continue booking without reference
- **Validation**: Both frontend and backend validation

### UI/UX Decisions
- **Confirmation display**: Moderate prominence, special mobile styling
- **Copy functionality**: Yes - add copy button next to reference
- **Mobile display**: Special mobile styling (larger, more prominent)
- **Persistence**: One-time display only (no URL/localStorage)

### Admin Interface
- **Table position**: Reference column after Date column
- **Sorting**: Reference column is sortable
- **Search**: Top of page, searches all bookings
- **Search scope**: Multi-field (reference + customer name + phone)
- **Search behavior**: Real-time filtering as you type

### WhatsApp Integration
- **Format**: With emoji highlight (🔖 Ref: EAT-2026-0142)
- **Template**: Update Meta Business template to include reference placeholder
- **Fallback**: Also include in fallback message

## Database Migration

Create `supabase/migrations/009_add_booking_reference.sql`:
```sql
-- Add reference_number column (nullable initially for backfill)
ALTER TABLE bookings ADD COLUMN reference_number VARCHAR(20) UNIQUE;

-- Backfill existing bookings grouped by year
UPDATE bookings 
SET reference_number = 'EAT-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM created_at) ORDER BY created_at)::text, 4, '0')
WHERE reference_number IS NULL;

-- Add index for efficient searching
CREATE INDEX idx_bookings_reference_number ON bookings(reference_number);

-- Note: Keep nullable for now since reference generation is optional
-- Future: Consider making NOT NULL after ensuring generation is reliable
```

## Reference Generation Logic

Create `src/lib/booking-helpers.ts` (new file):
- `generateReferenceNumber(supabase, year)`: Generates next sequential reference for a given year
- Queries existing bookings for the current year to find the highest sequence number
- Returns format: `EAT-{YEAR}-{SEQUENCE}` where sequence is zero-padded to 4 digits
- Handles errors gracefully (returns null if generation fails)
- Uses database query filtered by year: `SELECT MAX(CAST(SUBSTRING(reference_number FROM 'EAT-\d+-(\d+)') AS INTEGER)) FROM bookings WHERE reference_number LIKE 'EAT-{year}-%'`

## API Changes

**`src/app/api/bookings/route.ts`**:
- Before creating booking, extract year from booking date and call `generateReferenceNumber(supabase, year)` to get the reference
- Include `reference_number` in the booking insert (nullable)
- Return reference number in the API response
- If generation fails, log error but continue with booking creation

## TypeScript Types

**`src/lib/types.ts`**:
- Add `reference_number: string | null` to `Booking` interface
- Add validation helper: `isValidReferenceNumber(ref: string): boolean`

## Booking Form Display

**`src/components/booking-form.tsx`**:
- Update success state to display the reference number with moderate prominence
- Store reference from API response in component state
- Display format: "Your booking reference: **EAT-2026-0142**"
- Add copy button next to reference (with success feedback)
- Special mobile styling: larger text, more padding on mobile devices
- Style with Tailwind to match existing confirmation UI
- One-time display: if user refreshes, reference is lost (by design)

## WhatsApp Integration

**`src/lib/whatsapp.ts`**:
- Update `sendBookingConfirmation()` function signature to accept optional `referenceNumber` parameter
- Include reference in template message (requires Meta template update)
- Include reference in fallback message: "🔖 Ref: EAT-2026-0142"
- Update call site in `src/app/api/bookings/route.ts` to pass reference number

**Meta Business Template Update Required**:
- Add placeholder for reference number (e.g., {{4}} for reference)
- Template format: "Hi {{1}}! 🚴\n\nYour booking with EAT Cycling has been confirmed:\n\n📅 {{2}}\n🔧 {{3}}\n🔖 Ref: {{4}}\n\n..."

## Admin Interface

**`src/app/admin/bookings/page.tsx`**:
- Add "Reference" column after Date column in bookings table
- Display reference number with monospace font for readability
- Make reference column sortable
- Add search input field at top of page (above both tables)
- Real-time filtering: filter bookings as user types
- Search scope: reference number (case-insensitive), customer name, customer phone
- Show "No results" message when search yields no matches
- Update table column widths to accommodate new column
- Apply search filter to both "Today's Bookings" and "All Bookings" sections

## Validation

**Frontend validation** (`src/components/booking-form.tsx`):
- Validate reference format: `/^EAT-\d{4}-\d{4}$/` (EAT-year-4digits)
- Show validation error if format is invalid (though this shouldn't happen)

**Backend validation** (`src/lib/booking-helpers.ts`):
- Validate format before inserting
- Ensure uniqueness (handled by database constraint)
- Return null if validation fails

## Implementation Details

### Reference Number Generation Strategy
```typescript
async function generateReferenceNumber(supabase: SupabaseClient, year: number): Promise<string | null> {
  try {
    // Get max sequence number for this year
    const yearPrefix = `EAT-${year}-`;
    const { data } = await supabase
      .from('bookings')
      .select('reference_number')
      .like('reference_number', `${yearPrefix}%`)
      .order('reference_number', { ascending: false })
      .limit(1)
      .single();
    
    let nextSequence = 1;
    if (data?.reference_number) {
      // Extract sequence number from format EAT-YYYY-NNNN
      const match = data.reference_number.match(/EAT-\d{4}-(\d+)/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }
    
    // Reset to 0001 if we've exceeded max for the year (shouldn't happen, but safety check)
    if (nextSequence > 9999) {
      console.warn(`Sequence number exceeded 9999 for year ${year}, resetting to 1`);
      nextSequence = 1;
    }
    
    return `${yearPrefix}${String(nextSequence).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating reference number:', error);
    return null; // Optional - booking continues without reference
  }
}
```

### Search Implementation
```typescript
const [searchQuery, setSearchQuery] = useState('');

const filteredBookings = useMemo(() => {
  if (!searchQuery.trim()) return bookings;
  
  const query = searchQuery.toLowerCase();
  return bookings.filter(booking => 
    booking.reference_number?.toLowerCase().includes(query) ||
    booking.customer.name.toLowerCase().includes(query) ||
    booking.customer.phone.includes(query)
  );
}, [bookings, searchQuery]);
```

### Copy to Clipboard
```typescript
const handleCopyReference = async (reference: string) => {
  try {
    await navigator.clipboard.writeText(reference);
    showToast('Reference copied to clipboard', 'success');
  } catch (error) {
    console.error('Failed to copy:', error);
    showToast('Failed to copy reference', 'error');
  }
};
```

## Files to Modify

1. `supabase/migrations/009_add_booking_reference.sql` (new)
2. `src/lib/booking-helpers.ts` (new)
3. `src/app/api/bookings/route.ts`
4. `src/lib/types.ts`
5. `src/components/booking-form.tsx`
6. `src/lib/whatsapp.ts`
7. `src/app/admin/bookings/page.tsx`

## Testing Considerations

- Test reference generation for new bookings
- Test yearly reset (first booking of new year should be EAT-YYYY-0001)
- Test sequence within same year (should increment)
- Test backfill migration on existing data
- Test search functionality (reference, name, phone)
- Test real-time search filtering
- Test copy to clipboard functionality
- Verify WhatsApp messages include reference number (both template and fallback)
- Verify reference appears in booking confirmation screen
- Test mobile styling for reference display
- Test error handling when reference generation fails
- Test validation (frontend and backend)
- Test sorting by reference column in admin

## Edge Cases

1. **Reference generation fails**: Booking succeeds, reference is null
2. **Duplicate reference**: Database unique constraint prevents this
3. **9,999+ bookings per year**: Consider format change or 5-digit sequence for that year
4. **Year rollover**: First booking of new year automatically gets sequence 0001
5. **Search with no results**: Show helpful "No bookings found" message
6. **Mobile display**: Ensure reference is readable and copy button is tappable

## Future Considerations

- Consider making reference_number NOT NULL after ensuring reliability
- Monitor reference generation failures in production
- Consider adding reference lookup by phone/name for customers who lost their reference
- If Meta template update is delayed, fallback message will include reference
