import cron from 'node-cron';
import { getDbConnection } from '../db/database';
import { User, Chore } from '../types';

// Extract the logic into an exported function so the API can use it
export const generateDailyAssignments = async () => {
  console.log('⏳ Running chore assignment generation...');
  try {
    const db = await getDbConnection();
    const today = new Date();
    
    // Adjust for your local timezone if needed, but ISO string works for a generic date stamp
    const dateString = today.toISOString().split('T')[0]; 
    const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const children = await db.all<User[]>('SELECT id FROM users WHERE role = ?', ['child']);
    const chores = await db.all<Chore[]>('SELECT * FROM chores');

    let addedCount = 0;

    for (const child of children) {
      for (const chore of chores) {

        // --- NEW: Skip if this chore is assigned to a different specific child ---
        if (chore.target_user_id !== null && chore.target_user_id !== child.id) {
          continue; 
        }

        let shouldAssign = false;

        if (chore.type === 'daily') {
          shouldAssign = true;
        } else if (chore.type === 'weekly' && chore.assigned_day === currentDayOfWeek) {
          shouldAssign = true;
        }

        if (shouldAssign) {
          // Check if it already exists to prevent duplicates
          const existing = await db.get(
            'SELECT id FROM assignments WHERE user_id = ? AND chore_id = ? AND assigned_date = ?',
            [child.id, chore.id, dateString]
          );

          if (!existing) {
            await db.run(
              'INSERT INTO assignments (chore_id, user_id, assigned_date, status) VALUES (?, ?, ?, ?)',
              [chore.id, child.id, dateString, 'pending']
            );
            addedCount++;
          }
        }
      }
    }
    console.log(`✅ Daily chores generated. Added ${addedCount} new assignments.`);
    return { success: true, addedCount };
  } catch (error) {
    console.error('❌ Error generating assignments:', error);
    throw error;
  }
};

export const startCronJobs = () => {
  // Run at 00:01 AM every day
  cron.schedule('1 0 * * *', () => {
    generateDailyAssignments().catch(console.error);
  });
};