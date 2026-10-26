import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Check, Circle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { dateLabel, timeLabel } from './UI';

const demoItems = [
  {
    _id: 'demo-reminder',
    type: 'reminder',
    title: 'Appointment tomorrow',
    message: 'Your visit with Dr. Ananya Sharma is tomorrow.',
    actionUrl: '/appointments',
    createdAt: new Date().toISOString(),
  },
  {
    _id: 'demo-waitlist',
    type: 'waitlist',
    title: 'A sooner appointment is available',
    message: 'A reserved waitlist slot is available for 10 minutes.',
    actionUrl: '/waitlist',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    readAt: new Date().toISOString(),
  },
];

export default function NotificationCenter({ demo, user, onLiveUpdate }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(demo ? demoItems : []);
  const [unread, setUnread] = useState(demo ? 1 : 0);
  const panel = useRef(null);

  const refresh = useCallback(async () => {
    if (!user || demo) return;
    const result = await api('/notifications');
    setItems(result.items);
    setUnread(result.unread);
  }, [demo, user]);

  useEffect(() => {
    refresh().catch(() => {});
    if (!user || demo) return;
    const events = new EventSource('/api/events', { withCredentials: true });
    const update = () => {
      refresh().catch(() => {});
      onLiveUpdate?.();
    };
    events.addEventListener('notification', update);
    events.addEventListener('appointment', update);
    events.addEventListener('waitlist', update);
    events.addEventListener('notifications-read', update);
    return () => events.close();
  }, [demo, onLiveUpdate, refresh, user]);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (!panel.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  async function readAll() {
    if (demo) {
      setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
      setUnread(0);
      return;
    }
    await api('/notifications/read-all', { method: 'POST' });
    await refresh();
  }

  if (!user) return null;
  return (
    <div className="notification-center" ref={panel}>
      <button
        type="button"
        className="icon-button notification-trigger"
        aria-label={`${unread} unread notifications`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={19} />
        {unread > 0 && <span className="notification-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <section className="notification-panel" aria-label="Notifications">
          <header>
            <div>
              <strong>Notifications</strong>
              <small>{unread ? `${unread} unread` : 'You’re all caught up'}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </header>
          <div className="notification-list">
            {items.length ? (
              items.map((item) => (
                <Link
                  to={item.actionUrl || '/'}
                  className={`notification-item ${item.readAt ? '' : 'unread'}`}
                  key={item._id}
                  onClick={() => setOpen(false)}
                >
                  {item.readAt ? <Check size={16} /> : <Circle size={10} fill="currentColor" />}
                  <span>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>
                      {dateLabel(item.createdAt)} · {timeLabel(item.createdAt)}
                    </small>
                  </span>
                </Link>
              ))
            ) : (
              <p className="notification-empty">Updates about your care will appear here.</p>
            )}
          </div>
          {unread > 0 && (
            <button className="button subtle small full" onClick={() => readAll().catch(() => {})}>
              Mark all as read
            </button>
          )}
        </section>
      )}
    </div>
  );
}
