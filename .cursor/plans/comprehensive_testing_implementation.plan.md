---
name: Comprehensive Testing Implementation
overview: Implement a complete testing suite for the EAT Cycling booking system using Vitest for unit/integration tests and Playwright for E2E tests, targeting 80% code coverage across all areas.
todos:
  - id: setup-infrastructure
    content: Set up Vitest and Playwright configuration, install dependencies, create test directory structure
    status: pending
  - id: unit-availability
    content: Write unit tests for availability-helpers.ts (95%+ coverage)
    status: pending
  - id: unit-booking
    content: Write unit tests for booking-helpers.ts (100% coverage)
    status: pending
  - id: unit-calendar
    content: Write unit tests for calendar-links.ts (90% coverage)
    status: pending
  - id: unit-whatsapp
    content: Write unit tests for whatsapp.ts (85% coverage)
    status: pending
  - id: unit-auth
    content: Write unit tests for auth-helpers.ts and auth-cache.ts (90% coverage)
    status: pending
  - id: integration-booking-api
    content: Write integration tests for POST /api/bookings (90% coverage)
    status: pending
  - id: integration-admin-apis
    content: Write integration tests for all admin API routes (85% coverage)
    status: pending
  - id: integration-booking-actions
    content: Write integration tests for booking action APIs (ready, complete, cancel, restore)
    status: pending
  - id: integration-cron
    content: Write integration tests for cron job endpoints (90% coverage)
    status: pending
  - id: component-booking-form
    content: Write component tests for BookingForm (80% coverage)
    status: pending
  - id: component-admin
    content: Write component tests for admin components (75%+ coverage)
    status: pending
  - id: integration-flows
    content: Write integration tests for end-to-end flows (booking, admin, cancellation)
    status: pending
  - id: e2e-tests
    content: Write E2E tests with Playwright (booking, auth, admin workflows)
    status: pending
  - id: ci-cd-integration
    content: Set up CI/CD pipeline with coverage reporting and thresholds
    status: pending
isProject: false
---

# Comprehensive Testing Implementation Plan

## Overview

This plan implements a complete testing suite for the EAT Cycling booking system, targeting 80% code coverage. The implementation uses Vitest for unit/integration tests and Playwright for E2E tests, organized in phases from foundation to full coverage.

## Phase 1: Test Infrastructure Setup

### 1.1 Install Dependencies

Add to `package.json` devDependencies:

- `vitest` - Test runner
- `@vitest/ui` - Test UI for development
- `@vitest/coverage-v8` - Coverage reporting
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM environment for tests
- `msw` - Mock Service Worker for API mocking
- `@mswjs/data` - Data modeling for MSW
- `playwright` - E2E testing framework
- `@playwright/test` - Playwright test runner

### 1.2 Create Configuration Files

`**vitest.config.ts**` - Main Vitest configuration:

- Set up path aliases matching `tsconfig.json` (`@/*` → `./src/*`)
- Configure jsdom environment
- Set up coverage thresholds (80% for lines, functions, branches, statements)
- Configure test file patterns
- Set up test setup file

`**playwright.config.ts**` - Playwright E2E configuration:

- Configure browsers (Chromium, Firefox, WebKit)
- Set base URL for local dev
- Configure test timeouts
- Set up screenshot/video on failure

`**tests/setup.ts**` - Global test setup:

- Import `@testing-library/jest-dom` matchers
- Configure MSW handlers
- Set up environment variables for tests
- Mock Next.js router and navigation

### 1.3 Update package.json Scripts

Add test scripts:

- `test` - Run Vitest in watch mode
- `test:run` - Run tests once
- `test:ui` - Open Vitest UI
- `test:coverage` - Generate coverage report
- `test:e2e` - Run Playwright tests
- `test:e2e:ui` - Run Playwright UI mode

### 1.4 Create Test Directory Structure

```
tests/
├── setup.ts                    # Global test setup
├── mocks/
│   ├── handlers.ts            # MSW request handlers
│   ├── supabase.ts            # Supabase client mocks
│   ├── whatsapp.ts            # WhatsApp API mocks
│   └── google-calendar.ts     # Google Calendar mocks
├── fixtures/
│   ├── bookings.ts            # Sample booking data
│   ├── customers.ts           # Sample customer data
│   └── availability.ts        # Sample availability data
├── unit/
│   └── lib/                   # Helper function tests
├── integration/
│   └── api/                   # API route tests
├── components/                 # Component tests
└── e2e/                       # E2E tests
```

## Phase 2: Unit Tests - Helper Functions (Foundation)

