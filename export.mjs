import Database from 'better-sqlite3';
import fs from 'fs';

const db = new Database('./prisma/dev.db');
const tables = [
  'Sector', 
  'JobProfile', 
  'Training', 
  'Requirement', 
  'Employee', 
  'EmployeeTrainingRecord', 
  'TrainingSession', 
  'Attendance', 
  'EffectivenessEvaluation', 
  'PendingTransfer'
];

const data = {};
for (const table of tables) {
  try {
    data[table] = db.prepare(`SELECT * FROM ${table}`).all();
  } catch (err) {
    console.error(`Error reading ${table}:`, err.message);
  }
}
fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
console.log('Exported data to data.json');
