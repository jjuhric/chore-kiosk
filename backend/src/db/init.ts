import fs from 'fs';
import path from 'path';
import { getDbConnection } from './database';
import { generateToken, generateQRCodeURI } from '../services/authService';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function initializeDB() {
  const db = await getDbConnection();

  console.log('⏳ Creating database tables...');

  // 1. Users Table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT CHECK(role IN ('adult', 'child')) NOT NULL,
      sms_email TEXT, -- e.g., 5551234567@vtext.com
      qr_secret TEXT, -- Used later for generating the QR login
      current_balance DECIMAL(10, 2) DEFAULT 0.00
    );
  `);

  // 2. Chores Table (The master list of tasks)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT CHECK(type IN ('daily', 'weekly')) NOT NULL,
      assigned_day INTEGER, -- 0=Sun, 1=Mon... 3=Wed (for weekly chores)
      reward_value DECIMAL(10, 2) NOT NULL,
      target_user_id INTEGER, -- NEW: Null = All kids, Specific ID = Just that child
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    );
  `);

  // 3. Assignments Table (The actual to-do list for the day)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chore_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('pending', 'awaiting_verification', 'approved', 'rejected')) DEFAULT 'pending',
      assigned_date DATE NOT NULL,
      FOREIGN KEY (chore_id) REFERENCES chores(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 4. Transactions Table (The financial ledger)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount DECIMAL(10, 2) NOT NULL, -- Positive for chore, negative for payout
      type TEXT CHECK(type IN ('chore_completion', 'payout')) NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  console.log('✅ Tables created successfully.');

  const userCount = await db.get('SELECT COUNT(*) as count FROM users');

  if (userCount.count === 0) {
    console.log('🌱 Reading setup configuration...');

    const seedPath = path.join(__dirname, '../../../seed.json');

    if (fs.existsSync(seedPath)) {
      const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

      // Setup Email Transporter for sending Adult Badges
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      // 1. Seed Adults & Email Badges
      for (const adult of seedData.adults) {
        const vtextEmail = `${adult.phone.replace(/\D/g, '')}@vtext.com`;

        const result = await db.run(
          `INSERT INTO users (name, role, sms_email) VALUES (?, 'adult', ?)`,
          [adult.name, vtextEmail]
        );

        const userId = result.lastID;

        console.log(`Generating badge for ${adult.name}...`);
        const token = generateToken({ id: userId!, name: adult.name, role: 'adult', current_balance: 0 });
        const qrCodeURI = await generateQRCodeURI(token);

        // Email the badge to the adult
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: adult.email,
          subject: `Kiosk Login Badge: ${adult.name}`,
          html: `<h2>Here is your Admin login badge</h2><p>Save this to your phone to scan at the kiosk.</p><img src="cid:badge" />`,
          attachments: [{ filename: 'badge.png', path: qrCodeURI, cid: 'badge' }]
        });
      }

      // 2. Seed Children
      for (const child of seedData.children) {
        await db.run(`INSERT INTO users (name, role) VALUES (?, 'child')`, [child.name]);
      }

      console.log('✅ Initial users seeded and adult badges emailed!');

      // Seed Default Chores (Optional, but good for testing)
      await db.run(`INSERT INTO chores (title, type, reward_value) VALUES ('Clean Kitchen', 'daily', 2.00)`);

    } else {
      console.log('⚠️ No seed.json found. Skipping user generation.');
    }
  } else {
    console.log('⏭️ Data already exists, skipping seed.');
  }
}

// Run the function if this script is executed directly
if (require.main === module) {
  initializeDB()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Error initializing database:', err);
      process.exit(1);
    });
}