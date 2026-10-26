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
export default function Overview({ user, doctors, bookings, onBook, onProfile, demo }) {
  const patient = !user || user.role === 'patient';
  const next = bookings
    .filter(
      (a) =>
        ['confirmed', 'checked-in', 'waiting', 'in-consultation'].includes(a.status) &&
        new Date(a.start) > new Date(),
    )
    .sort((a, b) => new Date(a.start) - new Date(b.start))[0];
  const completed = bookings.filter((a) => a.status === 'completed').length;
  const total = bookings
    .filter((a) => ['paid', 'refund-pending'].includes(a.payment?.status))
    .reduce((s, a) => s + a.fee, 0);
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE CARE GOES A LONG WAY"
        title={`Good to see you${user ? `, ${user.name.replace(/^Dr\. /, '').split(' ')[0]}` : ''}.`}
        description={
          patient
            ? 'Let’s make time for your health. We’re here to help.'
            : 'Here’s what’s happening at your clinic today.'
        }
        action={
          patient ? (
            <Link className="button primary" to="/doctors">
              <Plus size={18} />
              Book appointment
            </Link>
          ) : null
        }
      />
      <div className="stats-grid">
        {[
          [
            CalendarDays,
            bookings.filter((a) =>
              ['confirmed', 'checked-in', 'waiting', 'in-consultation'].includes(a.status),
            ).length,
            'Upcoming appointments',
            'blue',
          ],
          [
            patient ? CheckCircle2 : Users,
            patient ? completed : doctors.length,
            patient ? 'Completed visits' : 'Clinic specialists',
            'teal',
          ],
          [
            patient ? Stethoscope : Wallet,
            patient
              ? new Set(bookings.map((a) => a.doctor?._id).filter(Boolean)).size
              : money(total),
            patient ? 'Your care team' : 'Collected consultation fees',
            'violet',
          ],
        ].map(([Icon, value, label, color]) => (
          <div className="stat-card" key={label}>
            <span className={`stat-icon ${color}`}>
              <Icon size={22} />
            </span>
            <div>
              <span>{label}</span>
              <strong>{value.toString().padStart(2, '0')}</strong>
            </div>
          </div>
        ))}
      </div>
      <div className="overview-middle">
        <section className="next-card">
          <div className="section-label">
            <span>YOUR NEXT {patient ? 'VISIT' : 'APPOINTMENT'}</span>
            <Badge tone="green">{next ? 'Confirmed' : 'Your schedule'}</Badge>
          </div>
          {next ? (
            <>
              <div className="next-doctor">
                <Avatar doctor={next.doctor || { name: 'Doctor', color: 'blue' }} large />
                <div>
                  <h2>{next.doctor?.name || 'Assigned Specialist'}</h2>
                  <p>{next.doctor?.specialty || 'General Consultation'}</p>
                  <span>In-person consultation</span>
                </div>
              </div>
              <div className="next-details">
                <span>
                  <CalendarDays size={18} />
                  {dateLabel(next.start)}
                </span>
                <span>
                  <Clock3 size={18} />
                  {timeLabel(next.start)} IST
                </span>
              </div>
              <div className="next-footer">
                <span>
                  <MapPin size={16} />
                  Careline Clinic
                </span>
                <Link to="/appointments" className="text-link">
                  View appointment <ChevronRight size={16} />
                </Link>
              </div>
            </>
          ) : (
            <Empty icon={CalendarCheck} title="A little room for your wellbeing">
              {patient ? (
                <Link to="/doctors">Find a doctor and plan your next visit.</Link>
              ) : (
                'Your upcoming appointments will appear here.'
              )}
            </Empty>
          )}
        </section>
        <section className="assistant-card">
          <div className="assistant-orbit">
            <Sparkles size={28} />
          </div>
          <Badge>YOUR CARE COMPANION</Badge>
          <h2>
            Not sure where
            <br />
            to start?
          </h2>
          <p>Tell us what’s bothering you. Find the right specialty for your next step.</p>
          <Link className="button white" to={patient ? '/assistant' : '/appointments'}>
            {patient ? (
              <>
                <Sparkles size={17} />
                Find my care team
              </>
            ) : (
              <>View appointments</>
            )}
          </Link>
          <small>
            {patient
              ? 'Guidance for booking, not a medical diagnosis.'
              : 'Your daily schedule, all in one place.'}
          </small>
        </section>
      </div>
      <div className="section-heading">
        <div>
          <h2>{patient ? 'Meet your care team' : 'Our clinic specialists'}</h2>
          <p>Experienced people. Care built around you.</p>
        </div>
        <Link
          className="text-link"
          to={patient ? '/doctors' : user.role === 'admin' ? '/manage' : '/appointments'}
        >
          {patient ? 'View all doctors' : 'Open workspace'}
          <ChevronRight size={16} />
        </Link>
      </div>
      <div className="doctor-grid">
        {doctors.slice(0, 3).map((d) => (
          <DoctorCard key={d._id} doctor={d} onBook={onBook} onProfile={onProfile} />
        ))}
      </div>
      <div className="care-note">
        <span className="care-note-icon">
          <ShieldCheck size={25} />
        </span>
        <div>
          <strong>Your visit, on your terms.</strong>
          <p>
            Secure {demo ? 'simulated' : 'test'} payments. Clear consultation fees. Flexible changes
            up to 2 hours before your visit.
          </p>
        </div>
        <span className="note-tag">A little peace of mind</span>
      </div>
    </>
  );
}
