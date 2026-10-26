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
  const modalRef = useRef();
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => [...(modalRef.current?.querySelectorAll(focusableSelector) || [])];
    (focusable()[0] || modalRef.current)?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeCallback.current?.();
        return;
      }
      if (e.key === 'Tab') {
        const elements = focusable();
        if (!elements.length) {
          e.preventDefault();
          modalRef.current?.focus();
          return;
        }
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCallback.current?.();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        className={wide ? 'modal wide' : 'modal'}
      >
        <header>
          <h2 id="dialog-title">{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
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
