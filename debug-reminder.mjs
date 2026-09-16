import mongoose from 'mongoose';
import { config } from 'dotenv';
config();

const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gharplot');
const Reminder = (await import('./models/reminderSchema.js')).default;

const now = new Date();
console.log('NOW (UTC):', now.toISOString());

const recent = await Reminder.findOne({isActive: true, status: 'pending'}).sort({createdAt: -1}).populate('employeeId','name email');
if (recent) {
  console.log('\n--- MOST RECENT PENDING REMINDER ---');
  console.log('Title:', recent.title);
  console.log('status:', recent.status);
  console.log('isActive:', recent.isActive);
  console.log('reminderDateTime (raw):', recent.reminderDateTime);
  console.log('reminderDateTime (ISO):', recent.reminderDateTime?.toISOString());
  console.log('lastTriggered:', recent.lastTriggered);
  console.log('now >= reminderDateTime:', now >= recent.reminderDateTime);
  console.log('!lastTriggered:', !recent.lastTriggered);
  console.log('shouldTrigger would be:', now >= recent.reminderDateTime && !recent.lastTriggered);
  console.log('employeeId populated:', recent.employeeId ? `${recent.employeeId.name} (${recent.employeeId._id})` : 'NULL - POPULATE FAILED');
  console.log('createdAt:', recent.createdAt?.toISOString());
}

// Show ALL pending reminders that are due
const due = await Reminder.find({
  isActive: true,
  status: 'pending',
  reminderDateTime: { $lte: now }
}).select('title reminderDateTime lastTriggered').sort({createdAt:-1}).limit(5);

console.log(`\n--- DUE PENDING REMINDERS (${due.length} found) ---`);
due.forEach(r => {
  const lastTrig = r.lastTriggered ? new Date(r.lastTriggered) : null;
  const sched = new Date(r.reminderDateTime);
  const wouldTrigger = !lastTrig || lastTrig < sched;
  console.log(`  "${r.title}" | scheduled: ${r.reminderDateTime?.toISOString()} | lastTriggered: ${r.lastTriggered?.toISOString() || 'NULL'} | wouldTrigger: ${wouldTrigger}`);
});

await mongoose.disconnect();