### 2.1 Availability Helpers (`src/lib/availability-helpers.ts`)

**File:** `tests/unit/lib/availability-helpers.test.ts`

Test coverage for:

- `getUKDate()` - Timezone conversion, edge cases (BST/GMT transitions)
- `isFutureDate()` - Past/present/future dates, timezone boundaries
- `isWithinBookingWindow()` - 6-month window validation, boundary dates
- `isDateInRange()` - Single dates, date ranges, inclusive boundaries
- `isDateAvailable()` - All exclusion rules:
  - Weekend exclusion (Saturday/Sunday)
  - Sunday-only exclusion
  - Excluded date ranges
  - Service limit enforcement
  - Booking window validation
- `filterFutureExcludedDates()` - Past vs future filtering

**Target:** 95%+ coverage, ~8 hours

### 2.2 Booking Helpers (`src/lib/booking-helpers.ts`)

**File:** `tests/unit/lib/booking-helpers.test.ts`

Test coverage for:

- `generateReferenceNumber()` - Sequential generation, year transitions, concurrency handling, max sequence reset
- `isValidReferenceNumber()` - Format validation, edge cases

**Target:** 100% coverage, ~4 hours

### 2.3 Calendar Helpers (`src/lib/calendar-links.ts`)

**File:** `tests/unit/lib/calendar-links.test.ts`

Test coverage for:

- `generateGoogleCalendarUrl()` - URL encoding, date formatting, reminder calculation
- `generateICalFile()` - iCal format correctness, text escaping, UID generation
- `downloadICalFile()` - File download behavior, filename generation
- `isIOS()` / `isAndroid()` - User agent detection
- `trackCalendarClick()` - Analytics tracking

**Target:** 90% coverage, ~4 hours

### 2.4 WhatsApp Helpers (`src/lib/whatsapp.ts`)

**File:** `tests/unit/lib/whatsapp.test.ts`

Test coverage for:

- `formatPhoneNumber()` - UK number formatting (0→44), international formats, edge cases
- `sendBookingConfirmation()` - Template vs free-form fallback, parameter formatting
- `sendBikeReadyNotification()` - Template message structure
- `sendCancellationNotification()` - Rebooking link generation
- `sendServiceReminder()` - 6-month reminder logic, opt-out handling
- `sendCollectionReminder()` - Relative date formatting, 3-day threshold

**Target:** 85% coverage, ~6 hours

### 2.5 Auth Helpers (`src/lib/auth-helpers.ts`)

**File:** `tests/unit/lib/auth-helpers.test.ts`

Test coverage for:

- `checkAuth()` - Supabase auth success, Supabase failure → fallback cache, invalid cache, expired cache

**Target:** 90% coverage, ~4 hours

### 2.6 Auth Cache (`src/lib/auth-cache.ts`)

**File:** `tests/unit/lib/auth-cache.test.ts`

Test coverage for:

- `setAuthCache()` - localStorage storage, error handling
- `getAuthCache()` - Cache retrieval, invalid JSON handling
- `isAuthCacheValid()` - Expiration logic, 24-hour window
- `clearAuthCache()` - Cache removal
- `getCachedEmail()` - Email extraction

**Target:** 90% coverage, ~2 hours

### 2.7 API Client (`src/lib/api-client.ts`)

**File:** `tests/unit/lib/api-client.test.ts`

Test coverage for:

- `fetchWithRetry()` - 401 retry logic, network error retry, max retries, success on first attempt

**Target:** 90% coverage, ~2 hours

**Phase 2 Total:** ~30 hours, foundation for all other tests

## Phase 3: Integration Tests - API Routes

### 3.1 Public Booking API (`src/app/api/bookings/route.ts`)

**File:** `tests/integration/api/bookings.test.ts`

Test coverage for:

- `POST /api/bookings`:
  - Valid booking creation
  - Required field validation
  - Date availability validation (past dates, excluded dates, service limits)
  - Customer creation vs update
  - Reference number generation
  - Google Calendar event creation (success and failure)
  - WhatsApp confirmation (success and failure)
  - Availability override (admin only)
  - Phone number normalization

**Target:** 90% coverage, ~12 hours

### 3.2 Availability API (`src/app/api/availability/route.ts`)

**File:** `tests/integration/api/availability.test.ts`

Test coverage for:

- `GET /api/availability`:
  - Settings retrieval with defaults
  - Excluded dates filtering (future only)
  - Booking counts calculation
  - Cache headers
  - Error handling

**Target:** 85% coverage, ~4 hours

