import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Stethoscope,
  CalendarDays,
  Sparkles,
  Settings,
  LogOut,
  Search,
  Plus,
  Clock3,
  ShieldCheck,
  HeartPulse,
  ChevronRight,
  Menu,
  X,
  MapPin,
  CheckCircle2,
  Users,
  Wallet,
  CalendarCheck,
  SlidersHorizontal,
  Mail,
  Phone,
  Info,
  ChevronDown,
} from 'lucide-react';
import { api } from '../services/api';
import { daysAhead, dateKey } from '../services/demo';
import {
  Avatar,
  Badge,
  Empty,
  Busy,
  Modal,
  Notice,
  money,
  dateLabel,
  timeLabel,
} from '../components/UI';
import DoctorCard from '../components/DoctorCard';
import PageHeading from '../components/PageHeading';
export default function Schedule({ demo, doctor, bookings, onSave, notify }) {
  const [form, setForm] = useState(doctor),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [leaveDate, setLeaveDate] = useState(daysAhead(1));
  useEffect(() => {
    if (!demo)
      api('/doctor/profile')
        .then(setForm)
        .catch((e) => setError(e.message));
  }, []);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        days: form.days,
        start: form.start,
        end: form.end,
        breakStart: form.breakStart,
        breakEnd: form.breakEnd,
        leave: form.leave,
      };
      if (
        !body.days.length ||
        body.start >= body.end ||
        body.breakStart < body.start ||
        body.breakEnd > body.end ||
        body.breakEnd < body.breakStart
      )
        throw new Error('Check working days, working hours and breaks.');
      if (demo) {
        for (const a of bookings.filter(
          (a) => a.status === 'confirmed' && new Date(a.start) > new Date(),
        )) {
          const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
            .format(new Date(a.start))
            .split(':');
          const h = +parts[0] + +parts[1] / 60;
          const day = new Date(`${dateKey(new Date(a.start))}T12:00Z`).getUTCDay();
          if (
            body.leave.includes(dateKey(new Date(a.start))) ||
            !body.days.includes(day) ||
            h < body.start ||
            h >= body.end ||
            (h >= body.breakStart && h < body.breakEnd)
          )
            throw new Error('These changes conflict with an existing appointment.');
        }
        onSave(form);
      } else setForm(await api('/doctor/schedule', { method: 'PATCH', body }));
      notify('Availability updated.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE SPACE FOR GREAT CARE"
        title="My availability"
        description="Set your weekly schedule and plan time away."
      />
      {error && <Notice error>{error}</Notice>}
      {!form ? (
        <Busy />
      ) : (
        <form className="panel schedule-panel" onSubmit={save}>
          <h2>Weekly working hours</h2>
          <p className="muted">All times are in IST. Appointments last 30 minutes.</p>
          <label className="field">Working days</label>
          <div className="weekday-picker">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
              <button
                type="button"
                className={form.days.includes(i) ? 'selected' : ''}
                aria-pressed={form.days.includes(i)}
                onClick={() =>
                  setForm({
                    ...form,
                    days: form.days.includes(i)
                      ? form.days.filter((x) => x !== i)
                      : [...form.days, i],
                  })
                }
                key={d}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="form-grid">
            {[
              ['start', 'Start hour'],
              ['end', 'End hour'],
              ['breakStart', 'Break starts'],
              ['breakEnd', 'Break ends'],
            ].map(([key, label]) => (
              <label className="field" key={key}>
                {label}
                <select
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: +e.target.value })}
                >
                  {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => (
                    <option value={h} key={h}>
                      {String(h).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <hr />
          <h2>Planned time off</h2>
          <p className="muted">
            Block a date to stop new bookings. Existing appointments must be resolved first.
          </p>
          <div className="inline-form">
            <label className="field">
              Date
              <input
                type="date"
                min={dateKey()}
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="button subtle"
              onClick={() => {
                if (leaveDate && !form.leave.includes(leaveDate))
                  setForm({ ...form, leave: [...form.leave, leaveDate] });
              }}
            >
              Block date
            </button>
          </div>
          <div className="filter-chips">
            {form.leave.map((d) => (
              <button
                type="button"
                onClick={() => setForm({ ...form, leave: form.leave.filter((x) => x !== d) })}
                key={d}
              >
                {d}
                <X size={14} />
                <span className="sr-only">Remove blocked date</span>
              </button>
            ))}
          </div>
          <footer className="modal-footer">
            <span>Changes apply to future availability.</span>
            <button className="button primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save availability'}
            </button>
          </footer>
        </form>
      )}
    </>
  );
}
