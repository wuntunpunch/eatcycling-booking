import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminderFailureAlert(
  customerId: string,
  customerName: string,
  customerPhone: string,
  failureCount: number,
  errorMessage: string,
  bookingId?: string
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not configured, skipping email alert');
    return;
  }

  try {
    await resend.emails.send({
      from: 'EAT Cycling <noreply@eatcycling.co.uk>',
      to: adminEmail,
      subject: `Reminder Failure Alert - ${customerName}`,
      html: `
        <h2>Reminder Send Failure</h2>
        <p>A 6-month service reminder failed to send after ${failureCount} consecutive attempts.</p>
        
        <h3>Customer Details</h3>
        <ul>
          <li><strong>Name:</strong> ${customerName}</li>
          <li><strong>Phone:</strong> ${customerPhone}</li>
          <li><strong>Customer ID:</strong> ${customerId}</li>
          ${bookingId ? `<li><strong>Booking ID:</strong> ${bookingId}</li>` : ''}
        </ul>
        
        <h3>Error Details</h3>
        <pre>${errorMessage}</pre>
        
        <p>Please check the admin dashboard for more details and consider manual retry.</p>
      `,
    });
    console.log('Failure alert email sent to', adminEmail);
  } catch (error) {
    console.error('Failed to send failure alert email:', error);
  }
}

export async function sendCronFailureAlert(errorMessage: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not configured, skipping email alert');
    return;
  }

  try {
    await resend.emails.send({
      from: 'EAT Cycling <noreply@eatcycling.co.uk>',
      to: adminEmail,
      subject: 'Cron Job Failure - Reminder System',
      html: `
        <h2>Cron Job Failure</h2>
        <p>The daily reminder cron job encountered an error.</p>
        
        <h3>Error Details</h3>
        <pre>${errorMessage}</pre>
        
        <p>Please check the server logs and database for more details.</p>
      `,
    });
    console.log('Cron failure alert email sent to', adminEmail);
  } catch (error) {
    console.error('Failed to send cron failure alert email:', error);
  }
}
