import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { User } from './models/User.js';
import { Client } from './models/Client.js';
import { Site } from './models/Site.js';
import { ConcreteGrade } from './models/ConcreteGrade.js';
import { logger } from './utils/logger.js';

const DEFAULT_PASSWORD = 'ChangeMe@123';

const userPlan = [
  { name: 'L1 Admin', email: 'admin@rmc.local', level: 1 },
  { name: 'L2 Alice', email: 'l2a@rmc.local', level: 2 },
  { name: 'L2 Bob', email: 'l2b@rmc.local', level: 2 },
  { name: 'L3 Carol', email: 'l3a@rmc.local', level: 3 },
  { name: 'L3 Dan', email: 'l3b@rmc.local', level: 3 },
  { name: 'L3 Eva', email: 'l3c@rmc.local', level: 3 },
  { name: 'L4 Frank', email: 'l4a@rmc.local', level: 4 },
  { name: 'L4 Gina', email: 'l4b@rmc.local', level: 4 },
  { name: 'L4 Hari', email: 'l4c@rmc.local', level: 4 },
];

const grades = [
  { gradeCode: 'M10', description: 'Plain concrete — non-structural' },
  { gradeCode: 'M15', description: 'Paving, footings' },
  { gradeCode: 'M20', description: 'General RCC works' },
  { gradeCode: 'M25', description: 'Slabs, beams, columns' },
  { gradeCode: 'M30', description: 'Heavy RCC works' },
  { gradeCode: 'M35', description: 'High strength works' },
  { gradeCode: 'M40', description: 'High-rise columns, pre-stressed' },
];

async function run() {
  await connectDb();
  logger.info('Seeding…');

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  for (const u of userPlan) {
    await User.updateOne(
      { email: u.email },
      { $setOnInsert: { ...u, passwordHash: hash, status: 'active' } },
      { upsert: true },
    );
  }

  for (const g of grades) {
    await ConcreteGrade.updateOne(
      { gradeCode: g.gradeCode },
      { $setOnInsert: g },
      { upsert: true },
    );
  }

  // Clients — insert if missing (never delete)
  const l3 = await User.findOne({ email: 'l3a@rmc.local' });
  const clientsToSeed = [
    {
      clientName: 'Acme Constructions Pvt Ltd',
      officeAddress: 'Plot 14, Sector 21, Gurugram',
      contactNumber: '9000000001',
      email: 'ops@acme.test',
      taxInformation: { gstin: '06ABCDE1234F1Z5', pan: 'ABCDE1234F' },
      kycStatus: 'verified',
      creditStatus: 'good',
      createdByLevel3: l3?._id,
    },
    {
      clientName: 'Everest Infra LLP',
      officeAddress: '11/B Trinity Towers, Pune',
      contactNumber: '9000000002',
      email: 'procurement@everestinfra.test',
      taxInformation: { gstin: '27PQRST9876K1Z9', pan: 'PQRST9876K' },
      kycStatus: 'submitted',
      creditStatus: 'good',
      createdByLevel3: l3?._id,
    },
  ];

  for (const c of clientsToSeed) {
    const existing = await Client.findOne({ clientName: c.clientName });
    if (!existing) {
      const created = await Client.create(c);
      await Site.create({
        client: created._id,
        siteName: `${c.clientName.split(' ')[0]} — Main Site`,
        siteAddress: c.officeAddress,
        contactPerson: 'Site Engineer',
        contactNumber: c.contactNumber,
      });
    }
  }


  logger.info('Seed complete.');
  logger.info(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  logger.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
