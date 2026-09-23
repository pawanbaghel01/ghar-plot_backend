import dotenv from 'dotenv';
import mongoose from 'mongoose';
import WorkStatus from '../models/workStatusSchema.js';

dotenv.config();

mongoose.connect(process.env.MONGO_CONN).then(async () => {
  const count = await WorkStatus.countDocuments();
  console.log('Total WorkStatus in DB:', count);
  const sampleWithData = await WorkStatus.findOne({ today: { $ne: '' } }).lean();
  console.log('Sample record with content:', sampleWithData);
  const sampleToday = await WorkStatus.find({ dateStr: '22-09-2026' }).limit(5).lean();
  console.log('Sample for 22-09-2026:', sampleToday.map(s => ({ project: s.projectName, client: s.clientName, date: s.dateStr, createdBy: s.createdBy })));
  process.exit(0);
});
