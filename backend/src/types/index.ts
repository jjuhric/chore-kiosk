export interface User {
  id: number;
  name: string;
  role: 'adult' | 'child';
  sms_email?: string;
  qr_secret?: string;
  current_balance: number;
}

export interface Chore {
  id: number;
  title: string;
  type: 'daily' | 'weekly';
  assigned_day?: number; 
  reward_value: number;
  target_user_id?: number | null; // <-- NEW
  target_user_name?: string;      // <-- NEW (Joined from DB for the frontend)
}

export interface Assignment {
  id: number;
  chore_id: number;
  user_id: number;
  status: 'pending' | 'awaiting_verification' | 'approved' | 'rejected';
  assigned_date: string;
  chore_title?: string; // Joined from Chores table
  reward_value?: number; // Joined from Chores table
}