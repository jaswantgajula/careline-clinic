import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarCheck,
  IndianRupee,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import PageHeading from '../components/PageHeading';
import { Busy, Notice, money } from '../components/UI';
import { api } from '../services/api';

export default function Insights({ demo, bookings }) {
  const fallback = useMemo(() => {
    const statuses = Object.groupBy?.(bookings, (item) => item.status) || {};
    const count = (status) =>
      statuses[status]?.length || bookings.filter((item) => item.status === status).length;
    const paid = bookings.filter((item) => item.payment?.status === 'paid');
    return {
      periodDays: 30,
      totalAppointments: bookings.length,
      upcoming: count('confirmed') + count('checked-in') + count('waiting'),
      completed: count('completed'),
      cancellations: count('cancelled'),
      noShows: count('no-show'),
      attendanceRate: bookings.length
        ? Math.round((count('completed') / bookings.length) * 100)
        : 0,
      revenuePaise: paid.reduce((sum, item) => sum + (item.payment?.amount || item.fee * 100), 0),
      paidAppointments: paid.length,
      waitlist: { active: 3, offered: 2, accepted: 4 },
      aiFeedback: { true: 8, false: 1 },
      daily: [2, 4, 3, 6, 5, 7, 4].map((count, index) => ({ date: `Day ${index + 1}`, count })),
    };
  }, [bookings]);
  const [data, setData] = useState(demo ? fallback : null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (demo) setData(fallback);
    else
      api('/admin/analytics')
        .then(setData)
        .catch((e) => setError(e.message));
  }, [demo, fallback]);
  if (!data && !error) return <Busy />;
  const maximum = Math.max(...(data?.daily || []).map((item) => item.count), 1);
  const positive = Number(data?.aiFeedback?.true || 0);
  const negative = Number(data?.aiFeedback?.false || 0);
  return (
    <>
      <PageHeading
        eyebrow="CLINIC PERFORMANCE"
        title="Insights & operations"
        description="A clear 30-day view of demand, attendance, revenue and patient experience."
      />
      {error && <Notice error>{error}</Notice>}
      {data && (
        <>
          <div className="analytics-grid">
            {[
              ['Appointments', data.totalAppointments, Users, 'blue'],
              ['Attendance', `${data.attendanceRate}%`, UserCheck, 'green'],
              ['Paid revenue', money(data.revenuePaise / 100), IndianRupee, 'violet'],
              ['Upcoming', data.upcoming, CalendarCheck, 'amber'],
            ].map(([label, value, Icon, tone]) => (
              <article className="metric-card" key={label}>
                <span className={`stat-icon ${tone}`}>
                  <Icon size={21} />
                </span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              </article>
            ))}
          </div>
          <div className="insights-layout">
            <section className="panel chart-panel">
              <div className="section-heading">
                <span className="stat-icon blue">
                  <TrendingUp size={21} />
                </span>
                <div>
                  <h2>Appointment demand</h2>
                  <p>Recent booking volume</p>
                </div>
              </div>
              <div className="bar-chart" aria-label="Appointment demand chart">
                {data.daily.length ? (
                  data.daily.map((item) => (
                    <div className="bar-column" key={item.date}>
                      <span className="bar-value">{item.count}</span>
                      <div
                        className="bar"
                        style={{ height: `${Math.max(12, (item.count / maximum) * 100)}%` }}
                      />
                      <small>{item.date.slice(5)}</small>
                    </div>
                  ))
                ) : (
                  <p className="muted">Booking activity will appear here.</p>
                )}
              </div>
            </section>
            <section className="panel operations-panel">
              <div className="section-heading">
                <span className="stat-icon violet">
                  <Activity size={21} />
                </span>
                <div>
                  <h2>Operational pulse</h2>
                  <p>Where attention is needed</p>
                </div>
              </div>
              <div className="operations-list">
                <div>
                  <span>Completed visits</span>
                  <strong>{data.completed}</strong>
                </div>
                <div>
                  <span>Cancellations</span>
                  <strong>{data.cancellations}</strong>
                </div>
                <div>
                  <span>No-shows</span>
                  <strong>{data.noShows}</strong>
                </div>
                <div>
                  <span>Waitlist conversions</span>
                  <strong>{data.waitlist.accepted || 0}</strong>
                </div>
              </div>
              <div className="ai-quality">
                <Sparkles size={18} />
                <div>
                  <strong>AI guidance quality</strong>
                  <span>
                    {positive + negative
                      ? `${Math.round((positive / (positive + negative)) * 100)}% helpful`
                      : 'Awaiting patient feedback'}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
