'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';

interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cityState: string;
  availability: string;
  role: string;
  source: string;
  status: 'new' | 'contacted' | 'placed' | 'closed';
  createdAt: string;
}

export default function AdminVolunteersPage() {
  return (
    <ProtectedRoute>
      <VolunteersContent />
    </ProtectedRoute>
  );
}

function VolunteersContent() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/volunteers', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setApplications(d.applications || []))
      .catch(() => toast('Failed to load volunteer applications.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    setSaving(id);
    const res = await fetch(`/api/volunteers/${id}/status`, {
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
      <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>Volunteer Applications</h1>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0 0 24px' }}>
        Sign-ups submitted from the faith-fighters-site landing page — no member account behind these.
      </p>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.85)' }}>Loading…</p>
      ) : applications.length === 0 ? (
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '40px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: 0 }}>No volunteer applications yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {applications.map(a => (
            <div key={a.id} style={{ background: '#15131f', borderRadius: '20px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>{a.name}</h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                    {a.email}{a.phone ? ` · ${a.phone}` : ''} · {a.cityState}
                  </p>
                </div>
                <select
                  value={a.status}
                  disabled={saving === a.id}
                  onChange={e => setStatus(a.id, e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.04)', color: '#ffffff', fontSize: '13px', fontWeight: 600,
                    height: 'fit-content',
                  }}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="placed">Placed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '12px' }}>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: '999px', color: 'rgba(255,255,255,0.75)' }}>
                  Role: {a.role}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: '999px', color: 'rgba(255,255,255,0.75)' }}>
                  Availability: {a.availability}
                </span>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '5px 12px', borderRadius: '999px', color: 'rgba(255,255,255,0.4)' }}>
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
