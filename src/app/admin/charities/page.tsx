'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';

interface Charity {
  id: string;
  name: string;
  ein?: string;
  description?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status: 'active' | 'inactive';
  paymentMethods?: {
    ach?: { routingNumber?: string; accountNumber?: string; bankName?: string; accountType?: string };
    check?: { payableTo?: string; mailingAddress?: string };
    paypal?: { email?: string };
  };
}

const emptyForm = (): Partial<Charity> => ({
  name: '', ein: '', description: '', contactName: '', contactEmail: '',
  contactPhone: '', address: '', status: 'active',
  paymentMethods: { ach: {}, check: {}, paypal: {} },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 } }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowVariants: any = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { duration: 0.35, ease: 'easeOut', delay: i * 0.05 } }),
};

export default function AdminCharitiesPage() {
  return (
    <ProtectedRoute adminOnly>
      <CharitiesContent />
    </ProtectedRoute>
  );
}

function CharitiesContent() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Charity | null>(null);
  const [form, setForm] = useState<Partial<Charity>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'payment'>('info');

  const load = () => {
    setLoading(true);
    fetch('/api/admin/charities', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setCharities(d.charities || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setActiveTab('info');
    setShowForm(true);
  };

  const openEdit = (c: Charity) => {
    setEditing(c);
    setForm({
      ...c,
      paymentMethods: {
        ach: c.paymentMethods?.ach || {},
        check: c.paymentMethods?.check || {},
        paypal: c.paymentMethods?.paypal || {},
      },
    });
    setActiveTab('info');
    setShowForm(true);
  };

  const setField = (path: string, value: string) => {
    setForm(prev => {
      const next = { ...prev };
      const keys = path.split('.');
      let obj: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        obj[keys[i]] = { ...obj[keys[i]] };
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const save = async () => {
    if (!form.name?.trim()) return alert('Charity name is required.');
    setSaving(true);
    try {
      const url = editing ? `/api/admin/charities/${editing.id}` : '/api/admin/charities';
      const method = editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { alert('Failed to save.'); return; }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteCharity = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await fetch(`/api/admin/charities/${id}`, { method: 'DELETE', credentials: 'include' });
    load();
  };

  const toggleStatus = async (c: Charity) => {
    const newStatus = c.status === 'active' ? 'inactive' : 'active';
    await fetch(`/api/admin/charities/${c.id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  };

  if (loading) return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-gray-500)' }}>
      Loading charities...
    </motion.div>
  );

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2xl)' }}
      >
        <div>
          <h1 className="heading-md">Charity Directory</h1>
          <p className="text-body">Manage partner charities and their payment information.</p>
        </div>
        <motion.button
          className="btn btn-primary"
          onClick={openNew}
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
        >
          + Add Charity
        </motion.button>
      </motion.div>

      {/* Stat Cards */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { icon: '🏛️', val: charities.length, label: 'Total Charities' },
          { icon: '✅', val: charities.filter(c => c.status === 'active').length, label: 'Active' },
          { icon: '💳', val: charities.filter(c => c.paymentMethods?.ach?.accountNumber || c.paymentMethods?.paypal?.email || c.paymentMethods?.check?.payableTo).length, label: 'Payment Configured' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            className={styles.statCard}
            custom={i} variants={fadeUp}
            initial="hidden" animate="visible"
            whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }}
          >
            <div className={styles.statIcon}>{s.icon}</div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{s.val}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className={styles.tableContainer}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>All Charities</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Charity</th>
                <th>EIN</th>
                <th>Contact</th>
                <th>Payment Methods</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {charities.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No charities yet. Add one above.</td></tr>
              )}
              <AnimatePresence>
                {charities.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    custom={i} variants={rowVariants}
                    initial="hidden" animate="visible"
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.25 } }}
                    layout
                  >
                    <td>
                      <strong>{c.name}</strong>
                      {c.description && <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: 2 }}>{c.description.slice(0, 60)}{c.description.length > 60 ? '...' : ''}</div>}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{c.ein || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>{c.contactName || '—'}</div>
                      {c.contactEmail && <div style={{ fontSize: 12, color: 'var(--color-gray-500)' }}>{c.contactEmail}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {c.paymentMethods?.ach?.accountNumber && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 7px', borderRadius: 9, fontSize: 11, fontWeight: 600 }}>ACH</span>}
                        {c.paymentMethods?.check?.payableTo && <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '2px 7px', borderRadius: 9, fontSize: 11, fontWeight: 600 }}>Check</span>}
                        {c.paymentMethods?.paypal?.email && <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 7px', borderRadius: 9, fontSize: 11, fontWeight: 600 }}>PayPal</span>}
                        {!c.paymentMethods?.ach?.accountNumber && !c.paymentMethods?.check?.payableTo && !c.paymentMethods?.paypal?.email && <span style={{ color: 'var(--color-gray-400)', fontSize: 12 }}>None</span>}
                      </div>
                    </td>
                    <td>
                      <span className={styles.statusBadge} style={c.status === 'active' ? { background: '#dcfce7', color: '#166534' } : { background: '#f3f4f6', color: '#6b7280' }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button className={`${styles.actionBtn} ${styles.approveBtn}`} style={{ margin: 0, marginRight: 6 }} onClick={() => openEdit(c)}>Edit</button>
                      <button className={`${styles.actionBtn}`} style={{ margin: 0, marginRight: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }} onClick={() => toggleStatus(c)}>
                        {c.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className={`${styles.actionBtn} ${styles.rejectBtn}`} style={{ margin: 0 }} onClick={() => deleteCharity(c.id, c.name)}>Delete</button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal with AnimatePresence */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          >
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.93, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}
            >
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontWeight: 700, fontSize: 18 }}>{editing ? 'Edit Charity' : 'Add Charity'}</h2>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>×</button>
              </div>

              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                {(['info', 'payment'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    style={{ flex: 1, padding: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: activeTab === tab ? 700 : 400, borderBottom: activeTab === tab ? '2px solid #1d4ed8' : '2px solid transparent', color: activeTab === tab ? '#1d4ed8' : '#6b7280', fontSize: 14, textTransform: 'capitalize', transition: 'all 0.2s' }}>
                    {tab === 'info' ? 'Organization Info' : 'Payment Methods'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{ padding: '1.5rem' }}
                >
                  {activeTab === 'info' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <FormRow label="Charity Name *">
                        <input className="input" value={form.name || ''} onChange={e => setField('name', e.target.value)} placeholder="Organization name" />
                      </FormRow>
                      <FormRow label="EIN (Tax ID)">
                        <input className="input" value={form.ein || ''} onChange={e => setField('ein', e.target.value)} placeholder="XX-XXXXXXX" />
                      </FormRow>
                      <FormRow label="Description">
                        <textarea className="input" value={form.description || ''} onChange={e => setField('description', e.target.value)} rows={2} placeholder="Brief description of mission" style={{ resize: 'vertical' }} />
                      </FormRow>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <FormRow label="Contact Name">
                          <input className="input" value={form.contactName || ''} onChange={e => setField('contactName', e.target.value)} />
                        </FormRow>
                        <FormRow label="Contact Email">
                          <input className="input" type="email" value={form.contactEmail || ''} onChange={e => setField('contactEmail', e.target.value)} />
                        </FormRow>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <FormRow label="Contact Phone">
                          <input className="input" value={form.contactPhone || ''} onChange={e => setField('contactPhone', e.target.value)} />
                        </FormRow>
                        <FormRow label="Status">
                          <select className="input" value={form.status || 'active'} onChange={e => setField('status', e.target.value)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </FormRow>
                      </div>
                      <FormRow label="Mailing Address">
                        <input className="input" value={form.address || ''} onChange={e => setField('address', e.target.value)} placeholder="Full mailing address" />
                      </FormRow>
                    </div>
                  )}

                  {activeTab === 'payment' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <PaymentSection title="ACH Bank Transfer" color="#dbeafe">
                        <FormRow label="Bank Name">
                          <input className="input" value={form.paymentMethods?.ach?.bankName || ''} onChange={e => setField('paymentMethods.ach.bankName', e.target.value)} />
                        </FormRow>
                        <FormRow label="Account Type">
                          <select className="input" value={form.paymentMethods?.ach?.accountType || ''} onChange={e => setField('paymentMethods.ach.accountType', e.target.value)}>
                            <option value="">Select...</option>
                            <option value="checking">Checking</option>
                            <option value="savings">Savings</option>
                          </select>
                        </FormRow>
                        <FormRow label="Routing Number">
                          <input className="input" value={form.paymentMethods?.ach?.routingNumber || ''} onChange={e => setField('paymentMethods.ach.routingNumber', e.target.value)} placeholder="9-digit routing number" />
                        </FormRow>
                        <FormRow label="Account Number">
                          <input className="input" value={form.paymentMethods?.ach?.accountNumber || ''} onChange={e => setField('paymentMethods.ach.accountNumber', e.target.value)} placeholder="Account number" />
                        </FormRow>
                      </PaymentSection>

                      <PaymentSection title="Check" color="#f3e8ff">
                        <FormRow label="Make Check Payable To">
                          <input className="input" value={form.paymentMethods?.check?.payableTo || ''} onChange={e => setField('paymentMethods.check.payableTo', e.target.value)} />
                        </FormRow>
                        <FormRow label="Mailing Address for Check">
                          <input className="input" value={form.paymentMethods?.check?.mailingAddress || ''} onChange={e => setField('paymentMethods.check.mailingAddress', e.target.value)} />
                        </FormRow>
                      </PaymentSection>

                      <PaymentSection title="PayPal" color="#e0f2fe">
                        <FormRow label="PayPal Email Address">
                          <input className="input" type="email" value={form.paymentMethods?.paypal?.email || ''} onChange={e => setField('paymentMethods.paypal.email', e.target.value)} placeholder="paypal@organization.org" />
                        </FormRow>
                      </PaymentSection>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <motion.button
                  className="btn btn-primary"
                  onClick={save}
                  disabled={saving}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                >
                  {saving ? 'Saving...' : 'Save Charity'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

function PaymentSection({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '0.625rem 1rem', background: color, fontWeight: 700, fontSize: 14 }}>{title}</div>
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
    </div>
  );
}
