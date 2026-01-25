'use client';

import { useEffect } from 'react';
import { BookingWithCustomer, SERVICE_LABELS } from '@/lib/types';

interface ConfirmationModalProps {
  booking: BookingWithCustomer;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  booking,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ConfirmationModalProps) {
  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isLoading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const formattedDate = new Date(booking.date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all">
        <div className="p-6">
          <h3
            id="modal-title"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Mark this booking as complete?
          </h3>

          <div className="space-y-3 mb-6">
            <div>
              <span className="text-sm font-medium text-gray-700">Customer:</span>
              <span className="ml-2 text-sm text-gray-900">{booking.customer.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Service:</span>
              <span className="ml-2 text-sm text-gray-900">
                {SERVICE_LABELS[booking.service_type]}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Date:</span>
              <span className="ml-2 text-sm text-gray-900">{formattedDate}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            This will hide it from active bookings.
          </p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Marking complete...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
