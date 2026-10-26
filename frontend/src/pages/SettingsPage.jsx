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
export default function SettingsPage({ user, demo, health, onUser, onDemo, onLogin, notify }) {
  const [name, setName] = useState(user?.name || ''),
    [busy, setBusy] = useState(false),
    [preferences, setPreferences] = useState(
      user?.notificationPreferences || { inApp: true, email: true, reminders: true },
    );
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);
  useEffect(() => {
    if (user?.notificationPreferences) setPreferences(user.notificationPreferences);
  }, [user?.notificationPreferences]);
  async function save(e) {
    e.preventDefault();
    if (demo) {
      notify('Profile editing is available with a connected account.');
      return;
    }
    setBusy(true);
    try {
      const u = await api('/auth/me', { method: 'PATCH', body: { name } });
      onUser(u);
      notify('Profile updated.');
    } catch (e) {
      notify(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function savePreferences(next) {
    setPreferences(next);
    if (demo) {
      notify('Notification preferences updated for this preview.');
      return;
    }
    try {
      await api('/notifications/preferences', { method: 'PATCH', body: next });
      notify('Notification preferences updated.');
    } catch (e) {
      notify(e.message);
    }
  }
  return (
    <>
      <PageHeading
        title="Account settings"
        description="A few details that make your care more personal."
      />
      <div className="settings-grid">
        <form className="panel" onSubmit={save}>
          <h2>Your profile</h2>
          {user ? (
            <>
              <label className="field">
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                />
              </label>
              <label className="field">
                Email address
                <input value={user.email} disabled />
              </label>
              <p className="muted">Account type: {user.role}</p>
              <button className="button primary" disabled={busy || demo}>
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <>
              <p className="muted">Sign in to manage your account and appointments.</p>
              <button type="button" className="button primary" onClick={onLogin}>
                Sign in
              </button>
            </>
          )}
        </form>
        <section className="panel">
          <h2>{demo ? 'Explore the experience' : 'Connection status'}</h2>
          <p className="muted">
            {demo
              ? 'Demo records are fictional and saved only in this browser. No payments are taken and no symptom text is sent to AI.'
              : 'This project uses test payments. All appointment times are shown in IST.'}
          </p>
          {!demo && (
            <div className="integration-list">
              {[
                ['Clinic database', health.database],
                ['Google sign-in', health.googleAuth],
                ['Razorpay test payments', health.payments],
                ['AI specialty guidance', health.ai],
              ].map(([label, ready]) => (
                <div key={label}>
                  <span>{label}</span>
                  <Badge tone={ready ? 'green' : 'neutral'}>
                    {ready ? 'Connected' : 'Not configured'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {!demo && (
            <button className="button subtle" onClick={onDemo}>
              Explore the demo
            </button>
          )}
        </section>
        {user && (
          <section className="panel notification-settings">
            <h2>Notifications</h2>
            <p className="muted">
              Choose how Careline keeps you informed about appointments and waitlist offers.
            </p>
            {[
              ['inApp', 'In-app updates', 'Queue changes, payments and waitlist offers'],
              ['reminders', 'Appointment reminders', 'A reminder before your scheduled visit'],
              ['email', 'Email copies', 'Used when a clinic email provider is connected'],
            ].map(([key, label, description]) => (
              <label className="preference-row" key={key}>
                <span>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) =>
                    savePreferences({ ...preferences, [key]: event.target.checked })
                  }
                />
              </label>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
