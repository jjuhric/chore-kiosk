import { Request, Response } from 'express';
import { getDbConnection } from '../db/database';
import { User } from '../types';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDbConnection();
    // Exclude qr_secret from the general fetch for security
    const users = await db.all<User[]>('SELECT id, name, role, sms_email, current_balance FROM users');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDbConnection();
    const { id } = req.params;
    const user = await db.get<User>('SELECT id, name, role, sms_email, current_balance FROM users WHERE id = ?', [id]);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(`Error fetching user ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
};