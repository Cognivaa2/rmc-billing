import { connectDb } from './src/config/db.js';
import { ConcreteGrade } from './src/models/ConcreteGrade.js';

await connectDb();
const grades = await ConcreteGrade.find({});
console.log(grades.map(g => g.gradeCode));
process.exit(0);
