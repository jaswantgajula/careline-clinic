import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    googleSub: { type: String, unique: true, sparse: true, select: false },
    avatarUrl: String,
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    notificationPreferences: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);
export const User = model('User', userSchema);
export const Doctor = model(
  'Doctor',
  new Schema(
    {
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      scheduleVersion: { type: Number, default: 0 },
      name: String,
      specialty: String,
      qualification: String,
      bio: String,
      experience: Number,
      fee: Number,
      color: String,
      initials: String,
      active: { type: Boolean, default: true },
      days: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
      start: { type: Number, default: 9 },
      end: { type: Number, default: 17 },
      breakStart: { type: Number, default: 13 },
      breakEnd: { type: Number, default: 14 },
      leave: { type: [String], default: [] },
    },
    { timestamps: true },
  ),
);
export const Appointment = model(
  'Appointment',
  new Schema(
    {
      patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
      start: { type: Date, required: true },
      reason: String,
      fee: Number,
      status: {
        type: String,
        enum: [
          'pending',
          'confirmed',
          'checked-in',
          'waiting',
          'in-consultation',
          'cancelled',
          'completed',
          'no-show',
          'expired',
        ],
        default: 'pending',
      },
      expiresAt: Date,
      checkedInAt: Date,
      waitingAt: Date,
      consultationStartedAt: Date,
      completedAt: Date,
      payment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    },
    { timestamps: true },
  ),
);
export const Payment = model(
  'Payment',
  new Schema(
    {
      appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
      patient: { type: Schema.Types.ObjectId, ref: 'User' },
      amount: Number,
      orderId: { type: String, unique: true, sparse: true },
      paymentId: { type: String, unique: true, sparse: true },
      status: {
        type: String,
        enum: ['created', 'paid', 'refund-pending', 'refunded', 'failed'],
        default: 'created',
      },
      refundId: String,
      refundError: String,
      refundAttempts: { type: Number, default: 0 },
      lastCheckedAt: { type: Date, default: () => new Date(0) },
    },
    { timestamps: true },
  ),
);
// Shared slot claims protect both the doctor's time and the patient's time.
const claimSchema = new Schema(
  {
    resource: String,
    start: Date,
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    waitlist: { type: Schema.Types.ObjectId, ref: 'WaitlistEntry' },
  },
  { timestamps: true },
);
claimSchema.index({ resource: 1, start: 1 }, { unique: true });
export const Claim = model('Claim', claimSchema);

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['appointment', 'payment', 'waitlist', 'reminder', 'system'],
      default: 'system',
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: String,
    readAt: Date,
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true },
);
notificationSchema.index({ user: 1, createdAt: -1 });
export const Notification = model('Notification', notificationSchema);

const auditEventSchema = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    fromStatus: String,
    toStatus: String,
    details: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);
auditEventSchema.index({ appointment: 1, createdAt: 1 });
export const AuditEvent = model('AuditEvent', auditEventSchema);

const waitlistEntrySchema = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    date: { type: String, required: true },
    earliestHour: { type: Number, default: 9 },
    latestHour: { type: Number, default: 17 },
    status: {
      type: String,
      enum: ['active', 'offered', 'accepted', 'expired', 'cancelled'],
      default: 'active',
    },
    offeredStart: Date,
    offerExpiresAt: Date,
  },
  { timestamps: true },
);
waitlistEntrySchema.index({ doctor: 1, date: 1, status: 1, createdAt: 1 });
waitlistEntrySchema.index(
  { patient: 1, doctor: 1, date: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['active', 'offered'] } } },
);
export const WaitlistEntry = model('WaitlistEntry', waitlistEntrySchema);

export const RecommendationFeedback = model(
  'RecommendationFeedback',
  new Schema(
    {
      patient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      specialty: String,
      urgent: Boolean,
      model: String,
      concernLength: Number,
      helpful: Boolean,
      feedbackAt: Date,
    },
    { timestamps: true },
  ),
);
