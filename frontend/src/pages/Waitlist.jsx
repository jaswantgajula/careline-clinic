import React, { useEffect, useMemo, useState } from 'react';
import { AlarmClock, CalendarDays, CheckCircle2, Clock3, Sparkles, Trash2 } from 'lucide-react';
import PageHeading from '../components/PageHeading';
import { Badge, Empty, Notice, dateLabel, timeLabel } from '../components/UI';
import { api, checkout } from '../services/api';
import { dateKey } from '../services/demo';

function remaining(value, now) {
  const seconds = Math.max(0, Math.floor((new Date(value) - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export default function Waitlist({ demo, user, doctors, notify, onUpdate }) {
  const tomorrow = dateKey(new Date(Date.now() + 86400000));
  const [entries, setEntries] = useState(() =>
    demo
      ? [
          {
            _id: 'demo-offer',
            doctor: doctors[0],
            date: tomorrow,
            earliestHour: 9,
            latestHour: 13,
            status: 'offered',
            offeredStart: new Date(`${tomorrow}T11:00:00+05:30`).toISOString(),
            offerExpiresAt: new Date(Date.now() + 9 * 60000).toISOString(),
          },
        ]
      : [],
  );
  const [form, setForm] = useState({
    doctor: doctors[0]?._id || '',
    date: tomorrow,
    earliestHour: 9,
    latestHour: 17,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!form.doctor && doctors[0]) setForm((value) => ({ ...value, doctor: doctors[0]._id }));
  }, [doctors, form.doctor]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function load() {
    if (!demo && user) setEntries(await api('/waitlist'));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [demo, user]);

  const active = useMemo(
    () => entries.filter((entry) => ['active', 'offered'].includes(entry.status)),
    [entries],
  );

  async function join(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (demo) {
        const doctor = doctors.find((item) => item._id === form.doctor);
        setEntries((current) => [
          {
            ...form,
            _id: `wait-${Date.now()}`,
            doctor,
            status: 'active',
            createdAt: new Date().toISOString(),
          },
          ...current,
        ]);
      } else {
        await api('/waitlist', { method: 'POST', body: form });
        await load();
      }
      notify('You’re on the waitlist. We’ll alert you when a matching slot opens.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry) {
    try {
      if (demo) setEntries((current) => current.filter((item) => item._id !== entry._id));
      else {
        await api(`/waitlist/${entry._id}`, { method: 'DELETE' });
        await load();
      }
      notify('Waitlist request removed.');
    } catch (e) {
      setError(e.message);
    }
  }

  async function accept(entry) {
    setBusy(true);
    setError('');
    try {
      if (demo) {
        const appointment = {
          _id: `CL-${Date.now().toString().slice(-5)}`,
          doctor: entry.doctor,
          patient: user,
          start: entry.offeredStart,
          reason: 'Waitlist appointment',
          fee: entry.doctor.fee,
          status: 'confirmed',
          payment: { status: 'paid', amount: entry.doctor.fee * 100 },
        };
        onUpdate(appointment, true);
        setEntries((current) =>
          current.map((item) => (item._id === entry._id ? { ...item, status: 'accepted' } : item)),
        );
      } else {
        const config = await api(`/waitlist/${entry._id}/accept`, { method: 'POST' });
        const payment = await checkout(config, user);
        await api('/payments/verify', { method: 'POST', body: payment });
        await load();
        onUpdate();
      }
      notify('Waitlist slot accepted. Your appointment is confirmed.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="A BETTER CHANCE AT AN EARLIER VISIT"
        title="Smart waitlist"
        description="Tell us when you are flexible. If a matching slot opens, it is held for you for 10 minutes."
      />
      <div className="waitlist-layout">
        <section className="panel waitlist-form">
          <div className="section-heading">
            <span className="stat-icon violet">
              <Sparkles size={22} />
            </span>
            <div>
              <h2>Join a waitlist</h2>
              <p>Choose a doctor, date and time window.</p>
            </div>
          </div>
          <form onSubmit={join}>
            <label className="field">
              Doctor
              <select
                value={form.doctor}
                required
                onChange={(e) => setForm({ ...form, doctor: e.target.value })}
              >
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name} · {doctor.specialty}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Preferred date
              <input
                type="date"
                min={dateKey()}
                value={form.date}
                required
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label className="field">
                From
                <select
                  value={form.earliestHour}
                  onChange={(e) => setForm({ ...form, earliestHour: Number(e.target.value) })}
                >
                  {[8, 9, 10, 11, 12, 13, 14, 15, 16].map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Until
                <select
                  value={form.latestHour}
                  onChange={(e) => setForm({ ...form, latestHour: Number(e.target.value) })}
                >
                  {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className="button primary full" disabled={busy || !form.doctor}>
              {busy ? 'Saving…' : 'Join waitlist'}
            </button>
          </form>
          <Notice>
            Offers expire automatically, so a cancelled slot never stays blocked indefinitely.
          </Notice>
        </section>
        <section>
          <div className="list-heading">
            <div>
              <h2>Your requests</h2>
              <p>{active.length} active</p>
            </div>
          </div>
          {error && <Notice error>{error}</Notice>}
          {entries.length ? (
            <div className="waitlist-cards">
              {entries.map((entry) => (
                <article
                  className={`waitlist-card ${entry.status === 'offered' ? 'offered' : ''}`}
                  key={entry._id}
                >
                  <header>
                    <div>
                      <strong>{entry.doctor?.name}</strong>
                      <span>{entry.doctor?.specialty}</span>
                    </div>
                    <Badge
                      tone={
                        entry.status === 'offered'
                          ? 'amber'
                          : entry.status === 'accepted'
                            ? 'green'
                            : 'neutral'
                      }
                    >
                      {entry.status}
                    </Badge>
                  </header>
                  <div className="waitlist-meta">
                    <span>
                      <CalendarDays size={16} />
                      {dateLabel(`${entry.date}T12:00:00+05:30`)}
                    </span>
                    <span>
                      <Clock3 size={16} />
                      {entry.earliestHour}:00–{entry.latestHour}:00
                    </span>
                  </div>
                  {entry.status === 'offered' && (
                    <div className="offer-box">
                      <AlarmClock size={22} />
                      <div>
                        <small>RESERVED FOR YOU</small>
                        <strong>
                          {dateLabel(entry.offeredStart)} · {timeLabel(entry.offeredStart)}
                        </strong>
                      </div>
                      <span className="countdown">{remaining(entry.offerExpiresAt, now)}</span>
                    </div>
                  )}
                  <footer>
                    {entry.status === 'offered' && (
                      <button
                        className="button primary small"
                        disabled={busy || new Date(entry.offerExpiresAt) <= now}
                        onClick={() => accept(entry)}
                      >
                        <CheckCircle2 size={16} />
                        Accept & pay
                      </button>
                    )}
                    {['active', 'offered'].includes(entry.status) && (
                      <button className="text-link danger" onClick={() => remove(entry)}>
                        <Trash2 size={15} />
                        Leave waitlist
                      </button>
                    )}
                  </footer>
                </article>
              ))}
            </div>
          ) : (
            <Empty icon={AlarmClock} title="No waitlist requests">
              Join a waitlist when your ideal time is unavailable.
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}