### 3.3 Opt-Out API (`src/app/api/opt-out/route.ts`)

**File:** `tests/integration/api/opt-out.test.ts`

Test coverage for:

- `POST /api/opt-out`:
  - Valid opt-out request
  - Phone normalization
  - Non-existent customer handling (security)
  - Error handling

**Target:** 85% coverage, ~2 hours

### 3.4 Admin Availability API (`src/app/api/admin/availability/route.ts`)

**File:** `tests/integration/api/admin/availability.test.ts`

Test coverage for:

- `GET /api/admin/availability` - Auth required, settings retrieval, future-only filtering
- `PUT /api/admin/availability` - Auth required, weekend/sunday exclusion, validation

**Target:** 85% coverage, ~4 hours

### 3.5 Admin Excluded Dates API (`src/app/api/admin/availability/excluded-dates/route.ts`)

**File:** `tests/integration/api/admin/excluded-dates.test.ts`

Test coverage for:

- `GET /api/admin/availability/excluded-dates` - Auth required, booking warnings
- `POST /api/admin/availability/excluded-dates` - Date validation, range validation, booking conflict warnings
- `DELETE /api/admin/availability/excluded-dates` - Auth required, deletion

**Target:** 85% coverage, ~6 hours

### 3.6 Admin Service Limits API (`src/app/api/admin/service-limits/route.ts`)

**File:** `tests/integration/api/admin/service-limits.test.ts`

Test coverage for:

- `GET /api/admin/service-limits` - Auth required, booking counts
- `PUT /api/admin/service-limits` - Validation, capacity warnings, null handling

**Target:** 85% coverage, ~4 hours

### 3.7 Admin Bookings API (`src/app/api/admin/bookings/route.ts`)

**File:** `tests/integration/api/admin/bookings.test.ts`

Test coverage for:

- `GET /api/admin/bookings` - Auth required, booking retrieval with customers, ordering

**Target:** 80% coverage, ~2 hours

### 3.8 Admin Customers API (`src/app/api/admin/customers/route.ts`)

**File:** `tests/integration/api/admin/customers.test.ts`

Test coverage for:

- `GET /api/admin/customers` - Auth required, search functionality, phone/name matching, limit

**Target:** 85% coverage, ~3 hours

### 3.9 Admin Customer Bookings API (`src/app/api/admin/customers/[id]/bookings/route.ts`)

**File:** `tests/integration/api/admin/customer-bookings.test.ts`

Test coverage for:

- `GET /api/admin/customers/[id]/bookings` - Auth required, pagination, ordering

**Target:** 85% coverage, ~3 hours

### 3.10 Booking Actions APIs

**Files:** `tests/integration/api/bookings/ready.test.ts`, `complete.test.ts`, `cancel.test.ts`, `restore.test.ts`, `remind-collection.test.ts`

Test coverage for:

- `POST /api/bookings/[id]/ready` - Status validation, WhatsApp notification, skipWhatsApp option
- `POST /api/bookings/[id]/complete` - Status validation, skipStage option, reminder reset logic
- `POST /api/bookings/[id]/cancel` - Status validation, calendar deletion, WhatsApp notification
- `POST /api/bookings/[id]/restore` - Status validation, field reset
- `POST /api/bookings/[id]/remind-collection` - 3-day threshold, status validation

**Target:** 85% coverage, ~15 hours

### 3.11 Bulk Booking API (`src/app/api/bookings/bulk/route.ts`)

**File:** `tests/integration/api/bookings/bulk.test.ts`

Test coverage for:

- `POST /api/bookings/bulk` - Auth required, markReady, markComplete, skipToComplete, partial failures

**Target:** 85% coverage, ~4 hours

### 3.12 Admin Reminders API (`src/app/api/admin/reminders/route.ts`)

**File:** `tests/integration/api/admin/reminders.test.ts`

Test coverage for:

- `GET /api/admin/reminders?type=due` - 6-month window, opt-out filtering, grouping
- `GET /api/admin/reminders?type=sent` - History retrieval
- `GET /api/admin/reminders?type=failed` - Failure tracking
- `GET /api/admin/reminders?type=stats` - Statistics calculation

**Target:** 85% coverage, ~6 hours

### 3.13 Admin Reminder Send API (`src/app/api/admin/reminders/send/route.ts`)

**File:** `tests/integration/api/admin/reminders-send.test.ts`

Test coverage for:

- `POST /api/admin/reminders/send` - Auth required, bookingId/customerId lookup, window validation, opt-out handling

