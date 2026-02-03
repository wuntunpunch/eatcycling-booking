import { SERVICE_LABELS, ServiceType } from './types';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_API_TOKEN;

  if (!phoneNumberId || !accessToken) {
    const missing = [];
    if (!phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!accessToken) missing.push('WHATSAPP_API_TOKEN');
    throw new Error(`Missing WhatsApp environment variables: ${missing.join(', ')}`);
  }

  return {
    phoneNumberId,
    accessToken,
  };
}

function formatPhoneNumber(phone: string): string {
  // Format phone number (remove spaces, ensure country code)
  let formattedPhone = phone.replace(/[\s-]/g, '');

  // If UK number starting with 0, replace with 44
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '44' + formattedPhone.slice(1);
  }

  // Remove any + prefix
  formattedPhone = formattedPhone.replace(/^\+/, '');

  // Ensure it starts with country code (add + for E.164 format)
  if (!formattedPhone.startsWith('+')) {
    formattedPhone = '+' + formattedPhone;
  }

  return formattedPhone;
}

async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  parameters: string[]
) {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  const formattedPhone = formatPhoneNumber(to);

  const body = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: 'body',
          parameters: parameters.map((param) => ({
            type: 'text',
            text: param,
          })),
        },
      ],
    },
  };

  console.log('Sending WhatsApp template message:', {
    to: formattedPhone,
    templateName,
    parameters: parameters.length,
  });

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('WhatsApp API error:', {
      status: response.status,
      statusText: response.statusText,
      error: responseData,
      phoneNumber: formattedPhone,
      requestBody: body,
    });
    throw new Error(`WhatsApp API error (${response.status}): ${JSON.stringify(responseData)}`);
  }

  // Log full response to debug delivery issues
  console.log('WhatsApp API response:', JSON.stringify(responseData, null, 2));
  
  // Check if message was actually accepted
  if (responseData.messages && responseData.messages[0]) {
    const messageStatus = responseData.messages[0];
    console.log('Message status:', {
      id: messageStatus.id,
      status: messageStatus.message_status,
      recipient: formattedPhone,
    });
    
    // Warn if message status indicates potential issues
    if (messageStatus.message_status && messageStatus.message_status !== 'accepted') {
      console.warn('WhatsApp message may not be delivered. Status:', messageStatus.message_status);
    }
  }

  return responseData;
}

