import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
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
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'expired'],
        default: 'pending',
      },
      expiresAt: Date,
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
  },
  { timestamps: true },
);
claimSchema.index({ resource: 1, start: 1 }, { unique: true });
export const Claim = model('Claim', claimSchema);
