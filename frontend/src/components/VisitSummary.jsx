import React, { useState } from 'react';
import {
  CalendarClock,
  Download,
  FileText,
  LockKeyhole,
  Pill,
  Plus,
  Star,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { Badge, Modal, Notice, dateLabel } from './UI';

const emptyMedication = () => ({
  name: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
});

export function VisitSummaryView({ appointment, summary, demo, showPrivate = false }) {
  if (!summary) return null;
  return (
    <section className="visit-summary-card">
      <header>
        <div>
          <FileText size={20} />
          <span>
            <small>VISIT SUMMARY</small>
            <strong>Care plan from {appointment.doctor?.name}</strong>
          </span>
        </div>
        <Badge tone={summary.status === 'published' ? 'green' : 'amber'}>{summary.status}</Badge>
      </header>
      <div className="summary-section">
        <span>Clinical impression</span>
        <p>{summary.diagnosis || 'Not added yet.'}</p>
      </div>
      <div className="summary-section">
        <span>Medicines</span>
        {summary.medications?.length ? (
          <div className="medicine-list">
            {summary.medications.map((medicine, index) => (
              <div className="medicine-item" key={`${medicine.name}-${index}`}>
                <Pill size={17} />
                <span>
                  <strong>{medicine.name}</strong>
                  <small>
                    {[medicine.dosage, medicine.frequency, medicine.duration]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                  {medicine.instructions && <em>{medicine.instructions}</em>}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>No medicines added.</p>
        )}
      </div>
      <div className="summary-section">
        <span>Care advice</span>
        <p>{summary.advice || 'No additional instructions.'}</p>
      </div>
      {summary.followUpDate && (
        <div className="summary-follow-up">
          <CalendarClock size={18} />
          <span>
            <small>RECOMMENDED FOLLOW-UP</small>
            <strong>{dateLabel(summary.followUpDate)}</strong>
          </span>
        </div>
      )}
      {showPrivate && summary.privateNotes && (
        <div className="private-note">
          <LockKeyhole size={17} />
          <span>
            <strong>Private doctor note</strong>
            <p>{summary.privateNotes}</p>
          </span>
        </div>
      )}
      {summary.status === 'published' && (
        <a
          className="button subtle small"
          href={demo ? undefined : `/api/appointments/${appointment._id}/summary.pdf`}
          download={`careline-visit-${appointment._id}.pdf`}
          onClick={demo ? (event) => event.preventDefault() : undefined}
        >
          <Download size={16} />
          {demo ? 'PDF available with a connected account' : 'Download visit PDF'}
        </a>
      )}
    </section>
  );
}

export function VisitSummaryEditor({ appointment, summary, demo, onClose, onSaved, notify }) {
  const [form, setForm] = useState({
    diagnosis: summary?.diagnosis || '',
    advice: summary?.advice || '',
    medications: summary?.medications || [],
    followUpDate: summary?.followUpDate
      ? new Date(summary.followUpDate).toISOString().slice(0, 10)
      : '',
    privateNotes: summary?.privateNotes || '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const published = summary?.status === 'published';

  function updateMedication(index, key, value) {
    setForm((current) => ({
      ...current,
      medications: current.medications.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  }
  async function saveDraft() {
    const body = {
      ...form,
      followUpDate: form.followUpDate || null,
      medications: form.medications.filter((item) => item.name.trim()),
    };
    if (demo)
      return {
        ...body,
        _id: summary?._id || `summary-${Date.now()}`,
        status: 'draft',
        version: (summary?.version || 0) + 1,
      };
    return api(`/appointments/${appointment._id}/summary`, { method: 'PUT', body });
  }
  async function submit(action) {
    setBusy(true);
    setError('');
    try {
      let saved = await saveDraft();
      if (action === 'publish') {
        if (!saved.diagnosis.trim())
          throw new Error('Add a clinical impression before publishing.');
        saved = demo
          ? { ...saved, status: 'published', publishedAt: new Date().toISOString() }
          : await api(`/appointments/${appointment._id}/summary/publish`, { method: 'POST' });
      }
      onSaved(saved);
      notify(
        action === 'publish' ? 'Visit summary published to the patient.' : 'Private draft saved.',
      );
      if (action === 'publish') onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={published ? 'Published visit summary' : 'Consultation summary'}
      onClose={onClose}
      wide
    >
      {published ? (
        <VisitSummaryView appointment={appointment} summary={summary} demo={demo} showPrivate />
      ) : (
        <div className="summary-editor">
          <Notice>
            <LockKeyhole size={16} />
            Private notes stay visible only to the treating doctor and never appear in the patient
            PDF.
          </Notice>
          {error && <Notice error>{error}</Notice>}
          <label className="field">
            Clinical impression
            <textarea
              rows={3}
              maxLength={1200}
              value={form.diagnosis}
              onChange={(event) => setForm({ ...form, diagnosis: event.target.value })}
              placeholder="Concise diagnosis or clinical impression"
            />
          </label>
          <div className="medication-editor">
            <div className="label-row">
              <strong>Medicines</strong>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setForm({ ...form, medications: [...form.medications, emptyMedication()] })
                }
              >
                <Plus size={15} />
                Add medicine
              </button>
            </div>
            {form.medications.length ? (
              form.medications.map((medicine, index) => (
                <div className="medication-row" key={index}>
                  <label className="field">
                    Medicine
                    <input
                      value={medicine.name}
                      maxLength={120}
                      onChange={(event) => updateMedication(index, 'name', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Dosage
                    <input
                      value={medicine.dosage}
                      maxLength={80}
                      placeholder="10 mg"
                      onChange={(event) => updateMedication(index, 'dosage', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Frequency
                    <input
                      value={medicine.frequency}
                      maxLength={120}
                      placeholder="Once daily"
                      onChange={(event) => updateMedication(index, 'frequency', event.target.value)}
                    />
                  </label>
                  <label className="field">
                    Duration
                    <input
                      value={medicine.duration}
                      maxLength={120}
                      placeholder="5 days"
                      onChange={(event) => updateMedication(index, 'duration', event.target.value)}
                    />
                  </label>
                  <label className="field medication-instructions">
                    Instructions
                    <input
                      value={medicine.instructions}
                      maxLength={300}
                      placeholder="After food"
                      onChange={(event) =>
                        updateMedication(index, 'instructions', event.target.value)
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Remove ${medicine.name || 'medicine'}`}
                    onClick={() =>
                      setForm({
                        ...form,
                        medications: form.medications.filter((_, itemIndex) => itemIndex !== index),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))
            ) : (
              <p className="muted">
                No medicines added. A summary can be published without a prescription.
              </p>
            )}
          </div>
          <label className="field">
            Care advice
            <textarea
              rows={4}
              maxLength={2400}
              value={form.advice}
              onChange={(event) => setForm({ ...form, advice: event.target.value })}
              placeholder="Rest, activity, diet, warning signs and other instructions"
            />
          </label>
          <label className="field">
            Recommended follow-up date
            <input
              type="date"
              value={form.followUpDate}
              onChange={(event) => setForm({ ...form, followUpDate: event.target.value })}
            />
          </label>
          <label className="field private-field">
            <span>
              <LockKeyhole size={15} />
              Private doctor notes
            </span>
            <textarea
              rows={3}
              maxLength={3000}
              value={form.privateNotes}
              onChange={(event) => setForm({ ...form, privateNotes: event.target.value })}
              placeholder="Clinical context for your future reference"
            />
          </label>
          <footer className="modal-footer">
            <button className="button subtle" disabled={busy} onClick={() => submit('draft')}>
              {busy ? 'Saving…' : 'Save private draft'}
            </button>
            <button
              className="button primary"
              disabled={busy || appointment.status !== 'completed'}
              title={
                appointment.status !== 'completed'
                  ? 'Complete the appointment before publishing'
                  : ''
              }
              onClick={() => submit('publish')}
            >
              {busy ? 'Publishing…' : 'Publish to patient'}
            </button>
          </footer>
        </div>
      )}
    </Modal>
  );
}

export function ReviewForm({ appointment, review, demo, onSaved, notify }) {
  const [rating, setRating] = useState(review?.rating || 0);
  const [comment, setComment] = useState(review?.comment || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (review)
    return (
      <div className="review-complete">
        <div className="stars" aria-label={`${review.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Star key={value} size={18} fill={value <= review.rating ? 'currentColor' : 'none'} />
          ))}
        </div>
        <strong>Thank you for your feedback</strong>
        {review.comment && <p>{review.comment}</p>}
      </div>
    );
  async function submit(event) {
    event.preventDefault();
    if (!rating) return setError('Choose a star rating.');
    setBusy(true);
    setError('');
    try {
      const saved = demo
        ? { _id: `review-${Date.now()}`, rating, comment, createdAt: new Date().toISOString() }
        : await api(`/appointments/${appointment._id}/review`, {
            method: 'POST',
            body: { rating, comment },
          });
      onSaved(saved);
      notify('Thank you. Your feedback was submitted.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="visit-review" onSubmit={submit}>
      <div>
        <strong>How was your visit?</strong>
        <span>Your rating helps the clinic improve.</span>
      </div>
      <div className="star-picker" role="radiogroup" aria-label="Visit rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} star${value === 1 ? '' : 's'}`}
            key={value}
            onClick={() => setRating(value)}
          >
            <Star size={24} fill={value <= rating ? 'currentColor' : 'none'} />
          </button>
        ))}
      </div>
      <label className="field">
        Optional feedback
        <textarea
          rows={3}
          maxLength={600}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What went well, or what could be better?"
        />
      </label>
      {error && <Notice error>{error}</Notice>}
      <button className="button primary small" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit feedback'}
      </button>
    </form>
  );
}
