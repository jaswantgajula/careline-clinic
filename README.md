# Careline Clinic

A MERN appointment scheduler for one clinic with multiple doctors. Includes responsive light and dark themes, Google sign-in, a patient portal, a live doctor queue, smart waitlists, admin analytics, Razorpay **test-mode** checkout and an optional AI specialty finder.

## Live deployment

- **Application:** [careline-clinic.vercel.app](https://careline-clinic.vercel.app)
- **Video walkthrough:** [Watch the Careline project demonstration](https://drive.google.com/file/d/1h2YOstqVTVezh7doeyXbHDqXm_BvRy4s/view?usp=sharing)
- **Backend health:** [careline-clinic-api.onrender.com/api/health](https://careline-clinic-api.onrender.com/api/health)
- **Source code:** [github.com/jaswantgajula/careline-clinic](https://github.com/jaswantgajula/careline-clinic)

The public deployment uses Vercel for the React frontend, Render for the Express API and MongoDB Atlas for persistent data. Render's free instance may take approximately 50 seconds to wake after inactivity.

## Standout features

- Google Identity Services sign-in with server-side ID-token verification and safe account linking.
- Patient self check-in and a live `arrived → waiting → in consultation → completed` clinic queue.
- Smart cancellation waitlist with 10-minute, automatically expiring slot offers.
- Real-time in-app notifications over server-sent events and idempotent 24-hour/2-hour reminders.
- Complete appointment audit timeline plus `.ics` calendar downloads.
- Thirty-day admin analytics for demand, attendance, revenue, waitlist conversion and AI helpfulness.
- Patient feedback capture for AI routing quality without storing the original symptom text.
- Doctor-authored visit summaries with private clinical notes, patient-safe PDF exports and follow-up plans.
- One verified star rating and optional feedback note per completed appointment, reflected in doctor and admin analytics.
- Installable PWA shell with offline access to the most recently loaded interface; API and medical data are never cached.

## Run the preview

Requires Node.js 22.12+ and npm.

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173. Without a configured database the interface displays a clearly labelled interactive demo, with fictional records saved in browser storage. Demo bookings, refunds and AI responses are simulations. Switch between patient, doctor and admin previews in the top bar.

## Connect the backend

Copy `backend/.env.example` to `backend/.env`, then configure the variables below. Never commit `.env`.

- `MONGODB_URI`: a MongoDB Atlas cluster or local **replica set**. Transactions are essential: a standalone MongoDB instance is insufficient.
- `JWT_SECRET`: a random secret at least 32 characters long.
- `APP_ORIGIN`: the exact frontend origin, e.g. `http://127.0.0.1:5173`.
- `GOOGLE_CLIENT_ID`: a Google OAuth 2.0 Web client ID whose authorized JavaScript origins include your local and deployed frontend origins.
- `SEED_ADMIN_PASSWORD`, `SEED_DOCTOR_PASSWORD`: choose strong passwords of at least 10 characters for fictional demo staff accounts.

```bash
npm run seed
npm run dev
```

The seed is additive and preserves existing records. Administrator: `admin@careline.test`. Doctors: `ananya@careline.test`, `rohan@careline.test`, `priya@careline.test`, `arjun@careline.test`, `meera@careline.test`, `kabir@careline.test`. Use your configured seed passwords. Patients register through the interface. Public registration cannot grant staff roles.

For Google sign-in, create a **Web application** OAuth client in Google Cloud, add both `http://localhost:5173` and `http://127.0.0.1:5173` while developing, then paste the client ID into `backend/.env`. Authentication requests only standard identity claims; this project does not request Gmail inbox access.

## Razorpay test payments

Set `RAZORPAY_KEY_ID` (must start with `rzp_test_`), `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`. Use Razorpay's test dashboard, configure automatic capture, and register an HTTPS webhook at `/api/payments/webhook` for `payment.captured` and `order.paid`. Local webhooks need an HTTPS tunnel; register the deployed endpoint when publishing.

The backend calculates fees, creates orders, checks payment signatures and verifies captured amount/currency. Verified webhooks and a 30-second reconciliation worker recover missed browser callbacks. Duplicate captures are idempotent. Closing checkout releases its temporary slot immediately when possible; the normal 10-minute expiry remains the fallback. Expired or cancelled reservations cannot be revived by a late payment, and these payments enter the refund queue. Refunds remain pending until Razorpay reports `processed`.

Run **one API process** with the current in-process reconciliation worker. Before scaling horizontally, move refund processing to a durable queue with distributed coordination. Test-mode gateway transactions and refunds still need end-to-end verification using your Razorpay account.

## AI provider

Configure `AI_API_URL`, `AI_API_KEY` and `AI_MODEL` for a provider supporting the chat-completions request shape, JSON responses and a bearer API key. `AI_API_URL` must be the full HTTPS completion endpoint. The request sends only the user's consented concern text and the clinic's supported specialties. The server validates the response and chooses doctors from MongoDB. It never accepts generated doctor IDs or fees.

The assistant provides specialty guidance, not diagnosis or prescriptions. It cannot rule out emergencies. An absent or failed provider shows an actionable error and leaves manual browsing available. Demo mode shows a fixed, explicitly labelled example, not a symptom assessment. Provider compatibility and clinical routing quality must be evaluated before use beyond a classroom demonstration.

## Policies

- 30-minute appointments, up to 30 days ahead; all clinic times use Asia/Kolkata.
- 10-minute slot reservation during payment.
- Patients may cancel or reschedule until two hours before the visit.
- Doctors and administrators may cancel clinic-side appointments and trigger the full test-refund workflow.
- Eligible patient cancellations and clinic cancellations receive full test refunds.
- Same-doctor rescheduling carries over the original fee and payment; changing doctors requires cancelling and rebooking.
- Failed rescheduling leaves the original appointment untouched.
- Doctor schedule changes and deactivation cannot silently displace confirmed visits or pending reservations.
- Online check-in opens 30 minutes before the visit and closes 30 minutes after.
- Waitlist offers are allocated oldest-first within the patient's selected time window and expire after 10 minutes.
- Doctors may draft summaries during a consultation and publish them only after completion. Published summaries are locked; private notes are excluded from patient responses and PDFs.
- Only the patient who attended a completed appointment may review it, and each appointment can be reviewed once.
- Statuses for appointments and payments are stored separately, and appointment changes are audited.

## Structure

- `frontend/src/pages`: patient, doctor and admin screens.
- `frontend/src/components`: shared controls, doctor cards, profiles and guided booking.
- `frontend/src/services`: API/checkout client and isolated demo fixtures.
- `backend/routes`: authenticated API endpoints and input validation.
- `backend/services`: transactional booking, availability and payment reconciliation.
- `backend/models`: users, doctor profiles, appointments, payments and unique slot claims.
- `backend/middlewares`: identity and role enforcement.
- `backend/app.js`: Express configuration, webhook verification and error handling.
- `backend/index.js`: database initialization, HTTP server and reconciliation worker.

The database has unique doctor/time and patient/time slot claims. Reservation and rescheduling use MongoDB transactions, and doctor record writes serialize reservations with schedule updates. HTTP-only cookies, password hashing, origin checks, request limits and server-side authorization protect authenticated operations.

## Verification

```bash
npm test
npm run build
```

Tests create and destroy an isolated MongoDB replica set; the first run may download the official MongoDB binary. They do not use your configured database. Coverage includes concurrent bookings, patient overlaps, rescheduling rollback, duplicate/late payments, refunds, ownership, Google account linking, clinic queue transitions, waitlist allocation/expiry, private visit-summary boundaries, PDF generation, verified appointment reviews, calendar export, input constraints, authentication and conflicting schedule changes.

The frontend build is emitted to `frontend/dist`. It may be served by Express for a single-host deployment; the public classroom deployment serves it independently through Vercel.

## Deployment

The classroom deployment follows the instructor's Vercel + Render architecture:

### Render backend

- Repository: this GitHub repository
- Root directory: `backend`
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health route: `/api/health`

Required Render environment variables:

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=use-a-long-random-production-secret
NODE_ENV=production
APP_ORIGIN=https://careline-clinic.vercel.app
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your-test-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret
AI_API_URL=https://your-provider.example/v1/chat/completions
AI_API_KEY=your-provider-key
AI_MODEL=your-provider-model
SEED_ADMIN_PASSWORD=your-fictional-admin-password
SEED_DOCTOR_PASSWORD=your-fictional-doctor-password
```

Render supplies `PORT`; do not set it manually. The application binds to `0.0.0.0` automatically in production. Set MongoDB Atlas Network Access appropriately for the cloud service and keep all credentials exclusively in Render.

### Vercel frontend

- Repository: this GitHub repository
- Framework preset: Vite
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Required Vercel environment variable:

```env
VITE_API_URL=https://careline-clinic-api.onrender.com
```

`frontend/vercel.json` supplies the SPA rewrite required for direct React Router URLs such as `/appointments`. After changing a Vite environment variable, redeploy the frontend because the value is embedded during the build.

### External production configuration

- Add `https://careline-clinic.vercel.app` to the Google Web OAuth client's authorized JavaScript origins.
- Configure the Razorpay **test-mode** webhook URL as `https://careline-clinic-api.onrender.com/api/payments/webhook`.
- Subscribe the webhook to `payment.captured` and `order.paid`.
- Enable automatic capture in the Razorpay test account.
- Use `SameSite=None`, secure HTTP-only cookies and credentialed CORS requests across the Vercel and Render domains; these are configured by the application when `NODE_ENV=production`.

After deployment, test registration, password and Google login, refresh persistence, booking, payment, cancellation/refund, direct route refreshes, AI guidance, waitlists, notifications and every staff role. Existing seeded staff passwords are preserved; changing `SEED_ADMIN_PASSWORD` or `SEED_DOCTOR_PASSWORD` does not silently rotate stored account passwords.

### Fictional demonstration accounts

- Administrator: `admin@careline.test`
- Doctors: `ananya@careline.test`, `rohan@careline.test`, `priya@careline.test`, `arjun@careline.test`, `meera@careline.test`, `kabir@careline.test`

Use privately configured seed passwords and never publish them in this README or the repository.

Do not upload real patient data to this classroom project. Visit summaries and prescriptions are demonstration records, not a production electronic medical-record system. In-app reminders are complete; the email preference is ready for a transactional email provider, but no outbound email credentials are included. Password reset, diagnostic attachments and multi-clinic support remain outside the agreed version.

## References

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Mongoose transactions](https://mongoosejs.com/docs/transactions.html)
