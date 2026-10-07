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
export default function Doctors({ doctors, onBook, onProfile }) {
  const [search, setSearch] = useState(''),
    [specialty, setSpecialty] = useState('All specialties'),
    [sort, setSort] = useState('name');
  const specialties = ['All specialties', ...new Set(doctors.map((d) => d.specialty))];
  const filtered = doctors
    .filter(
      (d) =>
        (specialty === 'All specialties' || d.specialty === specialty) &&
        `${d.name} ${d.specialty}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'fee'
        ? a.fee - b.fee
        : sort === 'experience'
          ? b.experience - a.experience
          : a.name.localeCompare(b.name),
    );
  return (
    <>
      <PageHeading
        eyebrow="THE RIGHT CARE STARTS HERE"
        title="Find your doctor"
        description="A team of specialists, all under one roof."
      />
      <div className="search-toolbar">
        <label className="search-input">
          <Search size={20} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctors or specialties"
            aria-label="Search doctors"
          />
        </label>
        <label className="sort-control">
          <SlidersHorizontal size={17} />
          <select aria-label="Sort doctors" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Name A–Z</option>
            <option value="fee">Consultation fee</option>
            <option value="experience">Experience</option>
          </select>
        </label>
      </div>
      <div className="filter-chips">
        {specialties.map((s) => (
          <button
            className={specialty === s ? 'active' : ''}
            aria-pressed={specialty === s}
            onClick={() => setSpecialty(s)}
            key={s}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="result-count">
        {filtered.length} specialists <span>· In-person at Careline Clinic</span>
      </div>
      {filtered.length ? (
        <div className="doctor-grid">
          {filtered.map((d) => (
            <DoctorCard doctor={d} onBook={onBook} onProfile={onProfile} key={d._id} />
          ))}
        </div>
      ) : (
        <Empty icon={Search} title="No matching doctors">
          Try another name or specialty.
        </Empty>
      )}
      <div className="help-strip">
        <Sparkles size={23} />
        <div>
          <strong>Need help choosing a specialty?</strong>
          <p>Our care assistant can help you find a starting point.</p>
        </div>
        <Link className="button subtle" to="/assistant">
          Ask the assistant
        </Link>
      </div>
    </>
  );
}
