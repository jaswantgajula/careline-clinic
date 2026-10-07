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
export default function Assistant({ demo, user, doctors, onBook, onProfile }) {
  const [concern, setConcern] = useState(''),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    setResult(null);
    try {
      if (demo) {
        setResult({
          demo: true,
          explanation:
            'This is a sample response to demonstrate the experience. It has not evaluated your concern. Connect an AI provider to enable personalized specialty guidance.',
          doctors: doctors.filter((d) => d.specialty === 'General Physician'),
          specialty: 'General Physician',
        });
      } else {
        if (!user) throw new Error('Please sign in before using the care assistant.');
        setResult(await api('/recommendations', { method: 'POST', body: { concern, consent } }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="A THOUGHTFUL FIRST STEP"
        title="Let’s find your care team"
        description="Describe your concern in your own words. We’ll help you explore the right specialty."
      />
      <div className="assistant-layout">
        <section className="panel assistant-form">
          <div className="ai-heading">
            <span className="stat-icon blue">
              <Sparkles size={24} />
            </span>
            <div>
              <h2>How can we help?</h2>
              <p>A little context can make the next step clearer.</p>
            </div>
          </div>
          <form onSubmit={submit}>
            <label className="field">
              What have you been experiencing?
              <textarea
                value={concern}
                onChange={(e) => setConcern(e.target.value)}
                minLength={12}
                maxLength={1500}
                required
                rows={7}
                placeholder="Describe your concern, how long it has been happening, and anything else you think is helpful."
              />
            </label>
            <div className="character-count">{concern.length} / 1,500</div>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              I agree to send this description to the AI provider for specialty guidance. I won’t
              include identifying details.
            </label>
            <button
              className="button primary full"
              disabled={busy || !consent || concern.trim().length < 12}
            >
              <Sparkles size={18} />
              {busy
                ? 'Finding a starting point…'
                : demo
                  ? 'Preview sample guidance'
                  : 'Find a suitable specialty'}
            </button>
          </form>
          {error && <Notice error>{error}</Notice>}
          {result && (
            <div className="ai-result">
              <Badge>
                {result.demo
                  ? 'SAMPLE RESPONSE'
                  : result.urgent
                    ? 'SEEK URGENT HELP'
                    : 'SUGGESTED NEXT STEP'}
              </Badge>
              <h3>
                {result.urgent
                  ? 'Please seek urgent medical help'
                  : result.specialty || 'A little more information would help'}
              </h3>
              <p>{result.explanation}</p>
              {result.question && (
                <Notice>{result.question} Update your description above to continue.</Notice>
              )}
              {!result.urgent &&
                result.doctors?.map((d) => (
                  <DoctorCard doctor={d} onBook={onBook} onProfile={onProfile} key={d._id} />
                ))}
            </div>
          )}
        </section>
        <aside className="assistant-aside">
          <div className="mini-illustration">
            <HeartPulse size={46} strokeWidth={1.3} />
          </div>
          <h2>
            Guidance with
            <br />
            care built in.
          </h2>
          <div>
            <ShieldCheck size={21} />
            <p>
              <strong>You stay in control</strong>Suggestions help you choose a specialty. You
              decide who to book.
            </p>
          </div>
          <div>
            <Stethoscope size={21} />
            <p>
              <strong>A starting point, not a diagnosis</strong>Only a qualified healthcare
              professional can assess your condition.
            </p>
          </div>
          <div>
            <Info size={21} />
            <p>
              <strong>Urgent concern?</strong>This assistant cannot rule out emergencies. Seek
              immediate local medical help when you need urgent care.
            </p>
          </div>
          <Link to="/doctors" className="text-link">
            Prefer to browse? View all doctors
          </Link>
        </aside>
      </div>
    </>
  );
}
