# EAT Cycling Booking System

Booking system for EAT Cycling (bike servicing business). Replaces existing booking widget with a custom solution.

**Live Site:** [book.eatcycling.co.uk](https://book.eatcycling.co.uk)

---

## Documentation

All documentation is in the [`docs/`](./docs/) folder:

- **[USER_GUIDE.md](./docs/USER_GUIDE.md)** - Customer-facing user guide (for Eddie)
- **[DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)** - Developer guide (getting started, project structure, common tasks)
- **[ADMIN_SETUP.md](./docs/ADMIN_SETUP.md)** - Technical admin setup (creating accounts, environment variables)
- **[INTEGRATION_SETUP.md](./docs/INTEGRATION_SETUP.md)** - Integration setup guide (Google Calendar & WhatsApp - customer-facing)
- **[CLAUDE.md](./docs/CLAUDE.md)** - Project overview and business rules
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** - Deployment guide for Vercel

---

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (see docs/ADMIN_SETUP.md)
cp .env.local.example .env.local  # Edit with your values

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the booking form.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel
- **Styling**: Tailwind CSS
- **Integrations**: Google Calendar API, WhatsApp Business API

---

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
├── components/       # React components
└── lib/              # Utilities and integrations
```

See [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) for detailed project structure.

---

## Key Features

- ✅ Public booking form
- ✅ Admin dashboard for managing bookings
- ✅ Customer search and history
- ✅ Automatic Google Calendar integration
- ✅ WhatsApp notifications (booking confirmations, ready notifications)
- ✅ 6-month service reminders
- ✅ Availability management (day exclusions, service limits)
- ✅ Booking reference numbers

---

## Environment Variables

Required environment variables (see [docs/ADMIN_SETUP.md](./docs/ADMIN_SETUP.md) for details):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

# Google Calendar (optional for basic testing)
GOOGLE_CALENDAR_ID=
GOOGLE_SERVICE_ACCOUNT_KEY=

# WhatsApp (optional for basic testing)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_TOKEN=
```

---

## Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

See [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md) for development workflow and common tasks.

---

## Deployment

Deployed automatically to Vercel on push to `main` branch.

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for deployment instructions.

---

## Support

- **For customers**: See [docs/USER_GUIDE.md](./docs/USER_GUIDE.md)
- **For developers**: See [docs/DEVELOPER_GUIDE.md](./docs/DEVELOPER_GUIDE.md)
- **For integrations**: See [docs/INTEGRATION_SETUP.md](./docs/INTEGRATION_SETUP.md)

---

**Last Updated:** February 2026
