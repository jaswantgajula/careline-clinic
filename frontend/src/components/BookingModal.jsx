import React, { useEffect, useState } from 'react';
import { CalendarDays, Clock3, ShieldCheck, Check, ChevronLeft, CreditCard } from 'lucide-react';
import { Modal, Avatar, money, timeLabel, dateLabel, Notice, Busy } from './UI';
import { daysAhead, demoSlots, dateKey } from '../services/demo';
import { api, checkout } from '../services/api';
export default function BookingModal({
  doctor,
  appointment,
  demo,
  user,
  bookings,
  onClose,
  onDone,
}) {
  const [date, setDate] = useState(daysAhead(1)),
    [slots, setSlots] = useState([]),
    [selected, setSelected] = useState(''),
    [step, setStep] = useState(0),
    [reason, setReason] = useState(appointment?.reason || ''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [consent, setConsent] = useState(false),
    [result, setResult] = useState('');
  useEffect(() => {
    let current = true;
    setSelected('');
    setLoading(true);
    setError('');
    (demo
      ? Promise.resolve(demoSlots(doctor, date, bookings))
      : api(`/doctors/${doctor._id}/slots?date=${date}`)
    )
      .then((s) => {
        if (current) setSlots(s);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [doctor?._id, date]);
  async function confirm() {
    setBusy(true);
    setError('');
    try {
      if (appointment) {
        if (demo) {
          if (
            bookings.some(
              (a) => a._id !== appointment._id && a.status === 'confirmed' && a.start === selected,
            )
          )
            throw new Error('You already have an appointment at this time.');
          onDone({ ...appointment, start: selected }, false);
        } else {
          await api(`/appointments/${appointment._id}/reschedule`, {
            method: 'POST',
            body: { start: selected },
          });
          onDone();
        }
        setResult('Your appointment has been rescheduled.');
      } else if (demo) {
        if (bookings.some((a) => a.status === 'confirmed' && a.start === selected))
          throw new Error('You already have an appointment at this time.');
        onDone(
          {
            _id: `CL-${Date.now().toString().slice(-6)}`,
            doctor,
            patient: user,
            start: selected,
            reason,
            fee: doctor.fee,
            status: 'confirmed',
            payment: { status: 'paid', amount: doctor.fee * 100 },
          },
          true,
        );
        setResult('Demo appointment confirmed. No payment was taken.');
      } else {
        let reservedId = null;
        try {
          const config = await api('/appointments', {
            method: 'POST',
            body: { doctor: doctor._id, start: selected, reason },
          });
          reservedId = config.appointment?._id;
          const payment = await checkout(config, user);
          const verified = await api('/payments/verify', { method: 'POST', body: payment });
          onDone();
          setResult(
            verified.status === 'verified'
              ? 'Payment verified. Check your appointment for confirmation.'
              : 'Payment is processing. Your appointment will update after verification.',
          );
        } catch (checkoutErr) {
          if (reservedId) {
            void api(`/appointments/${reservedId}/release`, { method: 'POST' }).catch(() => {});
          }
          throw checkoutErr;
        }
      }
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={appointment ? 'Reschedule appointment' : 'Book your visit'}
      onClose={busy ? () => {} : onClose}
      wide
    >
      {step === 2 ? (
        <div className="booking-success">
          <div className="success-icon">
            <Check size={34} />
          </div>
          <h2>You’re all set</h2>
          <p>{result}</p>
          <div className="summary-row">
            <CalendarDays size={18} />
            {dateLabel(selected)} · {timeLabel(selected)}
          </div>
          <button className="button primary" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="booking-doctor">
            <Avatar doctor={doctor} />
            <div>
              <h3>{doctor.name}</h3>
              <p>{doctor.specialty}</p>
            </div>
            <strong>{money(appointment?.fee || doctor.fee)}</strong>
          </div>
          <div className="stepper">
            <span className="active">
              1 <b>Choose a time</b>
            </span>
            <i />
            <span className={step === 1 ? 'active' : ''}>
              2 <b>{appointment ? 'Review changes' : 'Review & pay'}</b>
            </span>
          </div>
          {error && <Notice error>{error}</Notice>}
          {step === 0 ? (
            <>
              <label className="field">
                Appointment date
                <input
                  type="date"
                  value={date}
                  min={dateKey()}
                  max={daysAhead(30)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <div className="label-row">
                <strong>Available times</strong>
                <span>IST · 30-minute visits</span>
              </div>
              {loading ? (
                <Busy />
              ) : slots.length ? (
                <div className="slot-grid">
                  {slots.map((s) => (
                    <button
                      key={s}
                      aria-pressed={selected === s}
                      className={`slot ${selected === s ? 'selected' : ''}`}
                      onClick={() => setSelected(s)}
                    >
                      {timeLabel(s)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted empty-slots">
                  No available slots on this date. Please choose another day.
                </p>
              )}
              {!appointment && (
                <label className="field">
                  Reason for your visit <span className="muted">(optional)</span>
                  <textarea
                    maxLength={1000}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Anything you would like your doctor to know…"
                    rows={3}
                  />
                </label>
              )}
              <footer className="modal-footer">
                <span>
                  <Clock3 size={16} />
                  All times in India Standard Time
                </span>
                <button
                  className="button primary"
                  disabled={!selected || loading}
                  onClick={() => setStep(1)}
                >
                  Continue
                </button>
              </footer>
            </>
          ) : (
            <>
              <div className="review-box">
                <div>
                  <span>Date & time</span>
                  <strong>
                    {dateLabel(selected)} · {timeLabel(selected)}
                  </strong>
                </div>
                <div>
                  <span>Visit type</span>
                  <strong>In-person · Careline Clinic</strong>
                </div>
                <div>
                  <span>Consultation fee</span>
                  <strong>{money(appointment?.fee || doctor.fee)}</strong>
                </div>
                <div className="total">
                  <span>{appointment ? 'Existing payment' : 'Total payable'}</span>
                  <strong>{appointment ? 'Carried over' : money(doctor.fee)}</strong>
                </div>
              </div>
              <p className="policy">
                <ShieldCheck size={19} />
                Cancel or reschedule up to 2 hours before your appointment. Eligible cancellations
                receive a full {demo ? 'simulated' : 'test'} refund.
              </p>
              {!appointment && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I agree to the cancellation policy and understand this is a{' '}
                  {demo ? 'demo booking with no actual payment' : 'Razorpay test payment'}.
                </label>
              )}
              <footer className="modal-footer">
                <button className="button ghost" disabled={busy} onClick={() => setStep(0)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  className="button primary"
                  disabled={busy || (!appointment && !consent)}
                  onClick={confirm}
                >
                  {busy
                    ? 'Processing…'
                    : appointment
                      ? 'Confirm reschedule'
                      : demo
                        ? 'Simulate payment'
                        : `Pay ${money(doctor.fee)}`}
                  {!appointment && <CreditCard size={17} />}
                </button>
              </footer>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
