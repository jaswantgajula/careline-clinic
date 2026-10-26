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
export default function Appointments({ user, demo, bookings, onReschedule, onUpdate, notify }) {
  const [tab, setTab] = useState('Upcoming'),
    [search, setSearch] = useState(''),
    [detail, setDetail] = useState(null),
    [cancelTarget, setCancelTarget] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const role = user?.role || 'patient';
  const filtered = bookings
    .filter(
      (a) =>
        (tab === 'All' ||
          (tab === 'Upcoming' && ['pending', 'confirmed'].includes(a.status)) ||
          (tab === 'Past' && ['completed', 'no-show'].includes(a.status)) ||
          (tab === 'Cancelled' && ['cancelled', 'expired'].includes(a.status))) &&
        `${a.doctor?.name || 'Doctor'} ${a.patient?.name || ''}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => new Date(a.start) - new Date(b.start));
  async function cancelVisit() {
    setBusy(true);
    setError('');
    try {
      if (demo)
        onUpdate({
          ...cancelTarget,
          status: 'cancelled',
          payment: { ...cancelTarget.payment, status: 'refunded' },
        });
      else {
        await api(`/appointments/${cancelTarget._id}/cancel`, { method: 'POST' });
        onUpdate();
      }
      setCancelTarget(null);
      setDetail(null);
      notify(
        demo
          ? 'Appointment cancelled. Demo refund completed.'
          : 'Appointment cancelled. Your test refund is pending.',
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function attendance(a, status) {
    try {
      if (demo) onUpdate({ ...a, status });
      else {
        await api(`/appointments/${a._id}/status`, { method: 'POST', body: { status } });
        onUpdate();
      }
      notify('Appointment updated.');
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR CARE, ORGANIZED"
        title={role === 'patient' ? 'My appointments' : 'Appointments'}
        description="Everything you need for your next visit, in one place."
        action={
          role === 'patient' ? (
            <Link to="/doctors" className="button primary">
              <Plus size={18} />
              Book appointment
            </Link>
          ) : null
        }
      />
      <div className="appointments-tools">
        <div className="tabs">
          {['Upcoming', 'Past', 'Cancelled', 'All'].map((t) => (
            <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <label className="search-input compact">
          <Search size={18} />
          <input
            aria-label="Search appointments"
            placeholder="Search appointments"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      {!user ? (
        <Empty title="Your appointments belong here">Sign in to see and manage your visits.</Empty>
      ) : filtered.length ? (
        <div className="appointment-list">
          {filtered.map((a) => {
            const changeable =
              a.status === 'confirmed' && new Date(a.start) - Date.now() >= 7200000;
            return (
              <article className="appointment-card" key={a._id}>
                <div className="appointment-date">
                  <strong>
                    {new Date(a.start).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      timeZone: 'Asia/Kolkata',
                    })}
                  </strong>
                  <span>
                    {new Date(a.start).toLocaleDateString('en-IN', {
                      month: 'short',
                      timeZone: 'Asia/Kolkata',
                    })}
                  </span>
                </div>
                <Avatar doctor={a.doctor || { name: 'Doctor', color: 'blue' }} />
                <div className="appointment-info">
                  <h3>{a.doctor?.name || 'Assigned Specialist'}</h3>
                  <p>
                    {role === 'patient' ? a.doctor?.specialty || 'General' : a.patient?.name}
                    <span> · </span>
                    {timeLabel(a.start)} IST
                  </p>
                  <span className="appointment-id">
                    {a._id.slice(-8).toUpperCase()} · {money(a.fee)}
                  </span>
                </div>
                <Badge
                  tone={
                    a.status === 'confirmed' || a.status === 'completed'
                      ? 'green'
                      : a.status === 'cancelled'
                        ? 'red'
                        : 'neutral'
                  }
                >
                  {a.status}
                </Badge>
                <div className="appointment-actions">
                  <button className="button subtle small" onClick={() => setDetail(a)}>
                    Details
                  </button>
                  {role === 'patient' && changeable && (
                    <button className="text-link" onClick={() => onReschedule(a)}>
                      Reschedule
                    </button>
                  )}
                  {(((role === 'admin' || role === 'doctor') && a.status === 'confirmed') ||
                    (role === 'patient' && changeable)) && (
                    <button
                      className="text-link danger"
                      onClick={() => {
                        setError('');
                        setCancelTarget(a);
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  {role === 'doctor' &&
                    a.status === 'confirmed' &&
                    new Date(a.start).getTime() + 1800000 <= Date.now() && (
                      <>
                        <button className="text-link" onClick={() => attendance(a, 'completed')}>
                          Complete
                        </button>
                        <button className="text-link" onClick={() => attendance(a, 'no-show')}>
                          No-show
                        </button>
                      </>
                    )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty icon={CalendarDays} title="Nothing here just yet">
          Appointments in this category will appear here.
        </Empty>
      )}
      {detail && (
        <Modal title="Appointment details" onClose={() => setDetail(null)}>
          <div className="booking-doctor">
            <Avatar doctor={detail.doctor || { name: 'Doctor', color: 'blue' }} />
            <div>
              <h3>{detail.doctor?.name || 'Assigned Specialist'}</h3>
              <p>{detail.doctor?.specialty || 'General Consultation'}</p>
            </div>
          </div>
          <div className="review-box">
            <div>
              <span>When</span>
              <strong>
                {dateLabel(detail.start)} · {timeLabel(detail.start)}
              </strong>
            </div>
            <div>
              <span>Status</span>
              <Badge tone="green">{detail.status}</Badge>
            </div>
            <div>
              <span>Patient</span>
              <strong>{detail.patient?.name || user?.name}</strong>
            </div>
            <div>
              <span>Consultation</span>
              <strong>{money(detail.fee)}</strong>
            </div>
            <div>
              <span>Payment</span>
              <strong>{detail.payment?.status || 'Awaiting payment'}</strong>
            </div>
            {detail.payment?.paymentId && (
              <div>
                <span>Payment reference</span>
                <small>{detail.payment.paymentId}</small>
              </div>
            )}
          </div>
          <h3>Reason for visit</h3>
          <p className="muted">{detail.reason || 'No additional information provided.'}</p>
          <p className="policy">
            Please arrive 10 minutes before your appointment. All appointment times are in IST.
          </p>
        </Modal>
      )}
      {cancelTarget && (
        <Modal title="Cancel this appointment?" onClose={() => !busy && setCancelTarget(null)}>
          <p>
            Your visit with {cancelTarget.doctor?.name || 'your specialist'} on{' '}
            {dateLabel(cancelTarget.start)} will be cancelled.
          </p>
          <Notice>
            A full {demo ? 'simulated' : 'test'} refund of {money(cancelTarget.fee)} will be
            requested.
          </Notice>
          {error && <Notice error>{error}</Notice>}
          <footer className="modal-footer">
            <button className="button subtle" disabled={busy} onClick={() => setCancelTarget(null)}>
              Keep appointment
            </button>
            <button className="button destructive" disabled={busy} onClick={cancelVisit}>
              {busy ? 'Cancelling…' : 'Cancel appointment'}
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
