import { connectDb } from './src/config/db.js';
import { ConcreteGrade } from './src/models/ConcreteGrade.js';

await connectDb();
await ConcreteGrade.updateOne(
  { gradeCode: 'M25' },
  { $set: { gradeCode: 'M25', description: 'Standard M25 Grade' } },
  { upsert: true }
);
console.log("M25 grade seeded.");
process.exit(0);
