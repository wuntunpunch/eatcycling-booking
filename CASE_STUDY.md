# Case Study: EAT Cycling Booking System

## Executive Summary

EAT Cycling, a bike servicing business, was paying £600 per year for a generic booking widget that wasn't meeting their needs. The solution was overcomplicated with features they never used, and critically, it was **customer-only** - staff had to use a difference system to create bookings for walk-in or phone customers. Through consultation and collaboration, we built a custom **dual-use booking system** that serves both customers and staff, tailored specifically to EAT Cycling's workflow, resulting in a streamlined solution that integrates seamlessly with their daily operations.

---

## The Challenge

### The Problem

EAT Cycling faced several critical issues with their existing booking solution:

1. **Single-User Limitation**
   - The existing booking widget was **customer-only** - staff couldn't create bookings
   - When customers called or visited in person, staff had to use a different process to enter bookings into the system
   - This created a disconnect between phone/in-person bookings and the digital system
   - Staff had to rely on manual processes (paper, spreadsheets) for walk-in or phone bookings

2. **Low Customer Engagement**
   - The existing booking widget wasn't being used effectively
   - Customers weren't finding it intuitive or accessible
   - Booking rates were below expectations

3. **Cost Inefficiency**
   - Paying £600/year (£50/month) for a generic solution
   - Paying for features and functionality that were never utilized
   - No return on investment for unused capabilities

4. **Poor Fit for Business Model**
   - The generic solution didn't align with EAT Cycling's specific workflow
   - Eddie (the owner) manages his own schedule manually - no need for complex time slot management
   - Phone numbers are the primary customer identifier, not emails (unlike most generic systems)
   - Required date-based booking only, without rigid time constraints

