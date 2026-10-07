import React, { useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, LoaderCircle } from 'lucide-react';
export function Avatar({ doctor, large = false }) {
  return (
    <div className={`avatar ${doctor.color || 'blue'} ${large ? 'large' : ''}`} aria-hidden="true">
      {doctor.initials ||
        doctor.name
          .split(' ')
          .slice(-2)
          .map((s) => s[0])
          .join('')}
      <span className="avatar-cross">+</span>
    </div>
  );
}
export function Badge({ children, tone = '' }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({ icon: Icon = AlertCircle, title, children }) {
  return (
    <div className="empty">
      <Icon size={32} />
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export function Busy() {
  return (
    <div className="empty" role="status">
      <LoaderCircle className="spin" />
      <p>Getting everything ready…</p>
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    el.showModal();
    const close = (e) => {
      e.preventDefault();
      closeCallback.current();
    };
    el.addEventListener('cancel', close);
    return () => {
      el.removeEventListener('cancel', close);
      el.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={wide ? 'modal wide' : 'modal'} aria-labelledby="dialog-title">
      <header>
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <X size={21} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Notice({ children, error = false }) {
  return (
    <div role={error ? 'alert' : 'status'} className={`notice ${error ? 'error' : ''}`}>
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      <span>{children}</span>
    </div>
  );
}
export const money = (n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (s) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(s));
export const timeLabel = (s) =>
  new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(s));
