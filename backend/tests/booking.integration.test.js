import { test, before, after, beforeEach } from 'node:test';
import app from '../app.js';
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import {
  Doctor,
  Appointment,
  Payment,
  Claim,
  User,
  Notification,
  AuditEvent,
  WaitlistEntry,
  RecommendationFeedback,
} from '../models/index.js';
import {
  reserve,
  reschedule,
  cancel,
  capturedPayment,
  releaseExpired,
} from '../services/booking.service.js';
import { clinicDate } from '../services/policies.js';
import { findOrCreateGoogleUser } from '../services/googleAuth.service.js';
import { expireWaitlistOffers } from '../services/experience.service.js';
let replica, doctor, patient, other, server, base;
const at = (hour, days = 2) =>
  `${clinicDate(new Date(Date.now() + days * 86400000))}T${hour}:00:00+05:30`;
before(async () => {
  process.env.JWT_SECRET = 'test-only-secret-with-more-than-32-characters';
  process.env.APP_ORIGIN = 'http://localhost:5173';
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
  replica = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
    binary: { downloadDir: '/private/tmp/careline-mongodb-binaries' },
  });
  await mongoose.connect(replica.getUri());
  await Promise.all([
    Doctor.init(),
    Appointment.init(),
    Payment.init(),
    Claim.init(),
    User.init(),
    Notification.init(),
    AuditEvent.init(),
    WaitlistEntry.init(),
    RecommendationFeedback.init(),
  ]);
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await replica?.stop();
});
beforeEach(async () => {
  await Promise.all([
    Doctor.deleteMany({}),
    Appointment.deleteMany({}),
    Payment.deleteMany({}),
    Claim.deleteMany({}),
    User.deleteMany({}),
    Notification.deleteMany({}),
    AuditEvent.deleteMany({}),
    WaitlistEntry.deleteMany({}),
    RecommendationFeedback.deleteMany({}),
  ]);
  patient = new mongoose.Types.ObjectId();
  other = new mongoose.Types.ObjectId();
  doctor = await Doctor.create({
    name: 'Test doctor',
    fee: 600,
    days: [0, 1, 2, 3, 4, 5, 6],
    start: 9,
    end: 17,
    breakStart: 13,
    breakEnd: 14,
    leave: [],
  });
});
async function paidBooking(time = at('10')) {
  const record = await reserve(patient, doctor._id, time, 'Test');
  record.payment.orderId = `order_${record.payment._id}`;
  await record.payment.save();
  await capturedPayment({
    order_id: record.payment.orderId,
    id: `pay_${record.payment._id}`,
    status: 'captured',
    amount: 60000,
    currency: 'INR',
  });
  return record;
}
test('concurrent reservations allow exactly one doctor slot owner', async () => {
  const results = await Promise.allSettled([
    reserve(patient, doctor._id, at('10'), 'A'),
    reserve(other, doctor._id, at('10'), 'B'),
  ]);
  assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(await Appointment.countDocuments(), 1);
  assert.equal(await Claim.countDocuments(), 2);
});
test('patient cannot reserve two doctors for the same time', async () => {
  const second = await Doctor.create({ ...doctor.toObject(), _id: new mongoose.Types.ObjectId() });
  await reserve(patient, doctor._id, at('10'), '');
  await assert.rejects(reserve(patient, second._id, at('10'), ''));
  assert.equal(await Appointment.countDocuments(), 1);
});
test('failed rescheduling preserves original appointment and both claims', async () => {
  const { appointment } = await paidBooking();
  await reserve(other, doctor._id, at('11'), '');
  await assert.rejects(reschedule(appointment._id, { _id: patient }, at('11')));
  assert.equal(
    (await Appointment.findById(appointment._id)).start.toISOString(),
    new Date(at('10')).toISOString(),
  );
  assert.equal(await Claim.countDocuments({ appointment: appointment._id }), 2);
});
test('successful rescheduling moves claims and retains original payment', async () => {
  const { appointment, payment } = await paidBooking();
  await reschedule(appointment._id, { _id: patient }, at('11'));
  const moved = await Appointment.findById(appointment._id);
  assert.equal(moved.start.toISOString(), new Date(at('11')).toISOString());
  assert.equal(String(moved.payment), String(payment._id));
  assert.equal(await Claim.countDocuments({ start: new Date(at('10')) }), 0);
});
test('duplicate capture is idempotent and incorrect amounts are rejected', async () => {
  const { appointment, payment } = await reserve(patient, doctor._id, at('10'), '');
  payment.orderId = 'order_test';
  await payment.save();
  const gateway = {
    order_id: 'order_test',
    id: 'pay_test',
    status: 'captured',
    amount: 1,
    currency: 'INR',
  };
  await assert.rejects(capturedPayment(gateway));
  gateway.amount = 60000;
  await capturedPayment(gateway);
  await capturedPayment(gateway);
  assert.equal((await Appointment.findById(appointment._id)).status, 'confirmed');
  assert.equal(await Payment.countDocuments({ status: 'paid' }), 1);
});
test('late capture queues refund without stealing a newly reserved slot', async () => {
  const { appointment, payment } = await reserve(patient, doctor._id, at('10'), '');
  payment.orderId = 'order_expired';
  await payment.save();
  await Appointment.updateOne(
    { _id: appointment._id },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );
  await releaseExpired();
  await reserve(other, doctor._id, at('10'), '');
  await capturedPayment({
    order_id: payment.orderId,
    id: 'pay_late',
    status: 'captured',
    amount: 60000,
    currency: 'INR',
  });
  assert.equal((await Payment.findById(payment._id)).status, 'refund-pending');
  assert.equal((await Appointment.findById(appointment._id)).status, 'expired');
  assert.equal(await Claim.countDocuments(), 2);
});
test('cancellation enforces ownership, queues refund and frees slot', async () => {
  const { appointment, payment } = await paidBooking();
  await assert.rejects(cancel(appointment._id, { _id: other, role: 'patient' }), { status: 403 });
  await cancel(appointment._id, { _id: patient, role: 'patient' });
  assert.equal((await Appointment.findById(appointment._id)).status, 'cancelled');
  assert.equal((await Payment.findById(payment._id)).status, 'refund-pending');
  assert.equal(await Claim.countDocuments(), 0);
  await assert.rejects(cancel(appointment._id, { _id: patient, role: 'patient' }));
});
test('cancelled slot is held for the earliest matching waitlist patient', async () => {
  const waiting = await User.create({
    name: 'Waiting Patient',
    email: 'waiting@example.test',
    password: await bcrypt.hash('TestPassword123!', 4),
    role: 'patient',
  });
  const start = at('10');
  const entry = await WaitlistEntry.create({
    patient: waiting._id,
    doctor: doctor._id,
    date: clinicDate(new Date(start)),
    earliestHour: 9,
    latestHour: 12,
  });
  const { appointment } = await paidBooking(start);
  await cancel(appointment._id, { _id: patient, role: 'patient' });
  const offered = await WaitlistEntry.findById(entry._id);
  assert.equal(offered.status, 'offered');
  assert.equal(offered.offeredStart.toISOString(), new Date(start).toISOString());
  assert.ok(offered.offerExpiresAt > new Date());
  assert.equal(await Claim.countDocuments({ waitlist: entry._id }), 1);
  assert.equal(await Notification.countDocuments({ user: waiting._id, type: 'waitlist' }), 1);
});
test('expired waitlist offers release their slot claim', async () => {
  const entry = await WaitlistEntry.create({
    patient,
    doctor: doctor._id,
    date: clinicDate(new Date(at('10'))),
    status: 'offered',
    offeredStart: new Date(at('10')),
    offerExpiresAt: new Date(Date.now() - 1000),
  });
  await Claim.create({
    resource: `doctor:${doctor._id}`,
    start: new Date(at('10')),
    waitlist: entry._id,
  });
  await expireWaitlistOffers();
  assert.equal((await WaitlistEntry.findById(entry._id)).status, 'expired');
  assert.equal(await Claim.countDocuments({ waitlist: entry._id }), 0);
});
test('waitlist skips a patient who is already booked at the released time', async () => {
  const [conflicted, available] = await User.create([
    {
      name: 'Conflicted Patient',
      email: 'conflicted@example.test',
      password: await bcrypt.hash('TestPassword123!', 4),
      role: 'patient',
    },
    {
      name: 'Available Patient',
      email: 'available@example.test',
      password: await bcrypt.hash('TestPassword123!', 4),
      role: 'patient',
    },
  ]);
  const start = at('10');
  await WaitlistEntry.create([
    {
      patient: conflicted._id,
      doctor: doctor._id,
      date: clinicDate(new Date(start)),
      earliestHour: 9,
      latestHour: 12,
      createdAt: new Date(Date.now() - 10000),
    },
    {
      patient: available._id,
      doctor: doctor._id,
      date: clinicDate(new Date(start)),
      earliestHour: 9,
      latestHour: 12,
    },
  ]);
  await Claim.create({ resource: `patient:${conflicted._id}`, start: new Date(start) });
  const { appointment } = await paidBooking(start);
  await cancel(appointment._id, { _id: patient, role: 'patient' });
  assert.equal((await WaitlistEntry.findOne({ patient: conflicted._id })).status, 'active');
  assert.equal((await WaitlistEntry.findOne({ patient: available._id })).status, 'offered');
});
test("doctor can cancel their own booking but not another doctor's booking", async () => {
  const staff = await User.create({
    name: 'Doctor Owner',
    email: 'owner@example.test',
    password: await bcrypt.hash('TestPassword123!', 4),
    role: 'doctor',
  });
  doctor.user = staff._id;
  await doctor.save();
  const { appointment, payment } = await paidBooking();

  await cancel(appointment._id, { _id: staff._id, role: 'doctor' });
  assert.equal((await Appointment.findById(appointment._id)).status, 'cancelled');
  assert.equal((await Payment.findById(payment._id)).status, 'refund-pending');
  assert.equal(await Claim.countDocuments({ appointment: appointment._id }), 0);

  const otherStaff = await User.create({
    name: 'Other Doctor',
    email: 'other-doctor@example.test',
    password: await bcrypt.hash('TestPassword123!', 4),
    role: 'doctor',
  });
  const otherDoctor = await Doctor.create({
    user: otherStaff._id,
    name: 'Other doctor',
    fee: 700,
    days: [0, 1, 2, 3, 4, 5, 6],
    start: 9,
    end: 17,
    breakStart: 13,
    breakEnd: 14,
    leave: [],
  });
  const foreign = await reserve(patient, otherDoctor._id, at('11'), 'Test');
  foreign.payment.orderId = `order_${foreign.payment._id}`;
  await foreign.payment.save();
  await capturedPayment({
    order_id: foreign.payment.orderId,
    id: `pay_${foreign.payment._id}`,
    status: 'captured',
    amount: 70000,
    currency: 'INR',
  });
  await assert.rejects(cancel(foreign.appointment._id, { _id: staff._id, role: 'doctor' }), {
    status: 403,
  });
});
test('past times and off-grid appointment times are rejected', async () => {
  await assert.rejects(reserve(patient, doctor._id, at('10', -1), ''));
  await assert.rejects(reserve(patient, doctor._id, at('10').replace(':00:00', ':15:00'), ''));
  assert.equal(await Appointment.countDocuments(), 0);
});
async function request(
  path,
  { method = 'GET', body, cookie, origin = 'http://localhost:5173' } = {},
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
test('registration hashes passwords, ignores role injection and enforces authorization', async () => {
  let r = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Patient',
      email: 'patient@example.test',
      password: 'TestPassword123!',
      role: 'admin',
    },
  });
  assert.equal(r.status, 201);
  const user = await r.json();
  assert.equal(user.role, 'patient');
  const cookie = r.headers.get('set-cookie').split(';')[0];
  const stored = await User.findById(user.id).select('+password');
  assert.notEqual(stored.password, 'TestPassword123!');
  assert.ok(await bcrypt.compare('TestPassword123!', stored.password));
  r = await request('/admin/doctors', { cookie });
  assert.equal(r.status, 403);
  r = await request('/auth/me', { cookie });
  assert.equal(r.status, 200);
  r = await request('/appointments');
  assert.equal(r.status, 401);
  r = await request('/auth/me', {
    method: 'PATCH',
    cookie,
    origin: 'https://other.example',
    body: { name: 'Changed' },
  });
  assert.equal(r.status, 403);
});
test('patient check-in and staff queue transitions create a visible audit trail', async () => {
  let response = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Queue Patient',
      email: 'queue-patient@example.test',
      password: 'TestPassword123!',
    },
  });
  const patientCookie = response.headers.get('set-cookie').split(';')[0];
  const patientAccount = await response.json();
  const staff = await User.create({
    name: 'Queue Doctor',
    email: 'queue-doctor@example.test',
    password: await bcrypt.hash('TestPassword123!', 4),
    role: 'doctor',
  });
  doctor.user = staff._id;
  await doctor.save();
  const appointment = await Appointment.create({
    patient: patientAccount.id,
    doctor: doctor._id,
    start: new Date(Date.now() + 10 * 60000),
    fee: 600,
    status: 'confirmed',
  });
  response = await request(`/appointments/${appointment._id}/check-in`, {
    method: 'POST',
    cookie: patientCookie,
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'checked-in');

  response = await request('/auth/login', {
    method: 'POST',
    body: { email: staff.email, password: 'TestPassword123!' },
  });
  const staffCookie = response.headers.get('set-cookie').split(';')[0];
  for (const status of ['waiting', 'in-consultation', 'completed']) {
    response = await request(`/appointments/${appointment._id}/status`, {
      method: 'POST',
      cookie: staffCookie,
      body: { status },
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, status);
  }
  response = await request(`/appointments/${appointment._id}/audit`, { cookie: patientCookie });
  assert.equal(response.status, 200);
  assert.deepEqual(
    (await response.json()).map((event) => event.toStatus),
    ['checked-in', 'waiting', 'in-consultation', 'completed'],
  );
  response = await request(`/appointments/${appointment._id}/calendar.ics`, {
    cookie: patientCookie,
  });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /BEGIN:VCALENDAR[\s\S]*Test doctor/);
});
test('Google identity creates and reuses one passwordless patient account', async () => {
  const payload = {
    sub: 'google-sub-123',
    email: 'new.patient@gmail.com',
    email_verified: true,
    name: 'Google Patient',
    picture: 'https://example.test/avatar.png',
  };
  const first = await findOrCreateGoogleUser(payload);
  const second = await findOrCreateGoogleUser({ ...payload, name: 'Changed Google Name' });
  assert.equal(String(first._id), String(second._id));
  assert.equal(first.role, 'patient');
  assert.equal(await User.countDocuments({ email: payload.email }), 1);

  const stored = await User.findById(first._id).select('+password +googleSub');
  assert.equal(stored.password, undefined);
  assert.equal(stored.googleSub, payload.sub);

  const login = await request('/auth/login', {
    method: 'POST',
    body: { email: payload.email, password: 'TestPassword123!' },
  });
  assert.equal(login.status, 401);
});
test('Google identity links authoritative patient email but protects staff and other providers', async () => {
  const password = await bcrypt.hash('TestPassword123!', 4);
  const patientAccount = await User.create({
    name: 'Existing Patient',
    email: 'existing.patient@gmail.com',
    password,
    role: 'patient',
  });
  const linked = await findOrCreateGoogleUser({
    sub: 'google-linked-patient',
    email: patientAccount.email,
    email_verified: true,
    name: patientAccount.name,
  });
  assert.equal(String(linked._id), String(patientAccount._id));
  assert.equal(
    (await User.findById(patientAccount._id).select('+googleSub')).googleSub,
    'google-linked-patient',
  );

  await User.create({
    name: 'Clinic Staff',
    email: 'staff@gmail.com',
    password,
    role: 'admin',
  });
  await assert.rejects(
    findOrCreateGoogleUser({
      sub: 'google-staff',
      email: 'staff@gmail.com',
      email_verified: true,
      name: 'Clinic Staff',
    }),
    { status: 403 },
  );

  await User.create({
    name: 'External Patient',
    email: 'patient@example.com',
    password,
    role: 'patient',
  });
  await assert.rejects(
    findOrCreateGoogleUser({
      sub: 'google-external',
      email: 'patient@example.com',
      email_verified: true,
      name: 'External Patient',
    }),
    { status: 409 },
  );
});
test('patient can release only their own pending checkout reservation', async () => {
  const password = 'TestPassword123!';
  const patientUser = await User.create({
    _id: patient,
    name: 'Checkout Patient',
    email: 'checkout@example.test',
    password: await bcrypt.hash(password, 4),
    role: 'patient',
  });
  const otherUser = await User.create({
    _id: other,
    name: 'Other Patient',
    email: 'other-patient@example.test',
    password: await bcrypt.hash(password, 4),
    role: 'patient',
  });
  const pending = await reserve(patientUser._id, doctor._id, at('10'), 'Test');

  let r = await request('/auth/login', {
    method: 'POST',
    body: { email: otherUser.email, password },
  });
  const otherCookie = r.headers.get('set-cookie').split(';')[0];
  r = await request(`/appointments/${pending.appointment._id}/release`, {
    method: 'POST',
    cookie: otherCookie,
  });
  assert.equal(r.status, 200);
  assert.equal((await Appointment.findById(pending.appointment._id)).status, 'pending');
  assert.equal(await Claim.countDocuments({ appointment: pending.appointment._id }), 2);

  r = await request('/auth/login', {
    method: 'POST',
    body: { email: patientUser.email, password },
  });
  const ownerCookie = r.headers.get('set-cookie').split(';')[0];
  r = await request(`/appointments/${pending.appointment._id}/release`, {
    method: 'POST',
    cookie: ownerCookie,
  });
  assert.equal(r.status, 200);
  assert.equal((await Appointment.findById(pending.appointment._id)).status, 'expired');
  assert.equal(await Claim.countDocuments({ appointment: pending.appointment._id }), 0);
});
test('doctor schedule rejects changes that displace existing bookings', async () => {
  const staff = await User.create({
    name: 'Doctor Test',
    email: 'doctor@example.test',
    password: await bcrypt.hash('TestPassword123!', 4),
    role: 'doctor',
  });
  doctor.user = staff._id;
  await doctor.save();
  await paidBooking();
  let r = await request('/auth/login', {
    method: 'POST',
    body: { email: staff.email, password: 'TestPassword123!' },
  });
  assert.equal(r.status, 200);
  const cookie = r.headers.get('set-cookie').split(';')[0];
  r = await request('/doctor/schedule', {
    method: 'PATCH',
    cookie,
    body: {
      days: [0, 1, 2, 3, 4, 5, 6],
      start: 9,
      end: 17,
      breakStart: 13,
      breakEnd: 14,
      leave: [clinicDate(new Date(at('10')))],
    },
  });
  assert.equal(r.status, 409);
  assert.deepEqual((await Doctor.findById(doctor._id)).leave, []);
});
