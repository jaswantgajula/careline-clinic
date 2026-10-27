import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import api from './routes/api.js';
import { validSignature, reconcilePayments } from './services/payment.service.js';
import { capturedPayment, releaseExpired } from './services/booking.service.js';
import { paymentsReady } from './config/razorpay.js';
import { googleAuthReady } from './services/googleAuth.service.js';
import { User, Doctor, Appointment, Payment, Claim } from './models/index.js';
const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://checkout.razorpay.com', 'https://accounts.google.com'],
        frameSrc: [
          'https://api.razorpay.com',
          'https://checkout.razorpay.com',
          'https://accounts.google.com',
        ],
        connectSrc: ["'self'", 'https://*.razorpay.com', 'https://accounts.google.com'],
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
    googleAuth: googleAuthReady(),
    googleClientId: googleAuthReady() ? process.env.GOOGLE_CLIENT_ID : null,
  }),
);
app.use('/api', (req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    const allowed = [process.env.APP_ORIGIN || 'http://localhost:5173'];
    if (process.env.NODE_ENV !== 'production') {
      allowed.push('http://127.0.0.1:5173', 'http://localhost:4000', 'http://127.0.0.1:4000');
    }
    if (origin && !allowed.includes(origin))
      return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  if (mongoose.connection.readyState !== 1)
    return res.status(503).json({
      message: 'Connect MongoDB to use accounts and bookings. The demo remains available.',
    });
  next();
});
app.use('/api', api);
app.use('/api', (req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/dist');
app.use(express.static(dist));
app.get('/{*splat}', (req, res) => {
  const indexFile = path.join(dist, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res
      .status(200)
      .send(
        'Careline API is running. Build frontend with `npm run build` to serve the web application.',
      );
  }
});
app.use((err, req, res, next) => {
  if (err instanceof ZodError)
    return res.status(400).json({ message: err.issues.map((x) => x.message).join(' ') });
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    const message = fields.includes('appointment')
      ? 'This appointment already has a visit summary or review.'
      : fields.includes('email')
        ? 'An account with this email already exists.'
        : 'This record or time slot is already in use.';
    return res.status(409).json({ message });
  }
  if (err.name === 'CastError')
    return res.status(400).json({ message: 'Invalid record identifier.' });
  console.error(err.message);
  res
    .status(err.status || 500)
    .json({ message: err.status ? err.message : 'Something went wrong. Please try again.' });
});

export default app;
