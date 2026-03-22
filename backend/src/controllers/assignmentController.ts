import { Request, Response } from 'express';
import { getDbConnection } from '../db/database';
import { Assignment } from '../types';
import { sendSMS } from '../services/smsService';
import { generateDailyAssignments } from '../services/cronService';

export const getDailyAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    
    const db = await getDbConnection();
    const assignments = await db.all<Assignment[]>(`
      SELECT a.id, a.chore_id, a.user_id, a.status, a.assigned_date, c.title as chore_title, c.reward_value 
      FROM assignments a
      JOIN chores c ON a.chore_id = c.id
      WHERE a.user_id = ? AND a.assigned_date = ?
    `, [userId, today]);
    
    res.status(200).json(assignments);
  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Failed to retrieve assignments' });
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const db = await getDbConnection();

  try {
    // If the adult is approving the chore, we need to pay the child
    if (status === 'approved') {
      await db.run('BEGIN TRANSACTION');

      // Get the assignment details to find the reward value and user
      const assignment = await db.get(`
        SELECT a.user_id, c.reward_value 
        FROM assignments a
        JOIN chores c ON a.chore_id = c.id
        WHERE a.id = ?
      `, [id]);

      if (!assignment) {
        await db.run('ROLLBACK');
        res.status(404).json({ error: 'Assignment not found.' });
        return;
      }

      // 1. Update status
      await db.run('UPDATE assignments SET status = ? WHERE id = ?', [status, id]);

      // 2. Add funds to user
      await db.run('UPDATE users SET current_balance = current_balance + ? WHERE id = ?', [assignment.reward_value, assignment.user_id]);

      // 3. Log transaction
      await db.run(
        'INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)',
        [assignment.user_id, assignment.reward_value, 'chore_completion']
      );

      await db.run('COMMIT');
      res.status(200).json({ message: 'Chore approved and funds added.' });
      return;
    }

    // For all other statuses (like pending, rejected, awaiting_verification)
    await db.run('UPDATE assignments SET status = ? WHERE id = ?', [status, id]);

    // If the child just finished it, ping the adult's phone
    if (status === 'awaiting_verification') {
      // Find the adult's SMS email (assuming the first adult is the primary admin)
      const admin = await db.get("SELECT sms_email FROM users WHERE role = 'adult' LIMIT 1");
      const child = await db.get("SELECT u.name, c.title FROM assignments a JOIN users u ON a.user_id = u.id JOIN chores c ON a.chore_id = c.id WHERE a.id = ?", [id]);
      
      if (admin && admin.sms_email && child) {
        // This runs asynchronously so it doesn't block the UI response
        sendSMS(admin.sms_email.replace('@vtext.com', ''), `${child.name} has completed: ${child.title}. Pending your approval.`);
      }
    }

    res.status(200).json({ message: 'Status updated successfully' });
  } catch (error) {
    // If there's an active transaction, roll it back
    try { await db.run('ROLLBACK'); } catch (e) {} 
    
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment status' });
  }
};

export const triggerDailyGeneration = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await generateDailyAssignments();
    res.status(200).json({ message: 'Daily generation triggered manually', result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate assignments' });
  }
};