import mongoose from 'mongoose';
import { Appointment, Doctor, Claim, Payment } from '../models/index.js';
import { slotsFor, HOLD_MS, canChange } from './policies.js';
export const fail = (message, status = 400) => Object.assign(new Error(message), { status });
export async function transaction(fn) {
  return mongoose.connection.transaction(fn);
}
export async function releaseExpired() {
  await transaction(async (session) => {
    const expired = await Appointment.find({
      status: 'pending',
      expiresAt: { $lte: new Date() },
    }).session(session);
    for (const a of expired) {
      a.status = 'expired';
      await a.save({ session });
      await Claim.deleteMany({ appointment: a._id }).session(session);
    }
  });
}
async function claims(a, session) {
  await Claim.create(
    [
      { resource: `doctor:${a.doctor}`, start: a.start, appointment: a._id },
      { resource: `patient:${a.patient}`, start: a.start, appointment: a._id },
    ],
    { session, ordered: true },
  );
}
export async function reserve(patient, doctorId, start, reason) {
  await releaseExpired();
  return transaction(async (session) => {
    // A write to the doctor record serializes schedule changes with reservations.
    const doctor = await Doctor.findOneAndUpdate(
      { _id: doctorId, active: true },
      { $inc: { scheduleVersion: 1 } },
      { new: true, session },
    );
    if (
      !doctor ||
      !slotsFor(
        doctor,
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(start)),
      ).includes(new Date(start).toISOString())
    )
      throw fail('This slot is no longer available.', 409);
    const [a] = await Appointment.create(
      [
        {
          patient,
          doctor: doctorId,
          start,
          reason,
          fee: doctor.fee,
          expiresAt: new Date(Date.now() + HOLD_MS),
        },
      ],
      { session },
    );
    await claims(a, session);
    const [p] = await Payment.create([{ appointment: a._id, patient, amount: doctor.fee * 100 }], {
      session,
    });
    a.payment = p._id;
    await a.save({ session });
    return { appointment: a, payment: p };
  });
}
export async function cancel(id, user) {
  return transaction(async (session) => {
    const a = await Appointment.findById(id).session(session);
    if (!a) throw fail('Appointment not found.', 404);
    if (user.role === 'doctor') {
      const doc = await Doctor.findOne({ user: user._id }).session(session);
      if (!doc || String(a.doctor) !== String(doc._id)) throw fail('Access denied.', 403);
    } else if (user.role !== 'admin' && String(a.patient) !== String(user._id)) {
      throw fail('Access denied.', 403);
    }
    if (a.status !== 'confirmed') throw fail('Only confirmed appointments can be cancelled.');
    if (user.role === 'patient' && !canChange(a.start))
      throw fail('Cancellation closes two hours before the visit.');
    a.status = 'cancelled';
    await a.save({ session });
    await Claim.deleteMany({ appointment: a._id }).session(session);
    await Payment.updateOne(
      { _id: a.payment, status: 'paid' },
      { $set: { status: 'refund-pending' } },
      { session },
    );
    return a;
  });
}
export async function reschedule(id, user, start) {
  await releaseExpired();
  return transaction(async (session) => {
    const a = await Appointment.findOne({ _id: id, patient: user._id }).session(session);
    if (!a) throw fail('Appointment not found.', 404);
    if (a.status !== 'confirmed' || !canChange(a.start))
      throw fail('This appointment cannot be rescheduled.');
    const d = await Doctor.findOneAndUpdate(
      { _id: a.doctor, active: true },
      { $inc: { scheduleVersion: 1 } },
      { new: true, session },
    );
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(start));
    if (!d || !slotsFor(d, date).includes(new Date(start).toISOString()))
      throw fail('Choose an available slot.');
    await Claim.deleteMany({ appointment: a._id }).session(session);
    a.start = start;
    await claims(a, session);
    await a.save({ session });
    return a;
  });
}
export async function capturedPayment(payment) {
  return transaction(async (session) => {
    const p = await Payment.findOne({ orderId: payment.order_id }).session(session);
    if (!p) throw fail('Payment order not found.', 404);
    if (p.status !== 'created') return;
    if (payment.status !== 'captured' || payment.currency !== 'INR' || payment.amount !== p.amount)
      throw fail('Payment details did not match.');
    const a = await Appointment.findById(p.appointment).session(session);
    p.paymentId = payment.id;
    if (a.status === 'pending' && a.expiresAt > new Date()) {
      a.status = 'confirmed';
      p.status = 'paid';
    } else {
      if (a.status === 'pending') a.status = 'expired';
      p.status = 'refund-pending';
      await Claim.deleteMany({ appointment: a._id }).session(session);
    }
    await a.save({ session });
    await p.save({ session });
  });
}
