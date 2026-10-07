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
export default function Manage({ demo, doctors, bookings, onSave, notify, refresh }) {
  const [list, setList] = useState(doctors),
    [editing, setEditing] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const blank = {
    name: '',
    email: '',
    password: '',
    specialty: 'General Physician',
    qualification: '',
    experience: 0,
    fee: 600,
    bio: '',
  };
  useEffect(() => {
    if (demo) setList(doctors);
    else
      api('/admin/doctors')
        .then(setList)
        .catch((e) => setError(e.message));
  }, [doctors, demo]);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (demo) {
        const d = {
          ...editing,
          _id: editing._id || `demo-${Date.now()}`,
          initials: editing.name
            .replace(/^Dr\. /, '')
            .split(' ')
            .map((x) => x[0])
            .slice(0, 2)
            .join(''),
          active: editing.active ?? true,
          color: 'blue',
          days: editing.days || [1, 2, 3, 4, 5, 6],
          start: editing.start || 9,
          end: editing.end || 17,
          breakStart: 13,
          breakEnd: 14,
          leave: editing.leave || [],
        };
        delete d.password;
        onSave(editing._id ? doctors.map((x) => (x._id === d._id ? d : x)) : [...doctors, d]);
      } else {
        await api(editing._id ? `/admin/doctors/${editing._id}` : '/admin/doctors', {
          method: editing._id ? 'PATCH' : 'POST',
          body: editing,
        });
        refresh();
      }
      setEditing(null);
      notify('Doctor profile saved.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(d) {
    try {
      if (demo) {
        if (
          d.active &&
          bookings.some(
            (a) =>
              a.doctor._id === d._id && a.status === 'confirmed' && new Date(a.start) > new Date(),
          )
        )
          throw new Error('Resolve future appointments before deactivating this doctor.');
        onSave(doctors.map((x) => (x._id === d._id ? { ...x, active: !x.active } : x)));
      } else {
        await api(`/admin/doctors/${d._id}`, { method: 'PATCH', body: { active: !d.active } });
        refresh();
      }
      notify('Doctor availability updated.');
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE BEHIND THE CARE"
        title="Manage doctors"
        description="Manage profiles, specialties, fees and clinic access."
        action={
          <button
            className="button primary"
            onClick={() => {
              setError('');
              setEditing(blank);
            }}
          >
            <Plus size={18} />
            Add doctor
          </button>
        }
      />
      {error && !editing && <Notice error>{error}</Notice>}
      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Doctor</th>
              <th>Specialty</th>
              <th>Consultation</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d._id}>
                <td>
                  <div className="table-doctor">
                    <Avatar doctor={d} />
                    <strong>{d.name}</strong>
                  </div>
                </td>
                <td>{d.specialty}</td>
                <td>{money(d.fee)}</td>
                <td>
                  <Badge tone={d.active ? 'green' : 'neutral'}>
                    {d.active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                <td>
                  <div className="table-actions">
                    <button
                      className="text-link"
                      onClick={() => {
                        setError('');
                        setEditing(d);
                      }}
                    >
                      Edit
                    </button>
                    <button className="text-link" onClick={() => toggle(d)}>
                      {d.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal
          title={editing._id ? 'Edit doctor profile' : 'Add a doctor'}
          onClose={() => !busy && setEditing(null)}
          wide
        >
          <form onSubmit={save}>
            {error && <Notice error>{error}</Notice>}
            <div className="form-grid">
              {[
                ['name', 'Full name', 'text'],
                ['specialty', 'Specialty', 'text'],
                ['qualification', 'Qualifications', 'text'],
                ['experience', 'Years of experience', 'number'],
                ['fee', 'Consultation fee (₹)', 'number'],
                ...(!editing._id
                  ? [
                      ['email', 'Account email', 'email'],
                      ['password', 'Temporary password', 'password'],
                    ]
                  : []),
              ].map(([key, label, type]) => (
                <label className="field" key={key}>
                  {label}
                  <input
                    type={type}
                    required
                    value={editing[key] ?? ''}
                    min={key === 'fee' ? 1 : 0}
                    max={key === 'experience' ? 60 : 100000}
                    minLength={type === 'password' ? 10 : undefined}
                    maxLength={type === 'password' ? 72 : 100}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        [key]: type === 'number' ? +e.target.value : e.target.value,
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <label className="field">
              About this doctor
              <textarea
                value={editing.bio}
                maxLength={1000}
                rows={3}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              />
            </label>
            <footer className="modal-footer">
              <span>Specialties are maintained on doctor profiles.</span>
              <button className="button primary" disabled={busy}>
                {busy ? 'Saving…' : 'Save doctor'}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
