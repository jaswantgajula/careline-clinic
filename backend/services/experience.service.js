import {
  Appointment,
  AuditEvent,
  Claim,
  Doctor,
  Notification,
  User,
  WaitlistEntry,
} from '../models/index.js';

const listeners = new Map();

export function subscribe(userId, res) {
  const key = String(userId);
  const set = listeners.get(key) || new Set();
  set.add(res);
  listeners.set(key, set);
  return () => {
    set.delete(res);
    if (!set.size) listeners.delete(key);
  };
}

export function publish(userId, event, payload = {}) {
  for (const res of listeners.get(String(userId)) || []) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
  }
}

export async function notify(user, type, title, message, options = {}) {
  const owner = await User.findById(user).select('notificationPreferences');
  if (owner?.notificationPreferences?.inApp === false) return null;
  if (type === 'reminder' && owner?.notificationPreferences?.reminders === false) return null;
  const record = await Notification.create({
    user,
    type,
    title,
    message,
    actionUrl: options.actionUrl,
    dedupeKey: options.dedupeKey,
  }).catch((error) => {
    if (error.code === 11000) return null;
    throw error;
  });
  if (record) publish(user, 'notification', { id: record._id, title });
  return record;
}

export async function audit(appointment, actor, action, options = {}) {
  return AuditEvent.create({
    appointment,
    actor,
    action,
    fromStatus: options.fromStatus,
    toStatus: options.toStatus,
    details: options.details || {},
  });
}

export async function expireWaitlistOffers(now = new Date()) {
  const expired = await WaitlistEntry.find({ status: 'offered', offerExpiresAt: { $lte: now } });
  for (const entry of expired) {
    entry.status = 'expired';
    await entry.save();
    await Claim.deleteMany({ waitlist: entry._id });
    await notify(
      entry.patient,
      'waitlist',
      'Waitlist offer expired',
      'The reserved slot was released. Join the waitlist again if you still need an appointment.',
      { actionUrl: '/doctors', dedupeKey: `waitlist-expired:${entry._id}` },
    );
  }
}

export async function offerWaitlistSlot(doctor, start) {
  await expireWaitlistOffers();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(start));
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(start)),
  );
  const candidates = await WaitlistEntry.find({
    doctor,
    date,
    status: 'active',
    earliestHour: { $lte: hour },
    latestHour: { $gt: hour },
  })
    .sort({ createdAt: 1 })
    .limit(25);
  for (const entry of candidates) {
    if (await Claim.exists({ resource: `patient:${entry.patient}`, start })) continue;
    try {
      await Claim.create({ resource: `doctor:${doctor}`, start, waitlist: entry._id });
    } catch (error) {
      if (error.code === 11000) return null;
      throw error;
    }
    const offered = await WaitlistEntry.findOneAndUpdate(
      { _id: entry._id, status: 'active' },
      {
        $set: {
          status: 'offered',
          offeredStart: start,
          offerExpiresAt: new Date(Date.now() + 10 * 60000),
        },
      },
      { new: true },
    );
    if (!offered) {
      await Claim.deleteMany({ waitlist: entry._id });
      continue;
    }
    await notify(
      offered.patient,
      'waitlist',
      'A sooner appointment is available',
      'This slot is reserved for you for 10 minutes. Accept it from your waitlist.',
      { actionUrl: '/waitlist', dedupeKey: `waitlist-offer:${offered._id}` },
    );
    publish(offered.patient, 'waitlist', { id: offered._id, status: offered.status });
    return offered;
  }
  return null;
}

export async function generateReminders(now = new Date()) {
  const windows = [
    { key: '24h', from: 23 * 3600000, to: 25 * 3600000, label: 'tomorrow' },
    { key: '2h', from: 90 * 60000, to: 150 * 60000, label: 'in about two hours' },
  ];
  for (const window of windows) {
    const appointments = await Appointment.find({
      status: { $in: ['confirmed', 'checked-in', 'waiting'] },
      start: {
        $gte: new Date(now.getTime() + window.from),
        $lte: new Date(now.getTime() + window.to),
      },
    });
    for (const appointment of appointments) {
      const doctor = await Doctor.findById(appointment.doctor).select('name');
      await notify(
        appointment.patient,
        'reminder',
        `Appointment ${window.label}`,
        `Your visit with ${doctor?.name || 'your doctor'} is ${window.label}.`,
        {
          actionUrl: '/appointments',
          dedupeKey: `reminder:${window.key}:${appointment._id}`,
        },
      );
    }
  }
}
