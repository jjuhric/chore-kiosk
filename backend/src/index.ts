import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getDbConnection } from './db/database';
import userRoutes from './routes/userRoutes';
import choreRoutes from './routes/choreRoutes';   
import assignmentRoutes from './routes/assignmentRoutes';
import { startCronJobs } from './services/cronService';
import authRoutes from './routes/authRoutes';
import transactionRoutes from './routes/transactionRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/api/users', userRoutes);
app.use('/api/chores', choreRoutes);                        
app.use('/api/assignments', assignmentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);        

async function startServer() {
  try {
    const db = await getDbConnection();
    console.log('✅ Connected to SQLite database');
    
    startCronJobs();                                        
    console.log('🕰️ Cron jobs scheduled');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();