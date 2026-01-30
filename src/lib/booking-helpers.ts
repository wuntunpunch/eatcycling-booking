import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Generates the next sequential reference number for a given year
 * Format: EAT-YYYY-NNNN (e.g., EAT-2026-0142)
 * Sequence resets to 0001 at the start of each year
 * 
 * @param supabase - Supabase client instance
 * @param year - Year for which to generate the reference
 * @returns Reference number string or null if generation fails
 */
export async function generateReferenceNumber(
  supabase: SupabaseClient,
  year: number
): Promise<string | null> {
  try {
    const yearPrefix = `EAT-${year}-`;
    
    // Get the highest reference number for this year
    const { data, error } = await supabase
      .from('bookings')
      .select('reference_number')
      .like('reference_number', `${yearPrefix}%`)
      .order('reference_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" which is fine for first booking of year
      console.error('Error querying reference numbers:', error);
      return null;
    }

    let nextSequence = 1;
    if (data?.reference_number) {
      // Extract sequence number from format EAT-YYYY-NNNN
      const match = data.reference_number.match(/EAT-\d{4}-(\d+)/);
      if (match) {
        const currentSequence = parseInt(match[1], 10);
        nextSequence = currentSequence + 1;
      }
    }

    // Safety check: reset to 0001 if we've exceeded max for the year
    if (nextSequence > 9999) {
      console.warn(`Sequence number exceeded 9999 for year ${year}, resetting to 1`);
      nextSequence = 1;
    }

    const referenceNumber = `${yearPrefix}${String(nextSequence).padStart(4, '0')}`;
    
    // Validate format before returning
    if (!isValidReferenceNumber(referenceNumber)) {
      console.error('Generated invalid reference number:', referenceNumber);
      return null;
    }

    return referenceNumber;
  } catch (error) {
    console.error('Error generating reference number:', error);
    return null; // Optional - booking continues without reference
  }
}

/**
 * Validates reference number format
 * Expected format: EAT-YYYY-NNNN (e.g., EAT-2026-0142)
 * 
 * @param ref - Reference number to validate
 * @returns true if valid, false otherwise
 */
export function isValidReferenceNumber(ref: string): boolean {
  const pattern = /^EAT-\d{4}-\d{4}$/;
  return pattern.test(ref);
}
