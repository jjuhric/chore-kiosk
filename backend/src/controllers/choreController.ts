import { Request, Response } from 'express';
import { getDbConnection } from '../db/database';
import { Chore } from '../types';

export const getChores = async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDbConnection();
    // Join the users table so the frontend knows the name of the assigned child
    const chores = await db.all<Chore[]>(`
      SELECT c.*, u.name as target_user_name 
      FROM chores c 
      LEFT JOIN users u ON c.target_user_id = u.id
    `);
    res.status(200).json(chores);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve chores' });
  }
};

export const createChore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, type, assigned_day, reward_value, target_user_id } = req.body;
    const db = await getDbConnection();
    
    // Convert empty string or undefined to null for the database
    const childId = target_user_id ? target_user_id : null;

    const result = await db.run(
      'INSERT INTO chores (title, type, assigned_day, reward_value, target_user_id) VALUES (?, ?, ?, ?, ?)',
      [title, type, assigned_day, reward_value, childId]
    );
    
    res.status(201).json({ id: result.lastID, title, type });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chore' });
  }
};

export const deleteChore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = await getDbConnection();
    
    // 1. Delete associated assignments first to prevent SQLite Foreign Key errors
    await db.run('DELETE FROM assignments WHERE chore_id = ?', [id]);
    
    // 2. Delete the master chore
    await db.run('DELETE FROM chores WHERE id = ?', [id]);
    
    res.status(200).json({ message: 'Chore deleted successfully' });
  } catch (error) {
    console.error('Error deleting chore:', error);
    res.status(500).json({ error: 'Failed to delete chore' });
  }
};