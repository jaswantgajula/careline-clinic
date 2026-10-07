export const doctors = [
  ['Ananya Sharma', 'General Physician', 'MBBS, MD · Internal Medicine', 12, 600, 'AS', 'blue'],
  ['Rohan Mehta', 'Cardiology', 'MBBS, MD, DM · Cardiology', 15, 1000, 'RM', 'rose'],
  ['Priya Nair', 'Dermatology', 'MBBS, MD · Dermatology', 9, 800, 'PN', 'violet'],
  ['Arjun Rao', 'Orthopedics', 'MBBS, MS · Orthopedics', 11, 900, 'AR', 'amber'],
  ['Meera Iyer', 'Pediatrics', 'MBBS, MD · Pediatrics', 14, 700, 'MI', 'teal'],
  ['Kabir Khan', 'ENT', 'MBBS, MS · ENT', 8, 700, 'KK', 'blue'],
].map(([name, specialty, qualification, experience, fee, initials, color], i) => ({
  _id: `demo-${i}`,
  name: `Dr. ${name}`,
  specialty,
  qualification,
  experience,
  fee,
  initials,
  color,
  active: true,
  days: [1, 2, 3, 4, 5, 6],
  start: 9,
  end: 17,
  breakStart: 13,
  breakEnd: 14,
  leave: [],
  bio: `A thoughtful, patient-first approach to ${specialty.toLowerCase()}. With ${experience} years of experience, Dr. ${name.split(' ').at(-1)} focuses on listening carefully and helping you understand the next steps in your care.`,
}));
export const dateKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
export function daysAhead(n) {
  return dateKey(new Date(Date.now() + n * 86400000));
}
export function demoSlots(d, date, bookings = []) {
  if (d.leave.includes(date) || !d.days.includes(new Date(`${date}T12:00Z`).getUTCDay())) return [];
  const result = [];
  for (let h = d.start; h < d.end; h += 0.5) {
    const start = new Date(+new Date(`${date}T00:00:00+05:30`) + h * 3600000).toISOString();
    if ((h >= d.breakStart && h < d.breakEnd) || new Date(start) < new Date()) continue;
    if (
      !bookings.some((a) => a.doctor._id === d._id && a.start === start && a.status === 'confirmed')
    )
      result.push(start);
  }
  return result;
}
export function initialBookings() {
  let next = 1;
  while (new Date(`${daysAhead(next)}T12:00Z`).getUTCDay() === 0) next++;
  return [
    {
      _id: 'CL-2048',
      doctor: doctors[0],
      patient: { name: 'Alex Morgan', email: 'alex@example.test' },
      start: new Date(`${daysAhead(next)}T10:00:00+05:30`).toISOString(),
      reason: 'Routine consultation',
      fee: 600,
      status: 'confirmed',
      payment: { status: 'paid', amount: 60000 },
    },
    {
      _id: 'CL-1982',
      doctor: doctors[2],
      patient: { name: 'Alex Morgan', email: 'alex@example.test' },
      start: new Date(Date.now() - 7 * 86400000).toISOString(),
      reason: 'Follow-up consultation',
      fee: 800,
      status: 'completed',
      payment: { status: 'paid', amount: 80000 },
    },
  ];
}
export const demoUser = {
  id: 'demo-patient',
  name: 'Alex Morgan',
  email: 'alex@example.test',
  role: 'patient',
};