**Target:** 85% coverage, ~4 hours

### 3.14 Cron Jobs

**Files:** `tests/integration/api/cron/send-reminders.test.ts`, `send-collection-reminders.test.ts`

Test coverage for:

- `GET /api/cron/send-reminders` - Vercel cron header validation, 6-month window, batch processing, failure handling, opt-out filtering
- `GET /api/cron/send-collection-reminders` - 3-day threshold, duplicate prevention, error handling

**Target:** 90% coverage, ~8 hours

### 3.15 Auth APIs

**Files:** `tests/integration/api/auth/login.test.ts`, `password-login.test.ts`, `callback.test.ts`, `logout.test.ts`, `forgot-password.test.ts`, `reset-password.test.ts`

Test coverage for:

- `POST /api/auth/login` - Magic link sending, rate limiting, error handling
- `POST /api/auth/password-login` - Password authentication, error handling
- `GET /api/auth/callback` - Code exchange, session creation, cache setting, error handling
- `POST /api/auth/logout` - Session termination
- `POST /api/auth/forgot-password` - Reset email sending, rate limiting
- `POST /api/auth/reset-password` - Password update, validation

**Target:** 80% coverage, ~10 hours

**Phase 3 Total:** ~87 hours

## Phase 4: Component Tests

### 4.1 Booking Form (`src/components/booking-form.tsx`)

**File:** `tests/components/booking-form.test.tsx`

Test coverage for:

- Form rendering with all fields
- Field validation (required fields, date selection)
- Date picker interactions (available/unavailable dates)
- Availability loading states
- Form submission (success and error)
- Reference number display and copy
- Calendar link generation (Google, Apple, Outlook)
- Device detection (iOS/Android)
- Error message display
- Date error handling

**Target:** 80% coverage, ~10 hours

### 4.2 Toast Component (`src/components/toast.tsx`)

**File:** `tests/components/toast.test.tsx`

Test coverage for:

- Toast rendering (success, error, info)
- Auto-dismiss after duration
- Manual close button
- useToast hook functionality

**Target:** 90% coverage, ~2 hours

### 4.3 Admin Header (`src/components/admin-header.tsx`)

**File:** `tests/components/admin-header.test.tsx`

Test coverage for:

- User email display (Supabase vs cache)
- Logout functionality
- Back link navigation
- Loading states

**Target:** 75% coverage, ~3 hours

### 4.4 Confirmation Modal (`src/components/confirmation-modal.tsx`)

**File:** `tests/components/confirmation-modal.test.tsx`

Test coverage for:

- Modal rendering with booking data
- ESC key handling
- Body scroll lock
- Confirm/cancel actions
- Loading state

**Target:** 80% coverage, ~3 hours

### 4.5 Customer History Modal (`src/components/customer-history-modal.tsx`)

**File:** `tests/components/customer-history-modal.test.tsx`

Test coverage for:

- Modal rendering
- Booking list display
- Pagination
- Loading states
- Error handling
- ESC key handling

**Target:** 75% coverage, ~4 hours

### 4.6 Fallback Banner (`src/components/fallback-banner.tsx`)

**File:** `tests/components/fallback-banner.test.tsx`

Test coverage for:

- Banner display when in fallback mode
- Banner hidden when Supabase auth works
- Cache validation check

**Target:** 80% coverage, ~2 hours

### 4.7 Cache Sync (`src/components/cache-sync.tsx`)

**File:** `tests/components/cache-sync.test.tsx`

Test coverage for:

- Cookie to localStorage sync
- localStorage to cookie sync
- Cache timestamp comparison

**Target:** 85% coverage, ~2 hours

**Phase 4 Total:** ~26 hours

## Phase 5: Integration Tests - End-to-End Flows

### 5.1 Booking Flow

**File:** `tests/integration/flows/booking-flow.test.ts`

Test scenarios:

- Complete booking: form submission → API → database → calendar → WhatsApp
- Booking with existing customer (update vs create)
- Booking with service limit at capacity (rejection)
- Booking on excluded date (rejection)
- Booking with calendar failure (should still succeed)
- Booking with WhatsApp failure (should still succeed)

**Target:** ~6 hours

### 5.2 Admin Workflow

**File:** `tests/integration/flows/admin-workflow.test.ts`

Test scenarios:

- Login → View bookings → Mark ready → Complete
- Customer search → View history
- Availability management → Exclude dates → Verify booking rejection
- Service limit setting → Verify capacity enforcement
- Bulk operations (mark multiple ready)

**Target:** ~6 hours

### 5.3 Cancellation Flow

