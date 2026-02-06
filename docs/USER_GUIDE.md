# EAT Cycling Booking System - User Guide

Welcome to the EAT Cycling booking system! This guide will help you use all the features of your booking system.

---

## Table of Contents

1. [Making a Booking](#making-a-booking)
2. [Logging Into Your Dashboard](#logging-into-your-dashboard)
3. [Managing Bookings](#managing-bookings)
4. [Finding Customers](#finding-customers)
5. [Setting Your Availability](#setting-your-availability)
6. [Service Limits](#service-limits)
7. [Sending Reminders](#sending-reminders)
8. [Common Questions](#common-questions)

---

## Making a Booking

### For Customers Booking Online

Customers can book services directly at **book.eatcycling.co.uk**.

**Step-by-step:**

1. **Select Service Type**
   - Choose from:
     - Basic service
     - Full service
     - Strip and rebuild
     - Bosch diagnostics

2. **Choose a Date**
   - Click the date picker to see available dates
   - Dates that are unavailable (weekends, holidays, or already full) are automatically hidden
   - You can drop off your bike in the morning on your selected date, or the afternoon before if that's easier

3. **Enter Customer Details**
   - **Name** (required): Customer's full name
   - **Phone Number** (required): Contact number
   - **Email** (optional): Email address
   - **Bike Details** (required): Information about the bike (make, model, any issues, etc.)

4. **Submit Booking**
   - Click "Book Service" to submit
   - Customer will receive instant confirmation with a booking reference number
   - A WhatsApp confirmation message will be sent to their phone
   - The booking will automatically appear in your Google Calendar

5. **Add to Calendar** (Optional)
   - After booking, customers can add the appointment to their own calendar
   - They can click "Add to Google Calendar" or "Download Calendar File"

### For Phone or Walk-in Bookings

When customers call or visit in person, you can create their booking using the same form:

1. Go to the booking form at **book.eatcycling.co.uk**
2. Fill in the customer's details (name, phone, email if available)
3. Select the service type and date
4. Enter bike details
5. Submit the booking

All bookings created this way will appear in your dashboard and Google Calendar automatically.

---

## Logging Into Your Dashboard

### First Time Setup

Before you can log in, you'll need an admin account created for you. Contact your system administrator to set this up.

### Logging In

1. Go to **book.eatcycling.co.uk/admin/login**

2. **Two ways to log in:**

   **Magic Link (Easiest):**
   - Enter your email address
   - Click "Send magic link"
   - Check your email and click the magic link
   - You'll be automatically logged in

   **Password Login:**
   - Click the "Password" tab
   - Enter your email and password
   - Click "Log in"

**Tip:** If you don't receive the magic link email, use password login instead.

### If You Forget Your Password

1. Go to the login page
2. Switch to "Password" login
3. Click "Forgot password?"
4. Enter your email
5. Check your email for the reset link

If you're having trouble resetting your password, contact your system administrator.

---

## Managing Bookings

### Viewing Your Bookings

1. From the dashboard, click **"Bookings"**
2. You'll see:
   - **Today's Bookings**: All bookings scheduled for today
   - **All Bookings**: Complete list of all bookings

### Finding a Specific Booking

Use the search bar at the top to search by:
- Booking reference number
- Customer name
- Phone number

### Filtering Bookings

- Toggle **"Show Completed"** to see or hide completed bookings
- Toggle **"Show Cancelled"** to see or hide cancelled bookings
- Filter by status:
  - Pending
  - Confirmed
  - In Progress
  - Ready
  - Collected

### What You Can Do With Each Booking

1. **View Details**: Click on a booking to see all information
2. **Mark as Ready**: 
   - This sends a WhatsApp message to the customer letting them know their bike is ready
   - Updates the booking status to "ready"
3. **Mark as Complete**: 
   - Marks the booking as finished
   - Moves it to completed bookings
4. **Add Notes**: 
   - Add notes about the booking (only you can see these)
   - Useful for reminders or special instructions
5. **Cancel Booking**: 
   - Cancel a booking if needed
   - You can choose to send a WhatsApp message to the customer

### Working With Multiple Bookings

1. Select multiple bookings using the checkboxes
2. Use the toolbar at the top to:
   - Mark multiple bookings as ready
   - Mark multiple bookings as complete
   - Cancel multiple bookings

### Understanding Booking Statuses

- **Pending**: New booking, just created
- **Confirmed**: Booking confirmed and scheduled
- **In Progress**: You've started working on the bike
- **Ready**: Bike is ready for collection (customer gets WhatsApp notification)
- **Collected**: Customer has picked up their bike
- **Cancelled**: Booking has been cancelled

---

## Finding Customers

### Searching for a Customer

1. From the dashboard, click **"Customers"**
2. Enter a search term:
   - Customer name (you can type part of the name)
   - Phone number (you can type part of the number)
3. Click **"Search"**

### Viewing Customer History

1. After searching, click on a customer's name
2. You'll see:
   - All their past bookings
   - What services they've had
   - When they booked
   - Booking reference numbers

### Important Note

The phone number is how the system identifies customers. If someone books with the same phone number, it will use their existing customer record.

---

## Setting Your Availability

### Blocking Days of the Week

Control which days you're available for bookings:

1. Go to **Dashboard** → **Availability**
2. **Day Exclusions:**
   - **Exclude Weekends**: Turn this on to block both Saturday and Sunday
   - **Exclude Sundays Only**: Turn this on to block just Sundays
   - Click **"Save"** when done

### Blocking Specific Dates

To block specific dates (like holidays or days you're closed):

1. Go to **Dashboard** → **Availability**
2. **Add Excluded Date:**
   - Choose **Single Date** or **Date Range**
   - Select the date(s) you want to block
   - Enter a reason (e.g., "Bank Holiday", "Closed for maintenance")
   - Click **"Add Exclusion"**

### Viewing Blocked Dates

- All blocked dates are listed below the settings
- If a date you're blocking already has bookings, you'll see a warning
- You can remove blocked dates by clicking the delete button

### Important Notes

- Blocked dates prevent new bookings on those dates
- Existing bookings on blocked dates are not affected
- If you block a date that already has bookings, you'll see a warning

---

## Service Limits

### Setting Maximum Bookings Per Day

Control how many bookings you can accept per day:

1. Go to **Dashboard** → **Service Limits**
2. **Set Maximum Services Per Day:**
   - Enter a number (e.g., "5" for 5 bookings per day)
   - Or leave empty for unlimited bookings
   - Click **"Save Limit"**

### Viewing Your Booking Calendar

The calendar shows:
- **Red dates**: Already full (cannot accept more bookings)
- **White dates**: Available for booking
- **Blue ring**: Today's date
- **Numbers**: Current bookings / maximum allowed (e.g., "3/5" means 3 out of 5 slots filled)

### How It Works

- When a date reaches the maximum, it's automatically blocked from new bookings
- Existing bookings are not affected when you change the limit
- If you set a limit lower than existing bookings, you'll see a warning

---

## Sending Reminders

### Viewing Customers Due for Reminders

1. Go to **Dashboard** → **Reminders**
2. Click the **"Due Reminders"** tab
3. You'll see customers who are due for 6-month service reminders

### Sending a Reminder

1. Review the list of due reminders
2. Click **"Send Reminder"** next to a customer
3. A WhatsApp message will be sent automatically
4. The reminder will move to the "Sent History" tab

### Viewing Reminder History

- **Sent History**: Shows all successfully sent reminders
- **Failed**: Shows reminders that didn't send (with error details)
- **Statistics**: View reminder stats including:
  - Total sent (this month)
  - Success rate
  - Estimated cost

### How Reminders Work

- Reminders are automatically calculated based on completed bookings
- A customer becomes "due" 6 months after their last completed service
- You can manually send reminders from the dashboard
- Failed reminders can be retried

---

## Common Questions

### I can't log in

- **Can't receive magic link email?** Use password login instead
- **Forgot password?** Use the "Forgot password?" link, or contact your system administrator
- **Session expired?** Just log in again - sessions sometimes time out

### A date isn't showing in the booking form

- Check if the date is blocked in your Availability settings
- Check if the date is already full (check Service Limits)
- The date might be in the past or more than 6 months away

### Booking not in Google Calendar

- Calendar integration may take a few moments
- Check that the booking was created successfully in your dashboard
- Calendar errors don't prevent booking creation

### WhatsApp notification not sent

- Check that the phone number is correct
- Notifications are sent when you mark a booking as "ready"
- If it still doesn't work, contact your system administrator

### Can't see bookings in dashboard

- Check the "Show Completed" and "Show Cancelled" filters
- Try refreshing the page
- Make sure you're logged in

### Changes not saving

- Refresh the page and try again
- Some changes may take a moment to save
- Make sure you're logged in

### General Tips

- **Always use the same phone number** for a customer - it's how the system identifies them
- **Check availability settings** if customers say dates aren't showing
- **Use the search function** to quickly find bookings or customers
- **Bookings are automatically added to Google Calendar** - no need to add them manually
- **WhatsApp notifications** are sent automatically when you mark bookings as "ready"

---

## Quick Reference

### Website Addresses
- **Booking Form**: `book.eatcycling.co.uk`
- **Admin Login**: `book.eatcycling.co.uk/admin/login`
- **Admin Dashboard**: `book.eatcycling.co.uk/admin`

### Service Types
1. Basic service
2. Full service
3. Strip and rebuild
4. Bosch diagnostics

### Booking Status Flow
```
Pending → Confirmed → In Progress → Ready → Collected
                                    ↓
                                Cancelled
```

### Key Features
- ✅ Automatic Google Calendar integration
- ✅ WhatsApp confirmation messages
- ✅ WhatsApp "bike ready" notifications
- ✅ 6-month service reminders
- ✅ Smart date availability checking
- ✅ Customer history tracking
- ✅ Booking reference numbers

---

**Need Help?**

If you encounter any issues not covered in this guide, contact your system administrator.

---

**Last Updated:** February 2026
