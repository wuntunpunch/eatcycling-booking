import Image from 'next/image';
import BookingForm from '@/components/booking-form';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* Pink gradient overlay matching the main site */}
      <div
        className="absolute bottom-0 left-0 right-0 h-full z-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,235,255,0.1) 40%, rgba(254,150,254,0.2) 80%, rgba(254,19,254,0.4) 100%)",
        }}
      ></div>

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
