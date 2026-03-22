import { Request, Response } from 'express';
import { getDbConnection } from '../db/database';

export const processPayout = async (req: Request, res: Response): Promise<void> => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid payout amount or user ID.' });
    return;
  }

  const db = await getDbConnection();

  try {
    await db.run('BEGIN TRANSACTION');

    // 1. Check current balance
    const user = await db.get('SELECT current_balance FROM users WHERE id = ?', [userId]);
    if (!user) {
      await db.run('ROLLBACK');
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (user.current_balance < amount) {
      await db.run('ROLLBACK');
      res.status(400).json({ error: 'Insufficient funds for this payout.' });
      return;
    }

    // 2. Deduct from balance
    await db.run('UPDATE users SET current_balance = current_balance - ? WHERE id = ?', [amount, userId]);

    // 3. Record in ledger (negative amount for payouts)
    await db.run(
      'INSERT INTO transactions (user_id, amount, type) VALUES (?, ?, ?)',
      [userId, -amount, 'payout']
    );

    await db.run('COMMIT');
    res.status(200).json({ message: 'Payout processed successfully.' });
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error processing payout:', error);
    res.status(500).json({ error: 'Failed to process payout.' });
  }
};