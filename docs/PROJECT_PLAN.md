# Clinic appointment scheduler

## Agreed scope

One clinic, multiple doctors. Patient, doctor and administrator roles. MERN application with Razorpay test payments and an AI-assisted specialization finder. Patients always choose their doctor; recommendations are not diagnoses.

## Booking policies

- 30-minute appointments, up to 30 days ahead.
- 10-minute payment reservation; enforce reservation expiry on the server.
- Cancel up to two hours before the visit for a full test refund; clinic cancellations receive full refunds.
- Reschedule with the same doctor up to two hours before the visit, preserving payment and keeping the original slot if the operation fails.
- Doctor changes require cancellation and a new booking.
- Track appointments and payments independently. Verify payment signatures and webhook signatures, enforce idempotency, and reconcile late payments before confirmation or refund.

## Experience

A calm, precise clinic workspace: deep navy navigation, clear blue actions, generous white surfaces, readable typography and accessible controls. Responsive patient discovery, doctor profiles, guided booking, appointment management, doctor scheduling and administrative overview. Clear loading, empty, error, success and disabled states. Keyboard navigation and reduced-motion support.

## Extended clinic operations

- Google sign-in for patients with server verification and conservative account linking.
- Patient check-in, live clinic queue states and real-time in-app updates.
- Oldest-first smart waitlists with expiring reserved offers.
- Notification center, reminder preferences and appointment audit history.
- Calendar export, admin analytics, AI helpfulness feedback and installable/offline PWA shell.
- Doctor consultation summaries with private notes, published patient instructions and PDF export.
- Verified post-visit star ratings and written feedback for completed appointments.

## Delivery order

1. Reviewable frontend with clearly labelled sample data.
2. Authentication, authorization, doctor records and availability in MongoDB/Express.
3. Transactional booking and Razorpay test payment/refund lifecycle.
4. AI specialization matching against the actual clinic directory.
5. Integration tests, accessibility checks, documentation and deployment.

## AI boundaries

Send only necessary concern text and supported specialties to the selected provider. Do not send identity or payment data. No diagnosis, prescriptions or invented doctors. Manual browsing remains available. Obtain consent before sending concern text; allow review before attaching a summary to a booking. Urgent concerns must not be treated as routine scheduling or reliably ruled out by AI.
