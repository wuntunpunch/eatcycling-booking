'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SERVICE_LABELS, BookingWithCustomer } from '@/lib/types';
import { AdminHeader } from '@/components/admin-header';
import { CacheSync } from '@/components/cache-sync';
import { FallbackBanner } from '@/components/fallback-banner';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { useToast } from '@/components/toast';
import { fetchWithRetry } from '@/lib/api-client';

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<BookingWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [processingBookings, setProcessingBookings] = useState<Set<string>>(new Set());
  const [showComplete, setShowComplete] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [modalBooking, setModalBooking] = useState<BookingWithCustomer | null>(null);
  const [cancelModalBooking, setCancelModalBooking] = useState<BookingWithCustomer | null>(null);
  const [cancelWhatsAppChoice, setCancelWhatsAppChoice] = useState<boolean | null>(null);
  const [bulkCancelBookings, setBulkCancelBookings] = useState<BookingWithCustomer[]>([]);
  const [bulkCancelWhatsAppChoice, setBulkCancelWhatsAppChoice] = useState<boolean | null>(null);
  const [bulkReminderBookings, setBulkReminderBookings] = useState<BookingWithCustomer[]>([]);
  const [displayCount, setDisplayCount] = useState(5);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<'date' | 'reference' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [editingBikeDetailsBooking, setEditingBikeDetailsBooking] = useState<BookingWithCustomer | null>(null);
  const [bikeDetailsText, setBikeDetailsText] = useState('');
  const [savingBikeDetails, setSavingBikeDetails] = useState(false);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dropdownMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { showToast, ToastComponent } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const dropdown = dropdownRefs.current[openDropdown];
        const dropdownMenu = dropdownMenuRefs.current[openDropdown];
        const target = event.target as Node;
        
        // Check if click is outside both the button container and the dropdown menu
        const isOutsideButton = dropdown && !dropdown.contains(target);
        const isOutsideMenu = dropdownMenu && !dropdownMenu.contains(target);
        
        if (isOutsideButton && isOutsideMenu) {
          setOpenDropdown(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Load filter preferences from localStorage
  useEffect(() => {
    try {
      const savedComplete = localStorage.getItem('bookings_show_complete');
      if (savedComplete !== null) {
        setShowComplete(JSON.parse(savedComplete));
      }
      const savedCancelled = localStorage.getItem('bookings_show_cancelled');
      if (savedCancelled !== null) {
        setShowCancelled(JSON.parse(savedCancelled));
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }
  }, []);

  // Save filter preferences to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bookings_show_complete', JSON.stringify(showComplete));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [showComplete]);

  useEffect(() => {
    try {
      localStorage.setItem('bookings_show_cancelled', JSON.stringify(showCancelled));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [showCancelled]);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const response = await fetchWithRetry('/api/admin/bookings', { cache: 'no-store' }, 1);
      
      if (response.status === 401) {
        showToast('Session expired, please log in again', 'error');
        router.push('/admin/login');
        return;
      }

      if (!response.ok) {
        const error = await response.json();
        console.error('Error fetching bookings:', error);
        showToast('Failed to fetch bookings', 'error');
        return;
      }

      const { bookings } = await response.json();
      setBookings((bookings || []) as unknown as BookingWithCustomer[]);
      // Clear selections when bookings refresh
      setSelectedBookings(new Set());
    } catch (error) {
      console.error('Error fetching bookings:', error);
      showToast('Failed to fetch bookings', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveBikeDetails() {
    if (!editingBikeDetailsBooking) return;

    setSavingBikeDetails(true);
    try {
      const response = await fetchWithRetry(
        `/api/bookings/${editingBikeDetailsBooking.id}/bike-details`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bike_details: bikeDetailsText }),
        },
        1
      );

      if (!response.ok) {
        const error = await response.json();
        showToast('Failed to save bike details', 'error');
        return;
      }

      showToast('Bike details saved successfully', 'success');
      setEditingBikeDetailsBooking(null);
      setBikeDetailsText('');
      fetchBookings(); // Refresh bookings
    } catch (error) {
      console.error('Error saving bike details:', error);
      showToast('Failed to save bike details', 'error');
    } finally {
      setSavingBikeDetails(false);
    }
  }

  async function handleMarkReady(bookingId: string, skipWhatsApp = false) {
    setProcessingBookings((prev) => new Set(prev).add(bookingId));
    try {
      const response = await fetch(`/api/bookings/${bookingId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipWhatsApp }),
      });

      if (response.ok) {
        const data = await response.json();
        // Immediately update state from API response to avoid refetch returning stale data
        if (data.booking) {
          setBookings((prev) =>
            prev.map((b) => (b.id === bookingId ? { ...b, ...data.booking } : b))
          );
        }
        showToast(
          skipWhatsApp
            ? 'Booking marked as ready (no WhatsApp sent)'
            : 'Booking marked as ready. Customer notified via WhatsApp.',
          'success'
        );
        await fetchBookings();
      } else {
        const error = await response.json();
        showToast(`Failed to mark ready: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error marking ready:', error);
      showToast('Failed to mark ready', 'error');
    } finally {
      setProcessingBookings((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  async function handleSkipToComplete(bookingId: string) {
    setProcessingBookings((prev) => new Set(prev).add(bookingId));
    try {
      const response = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipStage: true }),
      });

      if (response.ok) {
        showToast('Booking marked as complete (skipped ready stage)', 'success');
        await fetchBookings();
      } else {
        const error = await response.json();
        showToast(`Failed to mark complete: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      showToast('Failed to mark complete', 'error');
    } finally {
      setProcessingBookings((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  function handleCancelBooking(booking: BookingWithCustomer) {
    setCancelModalBooking(booking);
    setCancelWhatsAppChoice(null);
  }

  function handleCloseCancelModal() {
    if (!processingBookings.has(cancelModalBooking?.id || '')) {
      setCancelModalBooking(null);
      setCancelWhatsAppChoice(null);
    }
  }

  async function handleConfirmCancel() {
    if (!cancelModalBooking) return;

    const bookingId = cancelModalBooking.id;
    setProcessingBookings((prev) => new Set(prev).add(bookingId));
    
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipWhatsApp: cancelWhatsAppChoice === false }),
      });

      if (response.ok) {
        showToast(
          cancelWhatsAppChoice === false
            ? 'Booking cancelled (no WhatsApp sent)'
            : 'Booking cancelled. Customer notified via WhatsApp.',
          'success'
        );
        setCancelModalBooking(null);
        setCancelWhatsAppChoice(null);
        await fetchBookings();
      } else {
        const error = await response.json();
        showToast(`Failed to cancel booking: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      showToast('Failed to cancel booking', 'error');
    } finally {
      setProcessingBookings((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

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
      console.error('Error restoring booking:', error);
      showToast('Failed to restore booking', 'error');
    } finally {
      setProcessingBookings((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  function isEligibleForCollectionReminder(booking: BookingWithCustomer): boolean {
    if (booking.status !== 'ready') return false;
    if (!booking.ready_at) return false;
    
    const readyDate = new Date(booking.ready_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return diffDays >= 3;
  }

  function getDaysWaiting(booking: BookingWithCustomer): number | null {
    if (!booking.ready_at) return null;
    const readyDate = new Date(booking.ready_at);
    const now = new Date();
    return Math.floor((now.getTime() - readyDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  async function handleSendCollectionReminder(bookingId: string) {
    setProcessingBookings((prev) => new Set(prev).add(bookingId));
    try {
      const response = await fetch(`/api/bookings/${bookingId}/remind-collection`, {
        method: 'POST',
      });

      if (response.ok) {
        showToast('Collection reminder sent successfully', 'success');
        await fetchBookings();
      } else {
        const error = await response.json();
        showToast(`Failed to send reminder: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error sending collection reminder:', error);
      showToast('Failed to send collection reminder', 'error');
    } finally {
      setProcessingBookings((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  function handleBulkReminder(bookingsToRemind: BookingWithCustomer[]) {
    // Only allow reminders for eligible bookings
    const eligibleBookings = bookingsToRemind.filter(b => isEligibleForCollectionReminder(b));
    if (eligibleBookings.length === 0) {
      showToast('No eligible bookings selected for collection reminders', 'error');
      return;
    }
    setBulkReminderBookings(eligibleBookings);
  }

  function handleCloseBulkReminderModal() {
    if (processingBookings.size === 0) {
      setBulkReminderBookings([]);
    }
  }

  async function handleConfirmBulkReminder() {
    if (bulkReminderBookings.length === 0) return;

    const bookingIds = bulkReminderBookings.map(b => b.id);
    setProcessingBookings(new Set(bookingIds));

    try {
      let succeeded = 0;
      let failed = 0;

      for (const booking of bulkReminderBookings) {
        try {
          const response = await fetch(`/api/bookings/${booking.id}/remind-collection`, {
            method: 'POST',
          });

          if (response.ok) {
            succeeded++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      if (succeeded > 0) {
        showToast(
          `${succeeded} reminder${succeeded > 1 ? 's' : ''} sent successfully`,
          'success'
        );
      }
      if (failed > 0) {
        showToast(`${failed} reminder${failed > 1 ? 's' : ''} failed to send`, 'error');
      }

      setBulkReminderBookings([]);
      await fetchBookings();
    } catch (error) {
      console.error('Error in bulk reminder:', error);
      showToast('Failed to send reminders', 'error');
    } finally {
      setProcessingBookings(new Set());
    }
  }

  function handleBulkCancel(bookingsToCancel: BookingWithCustomer[]) {
    // Only allow cancelling pending bookings
    const pendingBookings = bookingsToCancel.filter(b => b.status === 'pending');
    if (pendingBookings.length === 0) {
      showToast('Only pending bookings can be cancelled', 'error');
      return;
    }
    setBulkCancelBookings(pendingBookings);
    setBulkCancelWhatsAppChoice(null);
  }

  function handleCloseBulkCancelModal() {
    if (processingBookings.size === 0) {
      setBulkCancelBookings([]);
      setBulkCancelWhatsAppChoice(null);
    }
  }

  async function handleConfirmBulkCancel() {
    if (bulkCancelBookings.length === 0 || bulkCancelWhatsAppChoice === null) return;

    const bookingIds = bulkCancelBookings.map(b => b.id);
    setProcessingBookings(new Set(bookingIds));

    try {
      let succeeded = 0;
      let failed = 0;

      for (const booking of bulkCancelBookings) {
        try {
          const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skipWhatsApp: bulkCancelWhatsAppChoice === false }),
          });

          if (response.ok) {
            succeeded++;
          } else {
            failed++;
          }
        } catch (error) {
          failed++;
        }
      }

      if (succeeded > 0) {
        showToast(
          `${succeeded} booking${succeeded > 1 ? 's' : ''} cancelled${bulkCancelWhatsAppChoice === false ? ' (no WhatsApp sent)' : ''}`,
          'success'
        );
      }
      if (failed > 0) {
        showToast(`${failed} booking${failed > 1 ? 's' : ''} failed to cancel`, 'error');
      }

      setBulkCancelBookings([]);
      setBulkCancelWhatsAppChoice(null);
      await fetchBookings();
    } catch (error) {
      console.error('Error in bulk cancellation:', error);
      showToast('Failed to cancel bookings', 'error');
    } finally {
      setProcessingBookings(new Set());
    }
  }

  function handleReadyForCollection(booking: BookingWithCustomer) {
    setModalBooking(booking);
  }

  function handleCloseModal() {
    if (!processingBookings.has(modalBooking?.id || '')) {
      setModalBooking(null);
    }
  }

  async function handleConfirmComplete() {
    if (!modalBooking) return;

    const bookingId = modalBooking.id;
    setProcessingBookings((prev) => new Set(prev).add(bookingId));
    try {
      const response = await fetch(`/api/bookings/${bookingId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipStage: false }),
      });

      if (response.ok) {
        showToast('Booking marked as complete', 'success');
        setModalBooking(null);
        await fetchBookings();
      } else {
        const error = await response.json();
        showToast(`Failed to mark complete: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error marking complete:', error);
      showToast('Failed to mark complete', 'error');
    } finally {
      setProcessingBookings((prev) => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  }

  async function handleBulkAction(
    action: 'markReady' | 'markComplete' | 'skipToComplete',
    skipWhatsApp = false,
    bookingIds?: string[]
  ) {
    const idsToProcess = bookingIds || Array.from(selectedBookings);
    if (idsToProcess.length === 0) return;

    setProcessingBookings(new Set(idsToProcess));

    try {
      const response = await fetch('/api/bookings/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingIds: idsToProcess,
          action,
          skipWhatsApp,
          skipStage: action === 'skipToComplete',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const { succeeded, failed } = result.results;
        
        if (succeeded > 0) {
          showToast(
            `${succeeded} booking${succeeded > 1 ? 's' : ''} updated successfully`,
            'success'
          );
        }
        if (failed > 0) {
          showToast(`${failed} booking${failed > 1 ? 's' : ''} failed to update`, 'error');
        }
        
        await fetchBookings();
      } else {
        const error = await response.json();
        showToast(`Bulk action failed: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showToast('Failed to perform bulk action', 'error');
    } finally {
      setProcessingBookings(new Set());
    }
  }

  function toggleSelection(bookingId: string) {
    setSelectedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  }

  function toggleSelectAll(bookingsToShow: BookingWithCustomer[]) {
    const allSelected = bookingsToShow.every((b) => selectedBookings.has(b.id));
    if (allSelected) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(bookingsToShow.map((b) => b.id)));
    }
  }

  // Status colors
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    complete: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const statusOrder: Record<string, number> = {
    pending: 0,
    ready: 1,
    complete: 2,
    cancelled: 3,
  };

  function isToday(bookingDate: string): boolean {
    const today = new Date();
    const booking = new Date(bookingDate);
    return booking.toDateString() === today.toDateString();
  }

  function sortBookingsByStatus(bookings: BookingWithCustomer[]): BookingWithCustomer[] {
    return [...bookings].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  function sortBookingsByDate(bookings: BookingWithCustomer[]): BookingWithCustomer[] {
    return [...bookings].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  // Filter bookings by search query
  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;

    const query = searchQuery.toLowerCase();
    return bookings.filter((booking) => {
      const matchesReference = booking.reference_number?.toLowerCase().includes(query);
      const matchesName = booking.customer.name.toLowerCase().includes(query);
      const matchesPhone = booking.customer.phone.includes(query);
      return matchesReference || matchesName || matchesPhone;
    });
  }, [bookings, searchQuery]);

  const { todayBookings, otherBookings } = useMemo(() => {
    const today: BookingWithCustomer[] = [];
    const others: BookingWithCustomer[] = [];

    filteredBookings.forEach((booking) => {
      if (isToday(booking.date)) {
        today.push(booking);
      } else {
        others.push(booking);
      }
    });

    // Apply sorting if specified
    let sortedToday = sortBookingsByStatus(today);
    let sortedOthers = sortBookingsByDate(others);

    if (sortColumn === 'reference') {
      const sortFn = (a: BookingWithCustomer, b: BookingWithCustomer) => {
        const aRef = a.reference_number || '';
        const bRef = b.reference_number || '';
        const comparison = aRef.localeCompare(bRef);
        return sortDirection === 'asc' ? comparison : -comparison;
      };
      sortedToday = [...sortedToday].sort(sortFn);
      sortedOthers = [...sortedOthers].sort(sortFn);
    }

    return {
      todayBookings: sortedToday,
      otherBookings: sortedOthers,
    };
  }, [filteredBookings, sortColumn, sortDirection]);

  const filteredOtherBookings = useMemo(() => {
    let filtered = otherBookings;
    
    // Filter out complete if not showing complete
    if (!showComplete) {
      filtered = filtered.filter((b) => b.status !== 'complete');
    }
    
    // Filter out cancelled if not showing cancelled
    // Note: Cancelled bookings still appear in search results
    if (!showCancelled) {
      filtered = filtered.filter((b) => b.status !== 'cancelled');
    }
    
    return filtered;
  }, [otherBookings, showComplete, showCancelled]);

  useEffect(() => {
    setDisplayCount(5);
  }, [showComplete, showCancelled]);

  const paginatedOtherBookings = useMemo(() => {
    return filteredOtherBookings.slice(0, displayCount);
  }, [filteredOtherBookings, displayCount]);

  const hasMoreBookings = filteredOtherBookings.length > displayCount;

  function handleLoadMore() {
    setDisplayCount((prev) => prev + 5);
  }

  function handleSortReference() {
    if (sortColumn === 'reference') {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn('reference');
      setSortDirection('asc');
    }
  }


  // Action Dropdown Component
  function ActionDropdown({ booking }: { booking: BookingWithCustomer }) {
    const isOpen = openDropdown === booking.id;
    const isProcessing = processingBookings.has(booking.id);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; positionAbove: boolean } | null>(null);
    const buttonRef = useRef<HTMLDivElement | null>(null);

    // Calculate dropdown position when it opens
    useEffect(() => {
      if (isOpen && buttonRef.current) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          if (!buttonRef.current) return;
          
          const rect = buttonRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - rect.bottom;
          const spaceAbove = rect.top;
          const dropdownHeight = 150; // Approximate dropdown height
          const dropdownWidth = 224; // w-56 = 14rem = 224px
          
          // Find the table container and card container
          const tableContainer = buttonRef.current.closest('.overflow-x-auto');
          const cardContainer = buttonRef.current.closest('.rounded-lg.bg-white');
          
          let containerRect: DOMRect | null = null;
          
          // Prefer card container bounds, then table container, then viewport
          if (cardContainer) {
            containerRect = cardContainer.getBoundingClientRect();
          } else if (tableContainer) {
            containerRect = tableContainer.getBoundingClientRect();
          }
          
          // Calculate space relative to container if available, otherwise use viewport
          const availableSpaceBelow = containerRect 
            ? containerRect.bottom - rect.bottom - 20 // 20px padding
            : spaceBelow;
          const availableSpaceAbove = containerRect
            ? rect.top - containerRect.top - 20 // 20px padding
            : spaceAbove;
          
          // Position above if not enough space below (with buffer) and more space above
          const positionAbove = availableSpaceBelow < dropdownHeight && availableSpaceAbove > availableSpaceBelow;
          
          // Calculate position - align right edge of dropdown with right edge of button
          const left = rect.right - dropdownWidth;
          const top = positionAbove 
            ? rect.top - dropdownHeight - 4 // 4px gap above
            : rect.bottom + 4; // 4px gap below
          
          setDropdownPosition({ top, left, positionAbove });
        });
      } else {
        setDropdownPosition(null);
        // Clean up dropdown menu ref when closing
        if (dropdownMenuRefs.current[booking.id]) {
          dropdownMenuRefs.current[booking.id] = null;
        }
      }
    }, [isOpen, booking.id]);

    if (booking.status === 'complete') {
      return <span className="text-gray-400">Complete</span>;
    }

    if (booking.status === 'cancelled') {
      return (
        <div className="relative flex items-center gap-1">
          <span className="text-gray-400">Cancelled</span>
          <button
            onClick={() => setOpenDropdown(isOpen ? null : booking.id)}
            disabled={isProcessing}
            className="text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
            aria-label="More options"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? (dropdownPosition?.positionAbove ? 'rotate-0' : 'rotate-180') : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isOpen && dropdownPosition && typeof window !== 'undefined' && createPortal(
            <div 
              ref={(el) => {
                dropdownMenuRefs.current[booking.id] = el;
              }}
              className="fixed w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
              }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    handleRestoreBooking(booking.id);
                    setOpenDropdown(null);
                  }}
                  disabled={isProcessing}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Restore Booking
                </button>
              </div>
            </div>,
            document.body
          )}
        </div>
      );
    }

    const getPrimaryAction = () => {
      if (booking.status === 'pending') {
        return {
          label: isProcessing ? 'Sending...' : 'Mark Ready',
          onClick: () => handleMarkReady(booking.id, false),
          color: 'text-green-600 hover:text-green-800',
        };
      }
      if (booking.status === 'ready') {
        return {
          label: isProcessing ? 'Marking complete...' : 'Ready for Collection',
          onClick: () => handleReadyForCollection(booking),
          color: 'text-blue-600 hover:text-blue-800',
        };
      }
      return null;
    };

    const primaryAction = getPrimaryAction();

    return (
      <div 
        className="relative flex items-center gap-1" 
        ref={(el) => {
          dropdownRefs.current[booking.id] = el;
          buttonRef.current = el;
        }}
      >
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            disabled={isProcessing}
            className={`${primaryAction.color} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {primaryAction.label}
          </button>
        )}
        <button
          onClick={() => setOpenDropdown(isOpen ? null : booking.id)}
          disabled={isProcessing}
          className="text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed p-1"
          aria-label="More options"
        >
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? (dropdownPosition?.positionAbove ? 'rotate-0' : 'rotate-180') : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && dropdownPosition && typeof window !== 'undefined' && createPortal(
          <div 
            ref={(el) => {
              dropdownMenuRefs.current[booking.id] = el;
            }}
            className="fixed w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
            }}
          >
            <div className="py-1">
              {booking.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      handleMarkReady(booking.id, false);
                      setOpenDropdown(null);
                    }}
                    disabled={isProcessing}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Mark Ready (Send WhatsApp)
                  </button>
                  <button
                    onClick={() => {
                      handleMarkReady(booking.id, true);
                      setOpenDropdown(null);
                    }}
                    disabled={isProcessing}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Mark Ready (No WhatsApp)
                  </button>
                  <button
                    onClick={() => {
                      handleSkipToComplete(booking.id);
                      setOpenDropdown(null);
                    }}
                    disabled={isProcessing}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Skip to Complete
                  </button>
                  <button
                    onClick={() => {
                      handleCancelBooking(booking);
                      setOpenDropdown(null);
                    }}
                    disabled={isProcessing}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancel Booking
                  </button>
                </>
              )}
              {booking.status === 'ready' && (
                <>
                  {isEligibleForCollectionReminder(booking) && (
                    <button
                      onClick={() => {
                        handleSendCollectionReminder(booking.id);
                        setOpenDropdown(null);
                      }}
                      disabled={isProcessing}
                      className="block w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                    >
                      Send Collection Reminder
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleReadyForCollection(booking);
                      setOpenDropdown(null);
                    }}
                    disabled={isProcessing}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Complete
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // Bulk Actions Toolbar
  function BulkActionsToolbar({ tableBookings }: { tableBookings: BookingWithCustomer[] }) {
    // Get selections only for this table's bookings
    const tableSelectedIds = useMemo(() => {
      const tableIds = new Set(tableBookings.map((b) => b.id));
      return new Set(Array.from(selectedBookings).filter((id) => tableIds.has(id)));
    }, [selectedBookings, tableBookings]);

    if (tableSelectedIds.size === 0) return null;

    // Get statuses of selected bookings in this table
    const tableSelectedBookings = tableBookings.filter((b) => tableSelectedIds.has(b.id));
    const tableSelectedStatuses = new Set(tableSelectedBookings.map((b) => b.status));
    const hasPending = tableSelectedStatuses.has('pending');
    const hasReady = tableSelectedStatuses.has('ready');
    const eligibleForReminder = tableSelectedBookings.filter(b => isEligibleForCollectionReminder(b));
    const hasEligibleReminders = eligibleForReminder.length > 0;
    const isProcessing = processingBookings.size > 0;

    // Handler that only clears selections for this table
    const handleClearTableSelection = () => {
      setSelectedBookings((prev) => {
        const next = new Set(prev);
        tableSelectedIds.forEach((id) => next.delete(id));
        return next;
      });
    };

    // Handler for bulk actions on this table's selections
    const handleTableBulkAction = async (
      action: 'markReady' | 'markComplete' | 'skipToComplete',
      skipWhatsApp = false
    ) => {
      await handleBulkAction(action, skipWhatsApp, Array.from(tableSelectedIds));
      // Clear selections after action
      handleClearTableSelection();
    };

    // Handler for bulk cancellation
    const handleTableBulkCancel = () => {
      const selectedBookingsToCancel = tableBookings.filter((b) => tableSelectedIds.has(b.id));
      handleBulkCancel(selectedBookingsToCancel);
      handleClearTableSelection();
    };

    return (
      <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
        <span className="text-sm font-medium text-blue-900">
          {tableSelectedIds.size} booking{tableSelectedIds.size > 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-2">
          {hasPending && (
            <>
              <button
                onClick={() => handleTableBulkAction('markReady', false)}
                disabled={isProcessing}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Mark Ready (WhatsApp)
              </button>
              <button
                onClick={() => handleTableBulkAction('markReady', true)}
                disabled={isProcessing}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                Mark Ready (No WhatsApp)
              </button>
              <button
                onClick={() => handleTableBulkAction('skipToComplete')}
                disabled={isProcessing}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                Skip to Complete
              </button>
              <button
                onClick={handleTableBulkCancel}
                disabled={isProcessing}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Cancel Selected
              </button>
            </>
          )}
          {hasReady && (
            <>
              {hasEligibleReminders && (
                <button
                  onClick={() => {
                    handleBulkReminder(eligibleForReminder);
                    handleClearTableSelection();
                  }}
                  disabled={isProcessing}
                  className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  Send Collection Reminders ({eligibleForReminder.length})
                </button>
              )}
              <button
                onClick={() => handleTableBulkAction('markComplete')}
                disabled={isProcessing}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Mark Complete
              </button>
            </>
          )}
          <button
            onClick={handleClearTableSelection}
            disabled={isProcessing}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Clear Selection
          </button>
        </div>
      </div>
    );
  }

  // Render table component
  function renderTable(
    bookingsToShow: BookingWithCustomer[],
    emptyMessage: string,
    showCheckboxes = true
  ) {
    if (bookingsToShow.length === 0) {
      return (
        <div className="p-8 text-center text-gray-500">
          {emptyMessage}
        </div>
      );
    }

    const allSelected = bookingsToShow.length > 0 && bookingsToShow.every((b) => selectedBookings.has(b.id));
    const someSelected = bookingsToShow.some((b) => selectedBookings.has(b.id));

    return (
      <div className="overflow-x-auto overflow-y-visible">
        <table className="w-full min-w-[900px] divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showCheckboxes && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={() => toggleSelectAll(bookingsToShow)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                <button
                  onClick={handleSortReference}
                  className="inline-flex items-center gap-1 hover:text-gray-700"
                >
                  Reference
                  {sortColumn === 'reference' && (
                    <span className="text-gray-400">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Bike Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {bookingsToShow.map((booking) => {
              const isSelected = selectedBookings.has(booking.id);
              const isProcessing = processingBookings.has(booking.id);

              return (
                <tr
                  key={booking.id}
                  className={isSelected ? 'bg-blue-50' : ''}
                >
                  {showCheckboxes && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(booking.id)}
                        disabled={isProcessing}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(booking.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {booking.reference_number ? (
                      <span className="font-mono text-gray-900">{booking.reference_number}</span>
                    ) : (
                      <span className="text-gray-400 italic">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {booking.customer.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.customer.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {SERVICE_LABELS[booking.service_type]}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        statusColors[booking.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                    <button
                      onClick={() => {
                        setEditingBikeDetailsBooking(booking);
                        setBikeDetailsText(booking.bike_details || '');
                      }}
                      className="pl-0 pr-2 py-1 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      {booking.bike_details ? 'View/Edit' : 'Add'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                    <ActionDropdown booking={booking} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <CacheSync />
        <FallbackBanner />
        <AdminHeader title="Bookings" backLink="/admin" backLabel="Back to Dashboard" />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CacheSync />
      <FallbackBanner />
      <AdminHeader title="Bookings" backLink="/admin" backLabel="Back to Dashboard" />
      {ToastComponent}

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Search Bar */}
        <div className="rounded-lg bg-white shadow-md p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by reference, customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-500">
              {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>

        {/* Today's Bookings Card */}
        <div className="rounded-lg bg-white shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Bookings</h2>
          </div>
          <BulkActionsToolbar tableBookings={todayBookings} />
          {renderTable(todayBookings, searchQuery ? 'No bookings match your search' : 'No bookings for today', true)}
        </div>

        {/* All Bookings Card */}
        <div className="rounded-lg bg-white shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Bookings</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showComplete}
                  onChange={(e) => setShowComplete(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show complete bookings</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show cancelled bookings</span>
              </label>
            </div>
          </div>
          <BulkActionsToolbar tableBookings={paginatedOtherBookings} />
          {renderTable(paginatedOtherBookings, searchQuery ? 'No bookings match your search' : 'No bookings found', true)}
          {hasMoreBookings && (
            <div className="px-6 py-4 border-t border-gray-200 text-center">
              <button
                onClick={handleLoadMore}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                Load More ({filteredOtherBookings.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {modalBooking && (
        <ConfirmationModal
          booking={modalBooking}
          isOpen={!!modalBooking}
          onClose={handleCloseModal}
          onConfirm={handleConfirmComplete}
          isLoading={processingBookings.has(modalBooking.id)}
        />
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-labelledby="cancel-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseCancelModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
            <div className="p-6">
              <h3
                id="cancel-modal-title"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                Cancel this booking?
              </h3>

              <div className="space-y-3 mb-6">
                <div>
                  <span className="text-sm font-medium text-gray-700">Customer:</span>
                  <span className="ml-2 text-sm text-gray-900">{cancelModalBooking.customer.name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Service:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {SERVICE_LABELS[cancelModalBooking.service_type]}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700">Date:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {new Date(cancelModalBooking.date).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                </div>
                {cancelModalBooking.reference_number && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Reference:</span>
                    <span className="ml-2 text-sm text-gray-900 font-mono">
                      {cancelModalBooking.reference_number}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Send cancellation notification via WhatsApp?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelWhatsAppChoice(true)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${
                      cancelWhatsAppChoice === true
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Yes, Send WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelWhatsAppChoice(false)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${
                      cancelWhatsAppChoice === false
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    No WhatsApp
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseCancelModal}
                  disabled={processingBookings.has(cancelModalBooking.id)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={processingBookings.has(cancelModalBooking.id) || cancelWhatsAppChoice === null}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingBookings.has(cancelModalBooking.id) ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Cancellation Confirmation Modal */}
      {bulkCancelBookings.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-labelledby="bulk-cancel-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseBulkCancelModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 transform transition-all">
            <div className="p-6">
              <h3
                id="bulk-cancel-modal-title"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                Cancel {bulkCancelBookings.length} booking{bulkCancelBookings.length > 1 ? 's' : ''}?
              </h3>

              <div className="mb-4 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {bulkCancelBookings.map((booking) => (
                    <li key={booking.id} className="text-sm text-gray-700">
                      <span className="font-medium">{booking.customer.name}</span>
                      {' - '}
                      {SERVICE_LABELS[booking.service_type]}
                      {' - '}
                      {new Date(booking.date).toLocaleDateString('en-GB')}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Send cancellation notifications via WhatsApp?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setBulkCancelWhatsAppChoice(true)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${
                      bulkCancelWhatsAppChoice === true
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Yes, Send WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkCancelWhatsAppChoice(false)}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md border ${
                      bulkCancelWhatsAppChoice === false
                        ? 'bg-gray-600 text-white border-gray-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    No WhatsApp
                  </button>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseBulkCancelModal}
                  disabled={processingBookings.size > 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkCancel}
                  disabled={processingBookings.size > 0 || bulkCancelWhatsAppChoice === null}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingBookings.size > 0 ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reminder Confirmation Modal */}
      {bulkReminderBookings.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-labelledby="bulk-reminder-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseBulkReminderModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 transform transition-all">
            <div className="p-6">
              <h3
                id="bulk-reminder-modal-title"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                Send collection reminders to {bulkReminderBookings.length} booking{bulkReminderBookings.length > 1 ? 's' : ''}?
              </h3>

              <div className="mb-4 max-h-60 overflow-y-auto">
                <ul className="space-y-2">
                  {bulkReminderBookings.map((booking) => {
                    const daysWaiting = getDaysWaiting(booking);
                    return (
                      <li key={booking.id} className="text-sm text-gray-700">
                        <span className="font-medium">{booking.customer.name}</span>
                        {' - '}
                        {SERVICE_LABELS[booking.service_type]}
                        {' - '}
                        {new Date(booking.date).toLocaleDateString('en-GB')}
                        {daysWaiting !== null && (
                          <span className="ml-2 text-orange-600">
                            (Ready {daysWaiting} day{daysWaiting !== 1 ? 's' : ''} ago)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseBulkReminderModal}
                  disabled={processingBookings.size > 0}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkReminder}
                  disabled={processingBookings.size > 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processingBookings.size > 0 ? 'Sending...' : 'Send Reminders'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bike Details Modal */}
      {editingBikeDetailsBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-labelledby="bike-details-modal-title"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setEditingBikeDetailsBooking(null);
              setBikeDetailsText('');
            }}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 transform transition-all">
            <div className="p-6">
              <h3
                id="bike-details-modal-title"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                Bike Details for {editingBikeDetailsBooking.customer.name}
              </h3>

              <div className="mb-4">
                <label htmlFor="bike-details-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                  Bike Details
                </label>
                <textarea
                  id="bike-details-textarea"
                  value={bikeDetailsText}
                  onChange={(e) => setBikeDetailsText(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Make, model, any issues you've noticed..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingBikeDetailsBooking(null);
                    setBikeDetailsText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveBikeDetails}
                  disabled={savingBikeDetails}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingBikeDetails ? 'Saving...' : 'Save Bike Details'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
