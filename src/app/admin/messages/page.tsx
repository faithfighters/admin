'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  source: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  createdAt: string;
}

export default function AdminMessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  );
}

function MessagesContent() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/contact', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))
      .catch(() => toast('Failed to load contact messages.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    setSaving(id);
    const res = await fetch(`/api/contact/${id}/status`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    if (res.ok) { toast('Status updated.', 'success'); load(); }
    else toast('Failed to update status.', 'error');
  };

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>Contact Messages</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 24px' }}>
        Messages submitted through the public Contact Us form.
      </p>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.85)' }}>Loading…</p>
      ) : messages.length === 0 ? (
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '40px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>No contact messages yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map(m => (
            <div key={m.id} style={{ background: '#15131f', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>{m.name}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>{m.email}</p>
                </div>
                <select
                  value={m.status}
                  disabled={saving === m.id}
                  onChange={e => setStatus(m.id, e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                    height: 'fit-content',
                  }}
                >
                  <option value="new">New</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {m.subject && (
                <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8C38F', margin: '0 0 8px' }}>{m.subject}</p>
              )}
              <p style={{ fontSize: '13.5px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 12px' }}>{m.message}</p>
              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: '999px', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                {new Date(m.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