5. **Lack of Integration**
   - No integration with Google Calendar (where Eddie manages his schedule)
   - No automated WhatsApp notifications (EAT Cycling's preferred communication channel)
   - Manual processes for booking confirmations and customer communication

### Business Requirements

Through consultation, we identified EAT Cycling's actual needs:

- **Dual-use booking system** - both customers AND staff can create bookings
- **Simple, focused booking form** - no unnecessary complexity
- **Date-based booking** - Eddie manages his own daily schedule
- **Phone-first approach** - phone numbers as primary customer identifier
- **Google Calendar integration** - automatic event creation
- **WhatsApp automation** - booking confirmations and "bike ready" notifications
- **Admin dashboard** - view bookings, search customers, manage workflow
- **Service reminders** - automated 6-month follow-up system

---

## The Solution

### Approach

Rather than trying to adapt a generic solution, we built a custom booking system from the ground up, designed specifically around EAT Cycling's workflow and communication preferences.

### Consultation Process

1. **Discovery Phase**
   - Understanding Eddie's daily workflow
   - Identifying pain points with the existing system
   - Mapping out customer journey and communication preferences

2. **Requirements Definition**
   - Prioritizing essential features over "nice-to-haves"
   - Designing around phone-first customer identification
   - Planning integrations with existing tools (Google Calendar, WhatsApp)

3. **Iterative Development**
   - Building core booking functionality first
   - Adding integrations based on actual usage patterns
   - Refining admin tools based on real-world feedback

---

## The End Product

### Dual-Use Booking System

**Key Differentiator:** Unlike the previous customer-only widget, this system serves **both customers and staff**:

- **Customers** can book online via the public form
- **Staff** can create bookings for walk-in customers or phone bookings using the same system
- All bookings flow into the same unified system with automatic calendar and WhatsApp integration

### Public Booking Form (`book.eatcycling.co.uk`)

A clean, focused booking interface that **customers can access directly**, and **staff can use for phone/walk-in bookings**:

**Features:**
- **Service Selection**: Four service types
  - Basic service
  - Full service
  - Strip and rebuild
  - Bosch diagnostics

- **Smart Date Picker**: Date-based booking (no time slots)
  - Customers select a date, Eddie manages his own schedule
  - Automatically excludes unavailable dates (weekends, holidays, dates at capacity)
  - Real-time availability checking prevents overbooking

- **Customer Details**:
  - Name (required)
  - Phone number (required - primary identifier)
  - Email (optional)

- **Bike Details**: Free-form text field for bike information

- **Instant Confirmation**: Immediate feedback on successful booking

### Admin Dashboard

A comprehensive admin interface for managing all aspects of the business. Staff can also **create new bookings** directly from the admin area using the same booking form, ensuring all bookings (whether from customers or staff) are captured in one unified system:

**1. Bookings Management**
- **Create new bookings** - Staff can add bookings for walk-in or phone customers
- View all bookings with filtering options
- Filter by status (pending, confirmed, in progress, ready, collected)
- Search functionality
- Bulk actions (mark multiple bookings as ready/complete)
- Individual booking actions:
  - Mark as "ready" (triggers WhatsApp notification)
  - Mark as complete
  - Add notes
  - View full booking details

**2. Customer Search**
- Search by phone number or name
- View customer history (all past bookings)
- See booking patterns and service preferences
- Quick access to customer contact information

**3. Availability Management**
- **Day Exclusions**: Configure which days of the week are unavailable
  - Exclude weekends (Saturday + Sunday) toggle
  - Exclude Sundays only option
- **Specific Date Exclusions**: Block individual dates or date ranges
  - Add single dates or date ranges (e.g., holidays, vacation periods)
  - Optional reason field for each exclusion
  - Warnings shown when excluding dates with existing bookings
  - View past exclusions for historical reference
- **Automatic Availability Checking**: Booking form automatically prevents bookings on excluded dates
- **Visual Calendar**: See excluded dates at a glance

**4. Daily Workload Control (Service Limits)**
- **Maximum Services Per Day**: Set a daily booking limit to control workload
  - Can be set to unlimited (default) or a specific number
  - Prevents overbooking and helps manage capacity
- **Visual Calendar View**: See booking counts for each day
  - Dates at capacity highlighted in red
  - Shows current bookings vs. limit (e.g., "5/8")
  - Month-by-month navigation
- **Smart Warnings**: Alerts when setting limits that conflict with existing bookings
- **Real-Time Updates**: Booking counts update automatically as bookings are created

**5. Service Reminders**
- Automated 6-month service reminder system
- View due reminders (customers who completed service 6 months ago)
- Manual reminder sending with retry capability
- Track reminder success/failure rates
- Cost estimation for WhatsApp messages
- Failed reminder tracking and resolution

### Key Integrations

**1. Google Calendar Integration**
- Every booking automatically creates a calendar event
- Events include:
  - Customer name and phone number
  - Service type
  - Bike details
  - Booking date
- Seamless integration with Eddie's existing calendar workflow

**2. WhatsApp Business API**
- **Booking Confirmations**: Automatic WhatsApp message sent when booking is created
- **"Bike Ready" Notifications**: One-click button in admin dashboard sends WhatsApp notification to customer
- **Service Reminders**: Automated 6-month follow-up messages
- **Template-Based Messaging**: Uses approved WhatsApp templates for compliance
- **Message Logging**: All WhatsApp messages logged for tracking and compliance

**3. Automated Reminder System**
- Daily cron job checks for customers due for 6-month reminders
- Runs at 9 AM UTC daily
- Batch processing for efficiency
- Automatic retry for failed messages
- Opt-out functionality for customers who don't want reminders

### Technical Architecture

**Modern Tech Stack:**
- **Next.js 16** (App Router) - Fast, modern React framework
- **Supabase** (PostgreSQL) - Reliable database with built-in authentication
- **Vercel** - Seamless hosting and deployment
- **Tailwind CSS** - Modern, responsive UI
- **TypeScript** - Type-safe development

**Key Technical Features:**
- **Phone-First Database Design**: Phone numbers as unique identifiers
- **Row-Level Security**: Secure data access policies
- **Fallback Authentication**: Password-based login when email links fail
- **Message Logging**: Complete audit trail of all communications
- **Availability Management**: Flexible date exclusion system with day-of-week and specific date controls
- **Daily Workload Control**: Service limits prevent overbooking and help manage capacity
- **Real-Time Availability Checking**: Server-side and client-side validation ensures accurate booking availability
- **Error Handling**: Graceful degradation if integrations fail
- **Responsive Design**: Works on all devices

---

## How It Met EAT Cycling's Needs

### 1. Cost Efficiency ✅

**Before:** £600/year for unused features  
**After:** £300/year for a custom solution tailored to their needs

- **50% cost reduction** - paying half the price for a better-fit solution
- No monthly subscription fees for unused features
- Custom solution designed specifically for EAT Cycling's workflow
- Better value - paying less for more relevant functionality

### 2. Dual-Use Capability ✅

**Before:** Customer-only widget - staff couldn't create bookings  
**After:** Both customers AND staff can create bookings

- **Unified System**: All bookings (online, phone, walk-in) in one place
- **Staff Empowerment**: Staff can create bookings directly in the system
- **No More Manual Processes**: Eliminates need for paper/spreadsheets for phone/walk-in bookings
- **Consistent Experience**: Same booking form and process whether customer or staff creates it
- **Complete Visibility**: All bookings visible in admin dashboard regardless of source

### 3. Customer Engagement ✅

**Before:** Low booking rates, confusing interface  
**After:** Streamlined, phone-first booking experience

- Simple, focused booking form
- Phone number as primary identifier (matches customer behavior)
- Instant WhatsApp confirmations (customers' preferred communication channel)
- Easy access at `book.eatcycling.co.uk`

### 4. Workflow Integration ✅

**Before:** Manual calendar entry, separate communication tools  
**After:** Automated calendar and WhatsApp integration

- **Google Calendar**: Bookings automatically appear in Eddie's calendar
- **WhatsApp**: Automated confirmations and "bike ready" notifications
- **Admin Dashboard**: All bookings in one place, easy to manage

### 5. Business-Specific Features ✅

**Before:** Generic solution that didn't fit  
**After:** Built around EAT Cycling's actual workflow

- **Date-based booking**: No rigid time slots - Eddie manages his schedule
- **Phone-first**: Matches how customers actually identify themselves
- **Availability control**: Flexible system to exclude weekends, holidays, or specific dates
- **Daily workload management**: Set maximum services per day to prevent overbooking
- **Service reminders**: Automated 6-month follow-up system
- **Customer history**: Easy to see past bookings and patterns

### 6. Scalability and Maintenance ✅

**Before:** Dependent on third-party widget updates  
**After:** Full control and customization

- Can add features as business grows
- No dependency on external widget updates
- Easy to modify based on feedback
- Modern tech stack ensures long-term maintainability

---

## Key Benefits

### For EAT Cycling (Business Owner)

1. **Reduced Costs**: 50% cost reduction - from £600/year to £300/year
2. **Unified Booking System**: All bookings (online, phone, walk-in) in one place
3. **Staff Empowerment**: Staff can create bookings directly - no more manual processes
4. **Better Organization**: All bookings in one dashboard
5. **Time Savings**: Automated calendar and WhatsApp notifications
6. **Availability Control**: Easy management of available dates (exclude weekends, holidays, specific dates)
7. **Workload Management**: Set daily service limits to prevent overbooking and manage capacity
8. **Customer Insights**: Easy access to customer history and patterns
9. **Professional Image**: Custom booking system reflects business quality

### For Customers

1. **Easier Booking**: Simple, focused form
2. **Instant Confirmation**: WhatsApp confirmation immediately after booking
3. **Convenient Communication**: WhatsApp notifications when bike is ready
4. **No Account Required**: Quick booking without sign-up

### For Business Operations

1. **Complete Booking Capture**: All bookings (customer and staff-created) in unified system
2. **Eliminated Manual Processes**: No more paper/spreadsheets for phone/walk-in bookings
3. **Automated Workflows**: Calendar events and notifications happen automatically
4. **Availability Management**: Prevent bookings on unavailable dates automatically
5. **Capacity Control**: Daily service limits prevent overbooking and help balance workload
6. **Customer Retention**: 6-month reminder system encourages repeat business
7. **Better Tracking**: Complete history of all bookings and communications
8. **Mobile-Friendly**: Admin dashboard works on any device - staff can create bookings on mobile

---

## Results and Impact

### Immediate Benefits

- **Cost Savings**: 50% reduction - saving £300/year (£600/year → £300/year)
- **Unified Booking System**: All bookings (customer and staff) in one place
- **Staff Efficiency**: Staff can create bookings directly - no manual processes
- **Streamlined Operations**: Automated calendar and notification workflows
- **Availability Control**: Easy management of available dates prevents booking conflicts
- **Workload Management**: Daily service limits help balance capacity and prevent overbooking
- **Better Customer Experience**: WhatsApp-first communication approach

### Long-Term Value

- **Scalability**: Easy to add features as business grows
- **Data Ownership**: Full control over customer data and booking history
- **Customization**: Can adapt system based on changing business needs
- **Professional Image**: Custom solution demonstrates business quality

### Technical Excellence

- **Modern Architecture**: Built with latest technologies for long-term maintainability
- **Security**: Row-level security, secure authentication, data protection
- **Reliability**: Automated error handling, fallback systems, message logging
- **Performance**: Fast loading times, responsive design, efficient database queries

---

## Conclusion

By moving away from a generic, overpriced customer-only booking widget to a custom dual-use solution built specifically for EAT Cycling's needs, we created a system that:

- **Saves money** (50% cost reduction - £300/year savings)
- **Unifies booking processes** (customers AND staff can create bookings)
- **Eliminates manual work** (no more paper/spreadsheets for phone/walk-in bookings)
- **Improves efficiency** (automated workflows)
- **Controls availability** (flexible date exclusions and daily workload limits)
- **Prevents overbooking** (automatic capacity management)
- **Enhances customer experience** (WhatsApp-first approach)
- **Provides better insights** (complete booking history regardless of source)
- **Scales with the business** (easy to extend and customize)

The solution demonstrates how consultation and custom development can deliver better results than off-the-shelf solutions, especially when the business has specific workflow requirements that generic tools don't accommodate.

---

## Technical Specifications

**Hosting:** Vercel  
**Domain:** book.eatcycling.co.uk  
**Database:** Supabase (PostgreSQL)  
**Framework:** Next.js 16 (App Router)  
**Styling:** Tailwind CSS  
**Integrations:** Google Calendar API, WhatsApp Business API  
**Authentication:** Supabase Auth with fallback password login  
**Automation:** Vercel Cron Jobs (daily reminder system)

---

*This case study demonstrates the value of custom development over generic solutions when business requirements are specific and unique.*
