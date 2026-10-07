import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Doctor } from './models/index.js';
if (
  !process.env.MONGODB_URI ||
  !process.env.SEED_ADMIN_PASSWORD ||
  !process.env.SEED_DOCTOR_PASSWORD
)
  throw new Error('Set MONGODB_URI, SEED_ADMIN_PASSWORD and SEED_DOCTOR_PASSWORD in backend/.env.');
if (Math.min(process.env.SEED_ADMIN_PASSWORD.length, process.env.SEED_DOCTOR_PASSWORD.length) < 10)
  throw new Error('Seed passwords must contain at least ten characters.');
await mongoose.connect(process.env.MONGODB_URI);
await User.updateOne(
  { email: 'admin@careline.test' },
  {
    $setOnInsert: {
      name: 'Clinic Administrator',
      password: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12),
      role: 'admin',
    },
  },
  { upsert: true },
);
const data = [
  ['Ananya Sharma', 'General Physician', 'MBBS, MD · Internal Medicine', 12, 600, 'AS', 'blue'],
  ['Rohan Mehta', 'Cardiology', 'MBBS, MD, DM · Cardiology', 15, 1000, 'RM', 'rose'],
  ['Priya Nair', 'Dermatology', 'MBBS, MD · Dermatology', 9, 800, 'PN', 'violet'],
  ['Arjun Rao', 'Orthopedics', 'MBBS, MS · Orthopedics', 11, 900, 'AR', 'amber'],
  ['Meera Iyer', 'Pediatrics', 'MBBS, MD · Pediatrics', 14, 700, 'MI', 'teal'],
  ['Kabir Khan', 'ENT', 'MBBS, MS · ENT', 8, 700, 'KK', 'blue'],
];
for (const [name, specialty, qualification, experience, fee, initials, color] of data) {
  const email = `${name.split(' ')[0].toLowerCase()}@careline.test`;
  let u = await User.findOne({ email });
  if (!u)
    u = await User.create({
      name: `Dr. ${name}`,
      email,
      password: await bcrypt.hash(process.env.SEED_DOCTOR_PASSWORD, 12),
      role: 'doctor',
    });
  await Doctor.updateOne(
    { user: u._id },
    {
      $setOnInsert: {
        user: u._id,
        name: `Dr. ${name}`,
        specialty,
        qualification,
        experience,
        fee,
        initials,
        color,
        bio: `A thoughtful, patient-first approach to ${specialty.toLowerCase()}, with ${experience} years of clinical experience.`,
      },
    },
    { upsert: true },
  );
}
console.log('Seed complete. Fictional clinic profiles created; existing records preserved.');
await mongoose.disconnect();
