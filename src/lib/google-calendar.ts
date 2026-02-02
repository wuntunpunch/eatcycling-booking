import { google } from 'googleapis';
import { SERVICE_LABELS, ServiceType } from './types';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID!;

function getCalendarClient() {
  const credentials = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, 'base64').toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  return google.calendar({ version: 'v3', auth });
}

export async function createCalendarEvent({
  customerName,
  customerPhone,
  serviceType,
  date,
  bikeDetails,
}: {
  customerName: string;
  customerPhone: string;
  serviceType: ServiceType;
  date: string;
  bikeDetails: string;
}) {
  const calendar = getCalendarClient();

  const event = {
    summary: `${SERVICE_LABELS[serviceType]} - ${customerName}`,
    description: `Customer: ${customerName}
Phone: ${customerPhone}
Service: ${SERVICE_LABELS[serviceType]}

Bike Details:
${bikeDetails}`,
    start: {
      date: date, // All-day event (no specific time)
    },
    end: {
      date: date,
    },
  };

  const response = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: event,
  });

  return response.data;
}

export async function deleteCalendarEvent(eventId: string) {
  const calendar = getCalendarClient();
  
  try {
    await calendar.events.delete({
      calendarId: CALENDAR_ID,
      eventId: eventId,
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}
