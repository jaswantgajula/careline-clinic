export const SLOT_MS = 30 * 60 * 1000;
export const CUTOFF_MS = 2 * 60 * 60 * 1000;
export const HOLD_MS = 10 * 60 * 1000;
export function clinicDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function slotsFor(doctor, date, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const midnight = new Date(`${date}T00:00:00+05:30`);
  if (
    Number.isNaN(+midnight) ||
    clinicDate(midnight) !== date ||
    doctor.leave.includes(date) ||
    !doctor.days.includes(new Date(`${date}T12:00:00Z`).getUTCDay())
  )
    return [];
  const result = [];
  for (let h = doctor.start; h < doctor.end; h += 0.5) {
    if (h >= doctor.breakStart && h < doctor.breakEnd) continue;
    const time = new Date(+midnight + h * 3600000);
    if (time > now && time <= new Date(+now + 30 * 86400000)) result.push(time.toISOString());
  }
  return result;
}
export function canChange(start, now = new Date()) {
  return +new Date(start) - now >= CUTOFF_MS;
}
export function canComplete(start, now = new Date()) {
  return +now >= +new Date(start) + SLOT_MS;
}
