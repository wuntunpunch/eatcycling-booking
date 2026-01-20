import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">EAT Cycling Admin</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/admin/bookings"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Bookings</h2>
            <p className="mt-2 text-gray-600">View and manage all bookings</p>
          </Link>

          <Link
            href="/admin/customers"
            className="block rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900">Customers</h2>
            <p className="mt-2 text-gray-600">Search and view customer history</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