async function sendWhatsAppMessage(to: string, message: string) {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  const formattedPhone = formatPhoneNumber(to);

  console.log('Sending WhatsApp free-form message:', {
    to: formattedPhone,
    phoneNumberId,
    messageLength: message.length,
  });

  const response = await fetch(
    `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message,
        },
      }),
    }
  );

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('WhatsApp API error:', {
      status: response.status,
      statusText: response.statusText,
      error: responseData,
      phoneNumber: formattedPhone,
    });
    
    // Check if it's a template required error
    const errorCode = responseData?.error?.code;
    const errorMessage = responseData?.error?.message || '';
    
    if (errorCode === 131047 || errorMessage.includes('template') || errorMessage.includes('24 hour')) {
      throw new Error(
        `WhatsApp requires a template message for outbound messages. ` +
        `Error: ${JSON.stringify(responseData)}`
      );
    }
    
    throw new Error(`WhatsApp API error (${response.status}): ${JSON.stringify(responseData)}`);
  }

  // Log full response to debug delivery issues
  console.log('WhatsApp API response:', JSON.stringify(responseData, null, 2));
  
  // Check if message was actually accepted
  if (responseData.messages && responseData.messages[0]) {
    const messageStatus = responseData.messages[0];
    console.log('Message status:', {
      id: messageStatus.id,
      status: messageStatus.message_status,
      recipient: formattedPhone,
    });
    
    // Warn if message status indicates potential issues
    if (messageStatus.message_status && messageStatus.message_status !== 'accepted') {
      console.warn('WhatsApp message may not be delivered. Status:', messageStatus.message_status);
    }
  }

  return responseData;
}

export async function sendBookingConfirmation({
  customerName,
  customerPhone,
  serviceType,
  date,
  referenceNumber,
}: {
  customerName: string;
  customerPhone: string;
  serviceType: ServiceType;
  date: string;
  referenceNumber?: string;
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Format reference number for display
  const referenceText = referenceNumber ? `🔖 Ref: ${referenceNumber}` : '';

  // Check if template is configured
  const templateName = process.env.WHATSAPP_BOOKING_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (templateName) {
    // Use template message (required for outbound messages)
    // Template should have placeholders like: {{1}} for name, {{2}} for date, {{3}} for service, {{4}} for reference
    try {
      const templateParams = referenceNumber
        ? [customerName, formattedDate, SERVICE_LABELS[serviceType], referenceNumber]
        : [customerName, formattedDate, SERVICE_LABELS[serviceType]];
      
      return await sendWhatsAppTemplateMessage(
        customerPhone,
        templateName,
        templateLanguage,
        templateParams
      );
    } catch (error) {
      // If template fails (e.g., not approved, wrong name/language), fall back to free-form message
      console.warn('Template message failed, falling back to free-form message:', error);
      const message = `Hi ${customerName}! 🚴

Your booking with EAT Cycling has been confirmed:

📅 ${formattedDate}
🔧 ${SERVICE_LABELS[serviceType]}
${referenceText ? `${referenceText}\n` : ''}
Please drop your bike off on the date above or the afternoon before if that's easier.

We'll be in touch if we need any more details. See you soon!

- Eddie, EAT Cycling`;

      return sendWhatsAppMessage(customerPhone, message);
    }
  } else {
    // Try free-form message (only works within 24-hour window)
    const message = `Hi ${customerName}! 🚴

Your booking with EAT Cycling has been confirmed:

📅 ${formattedDate}
🔧 ${SERVICE_LABELS[serviceType]}
${referenceText ? `${referenceText}\n` : ''}
Please drop your bike off on the date above or the afternoon before if that's easier.

We'll be in touch if we need any more details. See you soon!

- Eddie, EAT Cycling`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}

export async function sendBikeReadyNotification({
  customerName,
  customerPhone,
  serviceType,
}: {
  customerName: string;
  customerPhone: string;
  serviceType: ServiceType;
}) {
  // Check if template is configured
  const templateName = process.env.WHATSAPP_READY_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (templateName) {
    // Use template message (required for outbound messages)
    // Template should have placeholders like: {{1}} for name, {{2}} for service
    return sendWhatsAppTemplateMessage(
      customerPhone,
      templateName,
      templateLanguage,
      [customerName, SERVICE_LABELS[serviceType]]
    );
  } else {
    // Try free-form message (only works within 24-hour window)
    const message = `Hi ${customerName}! 🎉

Great news - your bike is ready for collection!

🔧 ${SERVICE_LABELS[serviceType]} - Complete ✅

Pop by whenever suits you to pick it up.

- Eddie, EAT Cycling`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}

export async function sendCancellationNotification({
  customerName,
  customerPhone,
  serviceType,
  date,
  referenceNumber,
}: {
  customerName: string;
  customerPhone: string;
  serviceType: ServiceType;
  date: string;
  referenceNumber?: string;
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const referenceText = referenceNumber ? `🔖 Ref: ${referenceNumber}` : '';
  
  // Generate rebooking link (pre-filled with customer name/phone)
  const rebookingUrl = `${process.env.BOOKING_FORM_URL || 'https://book.eatcycling.co.uk'}?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(customerPhone)}`;

  // Check if template is configured
  const templateName = process.env.WHATSAPP_CANCELLATION_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (templateName) {
    // Use template message (required for outbound messages)
    // Template should have placeholders: {{1}} name, {{2}} date, {{3}} service, {{4}} reference (optional), {{5}} rebooking link
    try {
      const templateParams = referenceNumber
        ? [customerName, formattedDate, SERVICE_LABELS[serviceType], referenceNumber, rebookingUrl]
        : [customerName, formattedDate, SERVICE_LABELS[serviceType], rebookingUrl];
      
      return await sendWhatsAppTemplateMessage(
        customerPhone,
        templateName,
        templateLanguage,
        templateParams
      );
    } catch (error) {
      // Fallback to free-form message
      console.warn('Template message failed, falling back to free-form message:', error);
      const message = `Hi ${customerName}! 👋

Your booking with EAT Cycling has been cancelled:

📅 ${formattedDate}
🔧 ${SERVICE_LABELS[serviceType]}
${referenceText ? `${referenceText}\n` : ''}
Need to rebook? Use this link:
${rebookingUrl}

If you have any questions, please get in touch!

- Eddie, EAT Cycling`;

      return sendWhatsAppMessage(customerPhone, message);
    }
  } else {
    // Free-form message (only works within 24-hour window)
    const message = `Hi ${customerName}! 👋

Your booking with EAT Cycling has been cancelled:

📅 ${formattedDate}
🔧 ${SERVICE_LABELS[serviceType]}
${referenceText ? `${referenceText}\n` : ''}
Need to rebook? Use this link:
${rebookingUrl}

If you have any questions, please get in touch!

- Eddie, EAT Cycling`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}

export async function sendServiceReminder({
  customerName,
  customerPhone,
  completedDate,
  serviceTypes,
  bookingLink,
}: {
  customerName: string;
  customerPhone: string;
  completedDate: string; // ISO date string
  serviceTypes: ServiceType[];
  bookingLink?: string;
}) {
  const formattedDate = new Date(completedDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Format service types - if multiple, join them
  const serviceLabels = serviceTypes.map((st) => SERVICE_LABELS[st]);
  const servicesText = serviceLabels.length > 1 
    ? serviceLabels.join(', ')
    : serviceLabels[0];

  // Generate booking link if not provided
  const bookingUrl = bookingLink || 
    `${process.env.BOOKING_FORM_URL || 'https://book.eatcycling.co.uk'}?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(customerPhone)}`;

  // Generate opt-out link
  const optOutUrl = `${process.env.BOOKING_FORM_URL || 'https://book.eatcycling.co.uk'}/opt-out?phone=${encodeURIComponent(customerPhone)}`;

  // Check if template is configured
  const templateName = process.env.WHATSAPP_REMINDER_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (templateName) {
    // Use template message (required for outbound messages)
    // Template should have placeholders like: {{1}} for name, {{2}} for date, {{3}} for services, {{4}} for booking link, {{5}} for opt-out link
    return sendWhatsAppTemplateMessage(
      customerPhone,
      templateName,
      templateLanguage,
      [customerName, formattedDate, servicesText, bookingUrl, optOutUrl]
    );
  } else {
    // Fallback message (only works within 24-hour window)
    const message = `Hi ${customerName}! 🚴

