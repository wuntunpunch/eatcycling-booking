import Image from 'next/image';
import BookingForm from '@/components/booking-form';

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <main className="mx-auto max-w-lg px-4 py-12 relative z-10">
        <div className="text-center mb-8">
          <Image
            src="/images/EAT.svg"
            alt="EAT Cycling"
            width={200}
            height={80}
            className="mx-auto mb-4"
            priority
          />
          <p className="mt-2 text-gray-600">Book your bike service</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-black">
          <BookingForm />
        </div>
      </main>
    </div>
  );
}
