'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarDays, MapPin, Images, Loader2, FolderOpen } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
import styles from '../page.module.css';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  coverImage: string;
  galleryImages: string[];
  status: 'upcoming' | 'past';
  createdAt: string;
}

interface EventForm {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  coverImage: string;
  galleryImages: string[];
  status: 'upcoming' | 'past';
}

const emptyForm: EventForm = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  location: '',
  coverImage: '',
  galleryImages: [],
  status: 'upcoming',
};

export default function AdminEventsPage() {
  return (
    <ProtectedRoute>
      <EventsContent />
    </ProtectedRoute>
  );
}

// ── Upload helper ─────────────────────────────────────────────────
async function uploadImageToS3(file: File): Promise<string> {
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      contentType: file.type,
      fileSizeBytes: file.size,
      folder: 'images',
    }),
  });
  if (!presignRes.ok) {
    const err = await presignRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to get upload URL');
  }
  const { uploadUrl, publicUrl } = await presignRes.json();
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!putRes.ok) throw new Error('Upload to storage failed');
  return publicUrl;
}

// ── Single image uploader ─────────────────────────────────────────
function ImageUploader({
  value,
  onChange,
  label,
  placeholder = 'Click or drag to upload',
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Only image files allowed'); return; }
    setError('');
    setUploading(true);
    try {
      const url = await uploadImageToS3(file);
      onChange(url);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</label>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: value ? 0 : '24px 16px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: uploading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
          transition: 'border-color 0.2s',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {value ? (
          <div style={{ position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="preview" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>Click to replace</span>
            </div>
          </div>
        ) : uploading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            <Loader2 size={24} style={{ marginBottom: 6, animation: 'spin 1s linear infinite' }} />
            Uploading…
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <Images size={28} style={{ marginBottom: 6 }} />
            {placeholder}
            <div style={{ fontSize: 11, marginTop: 4, color: 'rgba(255,255,255,0.3)' }}>JPG, PNG, WebP · max 10MB</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onInputChange} />
      </div>
      {error && <span style={{ fontSize: 12, color: '#F8C38F' }}>{error}</span>}
    </div>
  );
}

// ── Multi-image gallery uploader ──────────────────────────────────
function GalleryUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) { setError('Only image files allowed'); return; }
    setError('');
    setUploading(true);
    try {
      const urls = await Promise.all(imageFiles.map(uploadImageToS3));
      onChange([...value, ...urls]);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Gallery Images</label>

      {/* Existing images */}
      {value.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 4 }}>
          {value.map((url, i) => (
            <div key={i} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`gallery ${i + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                onClick={() => removeImage(i)}
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                  cursor: 'pointer', fontSize: 12, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Upload drop zone */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 10,
          padding: '20px 16px', textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: uploading ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.03)',
        }}
      >
        {uploading ? (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />Uploading…</div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            <FolderOpen size={24} style={{ marginBottom: 4 }} />
            Click or drag to add photos
            <div style={{ fontSize: 11, marginTop: 3, color: 'rgba(255,255,255,0.3)' }}>Select multiple · JPG, PNG, WebP · max 10MB each</div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) handleFiles(e.target.files); }} />
      </div>
      {error && <span style={{ fontSize: 12, color: '#F8C38F' }}>{error}</span>}
    </div>
  );
}

// ── Main content ──────────────────────────────────────────────────
function EventsContent() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [locationPlaceholder, setLocationPlaceholder] = useState('e.g. Los Angeles, CA, USA');

  useEffect(() => {
    if (showModal) {
      const caLocations = [
        'e.g. Los Angeles, CA, USA',
        'e.g. San Francisco, CA, USA',
        'e.g. San Diego, CA, USA',
        'e.g. Sacramento, CA, USA',
        'e.g. Beverly Hills, CA, USA',
        'e.g. Santa Monica, CA, USA',
        'e.g. Palo Alto, CA, USA',
        'e.g. San Jose, CA, USA',
        'e.g. Pasadena, CA, USA',
        'e.g. Irvine, CA, USA'
      ];
      const randomLoc = caLocations[Math.floor(Math.random() * caLocations.length)];
      setLocationPlaceholder(randomLoc);
    }
  }, [showModal]);

  const loadEvents = useCallback(() => {
    setLoading(true);
    fetch('/api/events', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const openAdd = () => {
    setEditingEvent(null);
    setForm({
      ...emptyForm,
      startTime: '12:00 PM',
      endTime: '01:00 PM',
    });
    setShowModal(true);
  };

  const openEdit = (event: Event) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      description: event.description,
      date: parseDateForInput(event.date),
      startTime: event.startTime || '12:00 PM',
      endTime: event.endTime || '01:00 PM',
      location: event.location,
      coverImage: event.coverImage || '',
      galleryImages: event.galleryImages || [],
      status: event.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    const { title, description, date, startTime, endTime, location } = form;
    if (!title || !description || !date || !startTime || !endTime || !location) {
      toast('Please fill in all required fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      const url = editingEvent ? `/api/events/${editingEvent.id}` : '/api/events';
      const method = editingEvent ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to save event.');
      toast(editingEvent ? 'Event updated.' : 'Event created.', 'success');
      closeModal();
      loadEvents();
    } catch {
      toast('Error saving event. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) { toast('Event deleted.', 'success'); loadEvents(); }
      else toast('Failed to delete event.', 'error');
    } catch {
      toast('Failed to delete event.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <style>{`
        .ev-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .ev-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        @media (max-width: 480px) {
          .ev-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div className="ev-header">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#ffffff', marginBottom: 8 }}>Events</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)' }}>Manage upcoming and past events for the community.</p>
        </div>
        <button
          onClick={openAdd}
          style={{ background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          + Add Event
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '3rem' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#15131f', borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>No events yet. Click "Add Event" to create one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              onEdit={() => openEdit(event)}
              onDelete={() => handleDelete(event.id)}
              deleting={deletingId === event.id}
            />
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#15131f', borderRadius: 12, width: '100%', maxWidth: 600, boxShadow: '0 25px 50px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#15131f', zIndex: 1 }}>
              <h2 style={{ fontWeight: 700, fontSize: 17, color: '#ffffff' }}>
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h2>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormRow label="Title *">
                <input className={styles.formInput} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Community Gala" />
              </FormRow>

              <FormRow label="Description *">
                <textarea className={styles.formInput} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ resize: 'vertical' }} placeholder="Describe the event..." />
              </FormRow>

              <div className="ev-form-grid">
                <FormRow label="Date *">
                  <input
                    type="date"
                    className={styles.formInput}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </FormRow>
                <FormRow label="Status *">
                  <select className={styles.formSelect} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'upcoming' | 'past' }))}>
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                  </select>
                </FormRow>
              </div>

              <div className="ev-form-grid">
                <FormRow label="Start Time *">
                  <TimePicker
                    value={form.startTime}
                    onChange={val => setForm(f => ({ ...f, startTime: val }))}
                  />
                </FormRow>
                <FormRow label="End Time *">
                  <TimePicker
                    value={form.endTime}
                    onChange={val => setForm(f => ({ ...f, endTime: val }))}
                  />
                </FormRow>
              </div>

              <FormRow label="Location *">
                <input
                  className={styles.formInput}
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={locationPlaceholder}
                />
              </FormRow>

              {/* Cover Image — upload or paste URL */}
              <ImageUploader
                label="Cover Image"
                value={form.coverImage}
                onChange={url => setForm(f => ({ ...f, coverImage: url }))}
                placeholder="Click or drag to upload cover image"
              />
              {/* URL fallback */}
              <FormRow label="…or paste a Cover Image URL">
                <input
                  className={styles.formInput}
                  value={form.coverImage}
                  onChange={e => setForm(f => ({ ...f, coverImage: e.target.value }))}
                  placeholder="https://..."
                  style={{ fontSize: 12 }}
                />
              </FormRow>

              {/* Gallery — upload or paste URLs */}
              <GalleryUploader
                value={form.galleryImages}
                onChange={urls => setForm(f => ({ ...f, galleryImages: urls }))}
              />
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12, position: 'sticky', bottom: 0, background: '#15131f' }}>
              <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editingEvent ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onEdit, onDelete, deleting }: { event: Event; onEdit: () => void; onDelete: () => void; deleting: boolean }) {
  return (
    <div style={{ background: '#15131f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 160, background: '#0b0a12', position: 'relative', overflow: 'hidden' }}>
        {event.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.coverImage} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0b0a12 0%, #1a1825 100%)' }}>
            <CalendarDays size={40} color="rgba(255,255,255,0.3)" />
          </div>
        )}
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', backgroundColor: event.status === 'upcoming' ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.08)', color: event.status === 'upcoming' ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>
            {event.status}
          </span>
        </div>
      </div>
      <div style={{ padding: '16px 20px', flex: 1 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', marginBottom: 6, lineHeight: 1.3 }}>{event.title}</h3>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
          <CalendarDays size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />{formatDateForDisplay(event.date)} &nbsp;·&nbsp; {formatTimeForDisplay(event.startTime)} – {formatTimeForDisplay(event.endTime)}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{event.location}</p>
        {event.galleryImages?.length > 0 && (
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}><Images size={12} />{event.galleryImages.length} gallery image{event.galleryImages.length !== 1 ? 's' : ''}</p>
        )}
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
        <button onClick={onEdit} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', color: '#ffffff', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Edit</button>
        <button onClick={onDelete} disabled={deleting} style={{ flex: 1, background: 'rgba(231,66,27,0.15)', color: '#F8C38F', border: 'none', borderRadius: 8, padding: '8px 0', fontWeight: 600, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
          {deleting ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</label>
      {children}
    </div>
  );
}

// ── Date and Time helpers for pickers and display ────────────────
function parseDateForInput(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
}

function parseTimeForInput(timeStr: string): string {
  if (!timeStr) return '';
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = match[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  return '';
}

function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
  }
  return dateStr;
}

function formatTimeForDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  }
  return timeStr;
}

// Custom 12-hour Time Picker component to guarantee AM/PM layout
function TimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const { hour, minute, ampm } = parseTimeParts(value);

  // When value is changed, update parent state
  useEffect(() => {
    if (!value) {
      onChange('12:00 PM');
    }
  }, [value, onChange]);

  const setHour = (h: string) => {
    onChange(`${h}:${minute} ${ampm}`);
  };

  const setMinute = (m: string) => {
    onChange(`${hour}:${m} ${ampm}`);
  };

  const setAmpm = (p: string) => {
    onChange(`${hour}:${minute} ${p}`);
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <select
        className={styles.formSelect}
        value={hour}
        onChange={e => setHour(e.target.value)}
        style={{ flex: 1, padding: '10px 12px' }}
      >
        {Array.from({ length: 12 }, (_, i) => String(i + 1)).map(h => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span style={{ fontWeight: 'bold', color: 'rgba(255,255,255,0.5)' }}>:</span>
      <select
        className={styles.formSelect}
        value={minute}
        onChange={e => setMinute(e.target.value)}
        style={{ flex: 1, padding: '10px 12px' }}
      >
        {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        className={styles.formSelect}
        value={ampm}
        onChange={e => setAmpm(e.target.value)}
        style={{ width: 75, padding: '10px 12px' }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}

function parseTimeParts(timeStr: string) {
  let hour = '12';
  let minute = '00';
  let ampm = 'PM';

  if (!timeStr) {
    return { hour, minute, ampm };
  }

  // AM/PM format (e.g. "4:30 PM" or "12:00 AM")
  const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    hour = ampmMatch[1];
    minute = ampmMatch[2];
    ampm = ampmMatch[3].toUpperCase();
    return { hour, minute, ampm };
  }

  // 24h format (e.g. "16:30" or "04:30")
  const standardMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (standardMatch) {
    let h = parseInt(standardMatch[1], 10);
    minute = standardMatch[2];
    ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    hour = String(h);
    return { hour, minute, ampm };
  }

  return { hour, minute, ampm };
}
