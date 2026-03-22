import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { User } from '../types';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_fallback_secret';

export const generateToken = (user: User): string => {
  // We only encode the user ID and role in the token, not sensitive data
  return jwt.sign(
    { id: user.id, role: user.role }, 
    JWT_SECRET, 
    { expiresIn: '10y' } // Keep it valid for a long time for the kiosk
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const generateQRCodeURI = async (data: string): Promise<string> => {
  try {
    // Generates a base64 image URI string
    return await QRCode.toDataURL(data, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    throw error;
  }
};