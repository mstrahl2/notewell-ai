// src/utils/sendCancellationEmail.js
import nodemailer from 'nodemailer';

export async function sendCancellationEmail(toEmail) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: true, // true for port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"NoteWell AI" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Your Subscription Has Been Cancelled',
      html: `
        <h2>Hi there,</h2>
        <p>Your subscription has been successfully cancelled.</p>
        <p>You’ll still have access until the end of your current billing cycle.</p>
        <br/>
        <p>If you have any questions or would like to resubscribe, feel free to reach out or visit your account page.</p>
        <br/>
        <p>Thanks,<br/>The NoteWell AI Team</p>
      `,
    });

    console.log('📧 Email sent: %s', info.messageId);
    return true;
  } catch (err) {
    console.error('❌ Email sending failed:', err);
    return false;
  }
}
