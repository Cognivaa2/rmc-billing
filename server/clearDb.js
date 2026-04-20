import mongoose from 'mongoose';
import { connectDb } from './src/config/db.js';

async function clear() {
  await connectDb();
  await mongoose.connection.dropDatabase();
  console.log('Database dropped successfully');
  process.exit(0);
}

clear().catch(e => {
  console.error(e);
  process.exit(1);
});
