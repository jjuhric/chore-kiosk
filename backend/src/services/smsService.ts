import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail', // Change if using Outlook, Yahoo, etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendSMS = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    // Strip any non-numeric characters from the phone number just to be safe
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.length !== 10) {
      throw new Error('Phone number must be exactly 10 digits.');
    }

    const vtextEmail = `${cleanNumber}@vtext.com`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: vtextEmail,
      subject: '', // SMS gateways usually drop the subject, keep it empty
      text: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📱 SMS sent successfully to ${cleanNumber}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send SMS:', error);
    return false;
  }
};