# Careline Clinic

A MERN appointment scheduler for one clinic with multiple doctors. Includes responsive light and dark themes, a patient portal, doctor workspace, admin tools, Razorpay **test-mode** checkout and an optional AI specialty finder.

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
- Statuses for appointments and payments are stored separately.

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

Tests create and destroy an isolated MongoDB replica set; the first run may download the official MongoDB binary. They do not use your configured database. Coverage includes concurrent bookings, patient overlaps, rescheduling rollback, duplicate/late payments, refunds, ownership, input constraints, authentication and conflicting schedule changes.

The production frontend is built into `frontend/dist` and served by Express.

## Deployment

Use a Node-capable host and MongoDB Atlas. Build with `npm ci && npm run build`, set `NODE_ENV=production`, `HOST=0.0.0.0`, the host's `PORT`, your HTTPS `APP_ORIGIN`, and the service secrets. Start with `npm run start -w backend`. Serve the frontend and API from the same origin. Configure HTTPS, Razorpay webhooks, and automatic payment capture. This repository has not yet been deployed to a public host.

Do not upload real patient data to this classroom project. Password reset, email reminders, medical records and multi-clinic support are outside the agreed first version.

## References

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Mongoose transactions](https://mongoosejs.com/docs/transactions.html)
