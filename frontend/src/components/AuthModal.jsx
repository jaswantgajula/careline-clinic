import React, { useEffect, useRef, useState } from 'react';
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
let googleScriptPromise;
function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
      document.head.appendChild(script);
    });
  }
  return googleScriptPromise;
}

export default function AuthModal({ onClose, onLogin, onDemo, googleClientId }) {
  const [register, setRegister] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const googleButton = useRef();

  useEffect(() => {
    if (!googleClientId || !googleButton.current) return;
    let active = true;
    loadGoogleIdentity()
      .then(() => {
        if (!active || !googleButton.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            setBusy(true);
            setError('');
            try {
              onLogin(await api('/auth/google', { method: 'POST', body: { credential } }));
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          },
        });
        googleButton.current.replaceChildren();
        window.google.accounts.id.renderButton(googleButton.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          shape: 'rectangular',
          text: register ? 'signup_with' : 'signin_with',
          width: Math.min(400, Math.max(260, googleButton.current.clientWidth)),
        });
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [googleClientId, register, onLogin]);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = Object.fromEntries(new FormData(e.target));
    try {
      onLogin(await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={register ? 'Make room for better care' : 'Welcome back'} onClose={onClose}>
      <p className="muted">
        {register
          ? 'Create your patient account to book and manage visits.'
          : 'Sign in to your Careline account.'}
      </p>
      {googleClientId ? (
        <>
          <div ref={googleButton} className="google-button" aria-label="Sign in with Google" />
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>
        </>
      ) : (
        <Notice>
          Google sign-in will appear after the clinic configures its Google client ID.
        </Notice>
      )}
      <form onSubmit={submit}>
        {register && (
          <label className="field">
            Full name
            <input name="name" autoComplete="name" minLength={2} maxLength={80} required />
          </label>
        )}
        <label className="field">
          Email address
          <input name="email" autoComplete="email" type="email" required />
        </label>
        <label className="field">
          Password
          <input
            name="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            type="password"
            minLength={10}
            maxLength={72}
            required
          />
        </label>
        {register && <p className="muted">Use at least 10 characters.</p>}
        {error && <Notice error>{error}</Notice>}
        <button className="button primary full" disabled={busy}>
          {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <p className="auth-switch">
        {register ? 'Already have an account?' : 'New to Careline?'}{' '}
        <button
          className="text-link"
          onClick={() => {
            setRegister(!register);
            setError('');
          }}
        >
          {register ? 'Sign in' : 'Create account'}
        </button>
      </p>
      <button className="button subtle full" onClick={onDemo}>
        Explore without an account · Demo
      </button>
    </Modal>
  );
}
