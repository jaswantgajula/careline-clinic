import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './routes/api.js';
import { validSignature, reconcilePayments } from './services/payment.service.js';
import { capturedPayment, releaseExpired } from './services/booking.service.js';
import { paymentsReady } from './config/razorpay.js';
import { User, Doctor, Appointment, Payment, Claim } from './models/index.js';
const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
        frameSrc: ['https://api.razorpay.com', 'https://checkout.razorpay.com'],
        connectSrc: ["'self'", 'https://*.razorpay.com'],
        imgSrc: ["'self'", 'data:', 'https://*.razorpay.com'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'", 'data:'],
      },
    },
  }),
);
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '100kb' }),
  async (req, res, next) => {
    try {
      if (
        !validSignature(
          req.body,
          req.headers['x-razorpay-signature'],
          process.env.RAZORPAY_WEBHOOK_SECRET,
        )
      )
        return res.status(400).json({ message: 'Invalid webhook signature.' });
      const event = JSON.parse(req.body.toString());
      if (['payment.captured', 'order.paid'].includes(event.event))
        await capturedPayment(event.payload.payment.entity);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  },
);
app.use(express.json({ limit: '20kb' }), cookieParser());
app.use(
  '/api',
  rateLimit({ windowMs: 60000, limit: 150, standardHeaders: 'draft-7', legacyHeaders: false }),
);
app.get('/api/health', (req, res) =>
  res.json({
    database: mongoose.connection.readyState === 1,
    payments: paymentsReady(),
    ai: !!(process.env.AI_API_URL && process.env.AI_API_KEY && process.env.AI_MODEL),
  }),
);
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    const allowed = [process.env.APP_ORIGIN || 'http://localhost:5173'];
    if (process.env.NODE_ENV !== 'production') allowed.push('http://127.0.0.1:5173');
    if (!origin || !allowed.includes(origin))
      return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  if (mongoose.connection.readyState !== 1)
    return res
      .status(503)
      .json({
        message: 'Connect MongoDB to use accounts and bookings. The demo remains available.',
      });
  next();
});
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
app.use(express.static(dist));
app.get('/{*splat}', (req, res) => res.sendFile(path.join(dist, 'index.html')));
app.use((err, req, res, next) => {
  if (err instanceof ZodError)
    return res.status(400).json({ message: err.issues.map((x) => x.message).join(' ') });
  if (err.code === 11000)
    return res.status(409).json({ message: 'This email or time slot is already in use.' });
  if (err.name === 'CastError')
    return res.status(400).json({ message: 'Invalid record identifier.' });
  console.error(err.message);
  res
    .status(err.status || 500)
    .json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
});

export default app;
