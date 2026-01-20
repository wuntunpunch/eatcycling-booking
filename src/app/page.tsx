import BookingForm from '@/components/booking-form';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-lg px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">EAT Cycling</h1>
          <p className="mt-2 text-gray-600">Book your bike service</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <BookingForm />
        </div>
      </main>
    </div>
  );
}
