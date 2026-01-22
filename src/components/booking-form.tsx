'use client';

import { useState } from 'react';
import { ServiceType, SERVICE_LABELS, BookingFormData } from '@/lib/types';

const SERVICES: ServiceType[] = [
  'basic_service',
  'full_service',
  'strip_and_rebuild',
  'bosch_diagnostics',
];

export default function BookingForm() {
  const [formData, setFormData] = useState<BookingFormData>({
    name: '',
    phone: '',
    email: '',
    service_type: 'basic_service',
    date: '',
    bike_details: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      setSubmitStatus('success');
      setFormData({
        name: '',
        phone: '',
        email: '',
        service_type: 'basic_service',
        date: '',
        bike_details: '',
      });
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  if (submitStatus === 'success') {
    return (
      <div className="rounded-lg bg-green-50 p-6 text-center">
        <h2 className="text-xl font-semibold text-green-800">Booking Confirmed!</h2>
        <p className="mt-2 text-green-700">
          Thanks {formData.name || 'for your booking'}! We&apos;ll be in touch via WhatsApp to confirm your appointment.
        </p>
        <button
          onClick={() => setSubmitStatus('idle')}
          className="mt-4 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Book Another Service
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitStatus === 'error' && (
        <div className="rounded-md bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      <div>
        <label htmlFor="service_type" className="block text-sm font-medium text-gray-700">
          Service Type <span className="text-red-500">*</span>
        </label>
        <select
          id="service_type"
          name="service_type"
          value={formData.service_type}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        >
          {SERVICES.map((service) => (
            <option key={service} value={service}>
              {SERVICE_LABELS[service]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Preferred Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          min={today}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          placeholder="07xxx xxxxxx"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
        <p className="mt-1 text-sm text-gray-500">We&apos;ll contact you via WhatsApp</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <div>
        <label htmlFor="bike_details" className="block text-sm font-medium text-gray-700">
          Bike Details <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bike_details"
          name="bike_details"
          value={formData.bike_details}
          onChange={handleChange}
          required
          rows={3}
          placeholder="Make, model, any issues you've noticed..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-medium-blue focus:outline-none focus:ring-1 focus:ring-medium-blue"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-medium-blue px-4 py-3 text-white font-medium hover:bg-dark-blue focus:outline-none focus:ring-2 focus:ring-medium-blue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Booking...' : 'Book Service'}
      </button>
    </form>
  );
}