It's been 6 months since your last service with EAT Cycling.

Last service: ${formattedDate}
Service: ${servicesText}

Time for your next service? Book online:
${bookingUrl}

Don't want reminders? Opt out here:
${optOutUrl}

- Eddie, EAT Cycling`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 1) {
    return 'today';
  } else if (diffDays === 1) {
    return '1 day ago';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 14) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} weeks ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
}

export async function sendCollectionReminder({
  customerName,
  customerPhone,
  readyDate,
  serviceType,
  referenceNumber,
}: {
  customerName: string;
  customerPhone: string;
  readyDate: string; // ISO date string
  serviceType: ServiceType;
  referenceNumber?: string;
}) {
  const relativeDate = formatRelativeDate(readyDate);
  const absoluteDate = new Date(readyDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const serviceLabel = SERVICE_LABELS[serviceType];
  const referenceText = referenceNumber ? `\n🔖 Ref: ${referenceNumber}` : '';
  
  // Combine date: relative date (absolute date)
  const combinedDate = `${relativeDate} (${absoluteDate})`;
  
  // Combine service and reference into one parameter
  const serviceAndReference = referenceNumber 
    ? `🔧 ${serviceLabel}\n🔖 Ref: ${referenceNumber}`
    : `🔧 ${serviceLabel}`;

  // Check if template is configured
  const templateName = process.env.WHATSAPP_COLLECTION_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

  if (templateName) {
    // Use template message (required for outbound messages)
    // Template should have placeholders: {{1}} name, {{2}} combined date, {{3}} service and reference
    try {
      const templateParams = [customerName, combinedDate, serviceAndReference];
      
      return await sendWhatsAppTemplateMessage(
        customerPhone,
        templateName,
        templateLanguage,
        templateParams
      );
    } catch (error) {
      // Fallback to free-form message
      console.warn('Template message failed, falling back to free-form message:', error);
      const message = `Hi ${customerName}! 🚴

Your bike has been ready for collection since ${relativeDate} (${absoluteDate}). Please collect at your earliest convenience from EAT Cycling.

🔧 ${serviceLabel}${referenceText}

- Eddie, EAT Cycling`;

      return sendWhatsAppMessage(customerPhone, message);
    }
  } else {
    // Free-form message (only works within 24-hour window)
    const message = `Hi ${customerName}! 🚴

Your bike has been ready for collection since ${relativeDate} (${absoluteDate}). Please collect at your earliest convenience from EAT Cycling.

🔧 ${serviceLabel}${referenceText}

- Eddie, EAT Cycling`;

    return sendWhatsAppMessage(customerPhone, message);
  }
}
