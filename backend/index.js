import mongoose from 'mongoose';
import app from './app.js';
import {
  User,
  Doctor,
  Appointment,
  Payment,
  Claim,
  Notification,
  AuditEvent,
  WaitlistEntry,
  RecommendationFeedback,
  VisitSummary,
  AppointmentReview,
} from './models/index.js';
import { releaseExpired } from './services/booking.service.js';
import { reconcilePayments } from './services/payment.service.js';
import { expireWaitlistOffers, generateReminders } from './services/experience.service.js';
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required in production.');
}
if (process.env.MONGODB_URI) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    throw new Error('Set JWT_SECRET to a random secret with at least 32 characters.');
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    await Promise.all([
      User.init(),
      Doctor.init(),
      Appointment.init(),
      Payment.init(),
      Claim.init(),
      Notification.init(),
      AuditEvent.init(),
      WaitlistEntry.init(),
      RecommendationFeedback.init(),
      VisitSummary.init(),
      AppointmentReview.init(),
    ]);
    console.log('MongoDB connected.');
  } catch (e) {
    if (process.env.NODE_ENV === 'production') throw e;
    console.error('Database unavailable:', e.message);
  }
} else console.log('No MongoDB configured. API is running in preview mode.');
app.listen(process.env.PORT || 4000, process.env.HOST || '127.0.0.1', () =>
  console.log('Careline API: http://127.0.0.1:4000'),
);
setInterval(() => {
  if (mongoose.connection.readyState === 1) {
    void releaseExpired().catch((e) => console.error(e.message));
    void reconcilePayments().catch((e) => console.error(e.message));
    void expireWaitlistOffers().catch((e) => console.error(e.message));
    void generateReminders().catch((e) => console.error(e.message));
  }
}, 30000).unref();
