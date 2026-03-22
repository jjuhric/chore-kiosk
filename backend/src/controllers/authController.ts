import { Request, Response } from 'express';
import { getDbConnection } from '../db/database';
import { User } from '../types';
import { generateToken, generateQRCodeURI, verifyToken } from '../services/authService';
import { sendSMS } from '../services/smsService';
import nodemailer from 'nodemailer'; // For sending the actual QR code via standard email

export const generateLoginQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, emailAddress } = req.body;
    const db = await getDbConnection();
    
    const user = await db.get<User>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = generateToken(user);
    const qrCodeURI = await generateQRCodeURI(token);

    // Send the QR code to the provided email address
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: emailAddress,
      subject: `Login Badge for ${user.name}`,
      html: `
        <h2>Here is the login badge for ${user.name}</h2>
        <p>Save this image or print it out to scan at the kiosk.</p>
        <img src="cid:qrcode_badge" alt="Login QR Code"/>
      `,
      attachments: [
        {
          filename: `${user.name}-badge.png`,
          path: qrCodeURI, // Nodemailer automatically parses the base64 data URI string
          cid: 'qrcode_badge' // This must exactly match the "cid:" in the image tag above
        }
      ]
    });

    res.status(200).json({ message: 'QR Code generated and emailed successfully' });
  } catch (error) {
    console.error('Error generating QR:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

export const loginWithQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    console.log(token);
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired QR code' });
      return;
    }

    const db = await getDbConnection();
    const user = await db.get<User>('SELECT id, name, role, current_balance FROM users WHERE id = ?', [decoded.id]);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ message: 'Login successful', user, token });
  } catch (error) {
    console.error('Error during QR login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};