**File:** `tests/integration/flows/cancellation-flow.test.ts`

Test scenarios:

- Cancel booking → Verify calendar deletion → Verify WhatsApp message
- Cancel with skipWhatsApp option
- Restore cancelled booking

**Target:** ~3 hours

**Phase 5 Total:** ~15 hours

## Phase 6: E2E Tests (Playwright)

### 6.1 Public Booking Flow

**File:** `tests/e2e/booking.spec.ts`

Test scenarios:

- Complete booking form submission
- Date picker interaction (selecting available dates)
- Form validation (missing fields)
- Success page with reference number
- Calendar link downloads

**Target:** ~4 hours

### 6.2 Admin Authentication

**File:** `tests/e2e/auth.spec.ts`

Test scenarios:

- Magic link login flow
- Password login flow
- Logout
- Protected route access
- Fallback auth mode

**Target:** ~4 hours

### 6.3 Admin Dashboard

**File:** `tests/e2e/admin.spec.ts`

Test scenarios:

- View bookings list
- Search customers
- Mark booking as ready
- Complete booking
- Cancel booking
- Manage availability settings
- Set service limits

**Target:** ~6 hours

**Phase 6 Total:** ~14 hours

## Phase 7: CI/CD Integration

### 7.1 GitHub Actions / Vercel Integration

Create workflow files:

- Run unit/integration tests on PR
- Run E2E tests on merge to main
- Generate coverage reports
- Fail builds if coverage drops below 80%
- Upload coverage to coverage service (Codecov/CodeClimate)

**Target:** ~3 hours

## Mocking Strategy

### MSW Handlers (`tests/mocks/handlers.ts`)

Create handlers for:

- Supabase API calls (auth, database queries)
- WhatsApp Graph API
- Google Calendar API
- Resend Email API

### Test Fixtures (`tests/fixtures/`)

Create reusable test data:

- Sample bookings (various statuses)
- Sample customers
- Availability settings
- Excluded dates

## Coverage Goals

- **Overall:** 80%+
- **Core business logic (helpers):** 95%+
- **API routes:** 85%+
- **Components:** 75%+
- **Utilities:** 80%+

## Estimated Total Time

### AI-Assisted Development Estimates

- Phase 1 (Setup): ~1-2 hours (mostly dependency installation and config writing)
- Phase 2 (Unit tests): ~4-6 hours (can write multiple test files quickly)
- Phase 3 (API tests): ~10-15 hours (more complex scenarios, but can batch similar tests)
- Phase 4 (Component tests): ~4-6 hours (React Testing Library tests are straightforward)
- Phase 5 (Integration flows): ~3-4 hours (reusing existing test patterns)
- Phase 6 (E2E tests): ~4-6 hours (Playwright setup + test writing)
- Phase 7 (CI/CD): ~1-2 hours (workflow file creation)

**AI Writing Time: ~27-41 hours (~3-5 days of focused work)**

### Additional Time Considerations

- **Test execution & debugging:** ~5-10 hours (running tests, fixing failures, edge cases)
- **Review & refinement:** ~3-5 hours (code review, coverage gap analysis)
- **Iteration:** ~2-4 hours (addressing feedback, improving test quality)

**Total Realistic Estimate: ~37-60 hours (~5-8 days)**

### Original Human Developer Estimates (for reference)

- Phase 1 (Setup): ~8 hours
- Phase 2 (Unit tests): ~30 hours
- Phase 3 (API tests): ~87 hours
- Phase 4 (Component tests): ~26 hours
- Phase 5 (Integration flows): ~15 hours
- Phase 6 (E2E tests): ~14 hours
- Phase 7 (CI/CD): ~3 hours

**Original Total: ~183 hours (~23 days)**

## Implementation Order

1. **Day 1:** Phase 1 (Setup) + Phase 2 (Unit tests foundation) - ~5-8 hours
2. **Day 2-3:** Phase 3 (API routes - critical paths first) - ~10-15 hours
3. **Day 4:** Phase 4 (Components) + Phase 5 (Integration flows) - ~7-10 hours
4. **Day 5:** Phase 6 (E2E) + Phase 7 (CI/CD) + Coverage gap filling - ~5-8 hours
5. **Day 6-8:** Test execution, debugging, review, and refinement - ~10-19 hours

## Success Criteria

- All tests passing
- 80%+ code coverage achieved
- CI/CD pipeline running tests automatically
- Tests run in <5 minutes for unit/integration
- E2E tests run in <15 minutes
- Coverage reports generated and visible
