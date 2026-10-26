import AuthModal from './components/AuthModal';
import SettingsPage from './pages/SettingsPage';
import Manage from './pages/Manage';
import Schedule from './pages/Schedule';
import Assistant from './pages/Assistant';
import Appointments from './pages/Appointments';
import Doctors from './pages/Doctors';
import Overview from './pages/Overview';
import React, { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Link } from 'react-router-dom';
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
  Moon,
  Sun,
} from 'lucide-react';
import { api } from './services/api';
import {
  doctors as sampleDoctors,
  initialBookings,
  demoUser,
  daysAhead,
  dateKey,
} from './services/demo';
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
} from './components/UI';
import DoctorCard from './components/DoctorCard';
import BookingModal from './components/BookingModal';
function useStored(key, fallback) {
  const [value, set] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback();
    } catch {
      return fallback();
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, set];
}
export default function App() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('loading'),
    [health, setHealth] = useState({}),
    [user, setUser] = useState(null),
    [doctors, setDoctors] = useState([]),
    [bookings, setBookings] = useState([]),
    [demoBookings, setDemoBookings] = useStored('careline-demo-bookings-v1', initialBookings),
    [demoDoctors, setDemoDoctors] = useStored('careline-demo-doctors-v1', () => sampleDoctors),
    [demoRole, setDemoRole] = useState('patient'),
    [booking, setBooking] = useState(null),
    [profile, setProfile] = useState(null),
    [authModal, setAuthModal] = useState(false),
    [toast, setToast] = useState(''),
    [mobile, setMobile] = useState(false),
    [theme, setTheme] = useStored('careline-theme-v1', () => 'light'),
    [loadError, setLoadError] = useState('');
  const demo = mode === 'demo';
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.style.backgroundColor = theme === 'dark' ? '#111827' : '#f4f7fb';
  }, [theme]);
  const currentUser = demo
    ? {
        ...demoUser,
        role: demoRole,
        name:
          demoRole === 'doctor'
            ? demoDoctors[0].name
            : demoRole === 'admin'
              ? 'Clinic Administrator'
              : demoUser.name,
      }
    : user;
  const role = currentUser?.role || 'patient';
  const directory = demo ? demoDoctors.filter((d) => d.active) : doctors;
  const allBookings = demo ? demoBookings : bookings;
  const visibleBookings =
    demo && role === 'doctor'
      ? allBookings.filter((a) => a.doctor?._id === demoDoctors[0]?._id)
      : allBookings;
  async function refresh() {
    try {
      const d = await api('/doctors');
      setDoctors(d);
      if (user) setBookings(await api('/appointments'));
      setLoadError('');
    } catch (e) {
      setLoadError(e.message);
    }
  }
  useEffect(() => {
    let active = true;
    api('/health')
      .then(async (h) => {
        if (!active) return;
        setHealth(h);
        if (!h.database) {
          setMode('demo');
          return;
        }
        setMode('live');
        setDoctors(await api('/doctors'));
        try {
          const u = await api('/auth/me');
          if (active) setUser(u);
        } catch {}
      })
      .catch(() => {
        if (active) setMode('demo');
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (user && mode === 'live') refresh();
  }, [user, mode]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  function book(d) {
    if (!currentUser) {
      setAuthModal(true);
      return;
    }
    if (role !== 'patient') {
      setToast('Use a patient account to book a consultation.');
      return;
    }
    setBooking({ doctor: d });
  }
  function done(a, isNew) {
    if (demo && a)
      setDemoBookings((prev) =>
        isNew ? [...prev, a] : prev.map((x) => (x._id === a._id ? a : x)),
      );
    else refresh();
  }
  async function signOut() {
    if (!demo) await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setBookings([]);
    navigate('/');
  }
  const links =
    role === 'patient'
      ? [
          ['/', 'Overview', LayoutDashboard],
          ['/doctors', 'Find a doctor', Stethoscope],
          ['/appointments', 'My appointments', CalendarDays],
          ['/assistant', 'Care assistant', Sparkles],
        ]
      : role === 'doctor'
        ? [
            ['/', 'Overview', LayoutDashboard],
            ['/appointments', 'Appointments', CalendarDays],
            ['/schedule', 'My availability', Clock3],
          ]
        : [
            ['/', 'Overview', LayoutDashboard],
            ['/appointments', 'Appointments', CalendarDays],
            ['/manage', 'Manage doctors', Users],
          ];
  if (mode === 'loading') return <Busy />;
  const common = {
    demo,
    user: currentUser,
    doctors: directory,
    bookings: visibleBookings,
    onBook: book,
    onProfile: setProfile,
    notify: setToast,
  };
  return (
    <div className="app" data-theme={theme}>
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <Link to="/" className="brand" onClick={() => setMobile(false)}>
          <span className="brand-symbol">
            <Plus size={27} strokeWidth={3} />
          </span>
          <span>
            careline<span className="brand-period">.</span>
            <small>CLINIC & WELLNESS</small>
          </span>
        </Link>
        <div className="workspace-label">
          {role === 'patient'
            ? 'YOUR HEALTH SPACE'
            : role === 'doctor'
              ? 'DOCTOR WORKSPACE'
              : 'CLINIC MANAGEMENT'}
        </div>
        <nav>
          {links.map(([to, label, Icon]) => (
            <NavLink end={to === '/'} key={to} to={to} onClick={() => setMobile(false)}>
              <Icon size={20} />
              {label}
              {to === '/assistant' && <span className="ai-pill">AI</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="clinic-card">
            <div className="clinic-icon">
              <HeartPulse size={22} />
            </div>
            <strong>Care that feels personal.</strong>
            <p>One clinic. A team that puts you first.</p>
            <span>
              <MapPin size={13} />
              In-person consultations
            </span>
          </div>
          <NavLink className="settings-link" to="/settings" onClick={() => setMobile(false)}>
            <Settings size={19} />
            Settings
          </NavLink>
          <div className="sidebar-user">
            <span className="user-avatar">
              {role === 'doctor' ? 'AS' : role === 'admin' ? 'CA' : 'AM'}
            </span>
            <div>
              <strong>{currentUser?.name || 'Welcome to Careline'}</strong>
              <small>
                {currentUser
                  ? `${role[0].toUpperCase() + role.slice(1)} account`
                  : 'Sign in to book your visit'}
              </small>
            </div>
            {currentUser && !demo ? (
              <button
                aria-label="Sign out"
                className="icon-button"
                onClick={() => signOut().catch((e) => setToast(e.message))}
              >
                <LogOut size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          aria-label="Close navigation"
          className="nav-backdrop"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-toggle"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Your clinic <ChevronRight size={14} />
            <strong>
              {role === 'patient'
                ? 'Patient portal'
                : role === 'doctor'
                  ? 'Doctor portal'
                  : 'Admin portal'}
            </strong>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="icon-button theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <span className="today">
              <CalendarDays size={15} />
              {dateLabel(new Date())}
            </span>
            {demo ? (
              <label className="role-select">
                <span>Preview as</span>
                <select
                  aria-label="Preview role"
                  value={demoRole}
                  onChange={(e) => {
                    setDemoRole(e.target.value);
                    navigate('/');
                  }}
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            ) : (
              <button
                className="button small subtle"
                onClick={() => (user ? navigate('/settings') : setAuthModal(true))}
              >
                {user ? 'My account' : 'Sign in'}
              </button>
            )}
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <Info size={15} />
            <span>
              Interactive demo · Sample profiles and simulated payments. Changes stay in this
              browser.
            </span>
            <button
              onClick={() => {
                setMode('live');
                setUser(null);
                setDoctors([]);
                setBookings([]);
                setAuthModal(true);
              }}
            >
              Connect account
            </button>
          </div>
        )}
        <main>
          {loadError && (
            <Notice error>
              {loadError}{' '}
              <button className="text-link" onClick={refresh}>
                Retry
              </button>
            </Notice>
          )}
          <Routes>
            <Route path="/" element={<Overview {...common} />} />
            <Route path="/doctors" element={<Doctors {...common} />} />
            <Route
              path="/appointments"
              element={
                <Appointments
                  {...common}
                  onReschedule={(a) => setBooking({ doctor: a.doctor, appointment: a })}
                  onUpdate={done}
                />
              }
            />
            <Route path="/assistant" element={<Assistant {...common} />} />
            <Route
              path="/schedule"
              element={
                role === 'doctor' ? (
                  <Schedule
                    demo={demo}
                    doctor={demo ? demoDoctors[0] : null}
                    bookings={visibleBookings}
                    onSave={(d) => setDemoDoctors((ds) => ds.map((x) => (x._id === d._id ? d : x)))}
                    notify={setToast}
                  />
                ) : (
                  <Empty title="Doctor access required">Sign in with your doctor account.</Empty>
                )
              }
            />
            <Route
              path="/manage"
              element={
                role === 'admin' ? (
                  <Manage
                    demo={demo}
                    doctors={demo ? demoDoctors : doctors}
                    bookings={allBookings}
                    onSave={setDemoDoctors}
                    notify={setToast}
                    refresh={refresh}
                  />
                ) : (
                  <Empty title="Administrator access required">
                    Sign in with your clinic administrator account.
                  </Empty>
                )
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsPage
                  user={currentUser}
                  demo={demo}
                  health={health}
                  onUser={setUser}
                  onDemo={() => {
                    setMode('demo');
                    navigate('/');
                  }}
                  onLogin={() => setAuthModal(true)}
                  notify={setToast}
                />
              }
            />
            <Route
              path="*"
              element={
                <Empty title="Page not found">
                  <Link to="/">Return to overview</Link>
                </Empty>
              }
            />
          </Routes>
          <footer className="page-footer">
            <span>© {new Date().getFullYear()} Careline Clinic</span>
            <span>
              <ShieldCheck size={14} />
              Thoughtful care. Every step of the way.
            </span>
          </footer>
        </main>
      </div>
      {booking && (
        <BookingModal
          {...booking}
          demo={demo}
          user={currentUser}
          bookings={allBookings}
          onClose={() => setBooking(null)}
          onDone={done}
        />
      )}
      {profile && (
        <Modal title="Meet your doctor" onClose={() => setProfile(null)}>
          <div className="profile-heading">
            <Avatar doctor={profile} large />
            <h2>{profile.name}</h2>
            <p className="specialty">{profile.specialty}</p>
            <p className="muted">{profile.qualification}</p>
          </div>
          <p>{profile.bio}</p>
          <div className="profile-facts">
            <span>
              <strong>{profile.experience} years</strong>Clinical experience
            </span>
            <span>
              <strong>{money(profile.fee)}</strong>Consultation fee
            </span>
          </div>
          <button
            className="button primary full"
            onClick={() => {
              setProfile(null);
              book(profile);
            }}
          >
            Choose an appointment
          </button>
        </Modal>
      )}
      {authModal && (
        <AuthModal
          onClose={() => setAuthModal(false)}
          onLogin={(u) => {
            setMode('live');
            setUser(u);
            setAuthModal(false);
            navigate('/');
          }}
          onDemo={() => {
            setMode('demo');
            setAuthModal(false);
            navigate('/');
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
