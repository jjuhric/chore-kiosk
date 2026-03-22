import * as sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';

let dbInstance: Database | null = null;

export async function getDbConnection(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Use an in-memory database during tests, otherwise use the local file
  const dbPath = process.env.NODE_ENV === 'test' 
    ? ':memory:' 
    : path.join(__dirname, '../../database.sqlite');

  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys for SQLite
  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  return dbInstance;
}