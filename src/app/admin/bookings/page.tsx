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
  const [modalBooking, setModalBooking] = useState<BookingWithCustomer | null>(null);
  const [displayCount, setDisplayCount] = useState(5);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { showToast, ToastComponent } = useToast();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        const dropdown = dropdownRefs.current[openDropdown];
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdown(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  // Load filter preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('bookings_show_complete');
      if (saved !== null) {
        setShowComplete(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }
  }, []);

  // Save filter preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('bookings_show_complete', JSON.stringify(showComplete));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [showComplete]);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    try {
      const response = await fetchWithRetry('/api/admin/bookings', {}, 1);
      
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

  async function handleMarkReady(bookingId: string, skipWhatsApp = false) {
    setProcessingBookings((prev) => new Set(prev).add(bookingId));
    try {
      const response = await fetch(`/api/bookings/${bookingId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipWhatsApp }),
      });

      if (response.ok) {
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
  };

  const statusOrder: Record<string, number> = {
    pending: 0,
    ready: 1,
    complete: 2,
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

  const { todayBookings, otherBookings } = useMemo(() => {
    const today: BookingWithCustomer[] = [];
    const others: BookingWithCustomer[] = [];

    bookings.forEach((booking) => {
      if (isToday(booking.date)) {
        today.push(booking);
      } else {
        others.push(booking);
      }
    });

    return {
      todayBookings: sortBookingsByStatus(today),
      otherBookings: sortBookingsByDate(others),
    };
  }, [bookings]);

  const filteredOtherBookings = useMemo(() => {
    return showComplete
      ? otherBookings
      : otherBookings.filter((b) => b.status !== 'complete');
  }, [otherBookings, showComplete]);

  useEffect(() => {
    setDisplayCount(5);
  }, [showComplete]);

  const paginatedOtherBookings = useMemo(() => {
    return filteredOtherBookings.slice(0, displayCount);
  }, [filteredOtherBookings, displayCount]);

  const hasMoreBookings = filteredOtherBookings.length > displayCount;

  function handleLoadMore() {
    setDisplayCount((prev) => prev + 5);
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
      }
    }, [isOpen]);

    if (booking.status === 'complete') {
      return <span className="text-gray-400">Complete</span>;
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
                </>
              )}
              {booking.status === 'ready' && (
                <button
                  onClick={() => {
                    handleReadyForCollection(booking);
                    setOpenDropdown(null);
                  }}
                  disabled={isProcessing}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Ready for Collection
                </button>
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
            </>
          )}
          {hasReady && (
            <button
              onClick={() => handleTableBulkAction('markComplete')}
              disabled={isProcessing}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Mark Complete
            </button>
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
        <table className="w-full table-fixed divide-y divide-gray-200">
          <colgroup>
            {showCheckboxes && <col className="w-[5%]" />}
            <col className="w-[12%]" />
            <col className="w-[23%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[30%]" />
          </colgroup>
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
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
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
        {/* Today's Bookings Card */}
        <div className="rounded-lg bg-white shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Bookings</h2>
          </div>
          <BulkActionsToolbar tableBookings={todayBookings} />
          {renderTable(todayBookings, 'No bookings for today', true)}
        </div>

        {/* All Bookings Card */}
        <div className="rounded-lg bg-white shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Bookings</h2>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showComplete}
                onChange={(e) => setShowComplete(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show complete bookings</span>
            </label>
          </div>
          <BulkActionsToolbar tableBookings={paginatedOtherBookings} />
          {renderTable(paginatedOtherBookings, 'No bookings found', true)}
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
    </div>
  );
}
