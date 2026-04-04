'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1], delay: i * 0.06 } }),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowAnim: any = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut', delay: i * 0.04 } }),
};

interface PayoutBatch {
  id: string;
  name: string;
  cycleId: string;
  status: 'draft' | 'review' | 'processing' | 'completed' | 'failed';
  totalAmount: number;
  processedAmount?: number;
  notes?: string;
  completedAt?: string;
  createdAt: string;
}

interface Payout {
  id: string;
  causeName: string;
  charityName?: string;
  amount: number;
  paymentMethod: string;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  receiptNumber?: string;
  processedAt?: string;
  cycleId: string;
  batchId?: string;
  notes?: string;
}

interface Cycle {
  id: string;
  name: string;
  status: string;
}

type View = 'batches' | 'payouts' | 'batch-detail';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:      { bg: '#f3f4f6', color: '#374151' },
  review:     { bg: '#fef9c3', color: '#854d0e' },
  processing: { bg: '#dbeafe', color: '#1e40af' },
  completed:  { bg: '#dcfce7', color: '#166534' },
  failed:     { bg: '#fee2e2', color: '#991b1b' },
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  paid:       { bg: '#dcfce7', color: '#166534' },
};

export default function AdminPayoutsPage() {
  return (
    <ProtectedRoute adminOnly>
      <PayoutsContent />
    </ProtectedRoute>
  );
}

function PayoutsContent() {
  const [view, setView] = useState<View>('batches');
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [batchPayouts, setBatchPayouts] = useState<Payout[]>([]);
  const [allPayouts, setAllPayouts] = useState<Payout[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNewBatch, setShowNewBatch] = useState(false);
  const [showNewPayout, setShowNewPayout] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', cycleId: '', notes: '' });
  const [newPayout, setNewPayout] = useState({ causeName: '', charityName: '', amount: '', paymentMethod: 'check', cycleId: '', notes: '' });

  const loadBatches = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/payout-batches', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/admin/cycles', { credentials: 'include' }).then(r => r.json()),
    ]).then(([bd, cd]) => {
      setBatches(bd.batches || []);
      setCycles(cd.cycles || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadAllPayouts = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/payouts', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setAllPayouts(d.payouts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const openBatch = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    setView('batch-detail');
    const res = await fetch(`/api/admin/payout-batches/${batch.id}`, { credentials: 'include' });
    const d = await res.json();
    setBatchPayouts(d.payouts || []);
  };

  const switchView = (v: View) => {
    setView(v);
    if (v === 'payouts') loadAllPayouts();
    if (v === 'batches') loadBatches();
  };

  const createBatch = async () => {
    if (!newBatch.name || !newBatch.cycleId) return alert('Name and cycle are required.');
    setActionLoading('create-batch');
    const res = await fetch('/api/admin/payout-batches', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBatch),
    });
    const d = await res.json();
    setActionLoading(null);
    setShowNewBatch(false);
    setNewBatch({ name: '', cycleId: '', notes: '' });
    if (d.batch) { loadBatches(); }
    else alert('Failed to create batch.');
  };

  const createPayout = async () => {
    if (!newPayout.causeName || !newPayout.amount || !newPayout.cycleId) return alert('Cause, amount, and cycle are required.');
    setActionLoading('create-payout');
    const body: any = { ...newPayout, amount: parseFloat(newPayout.amount), causeId: newPayout.cycleId };
    if (selectedBatch) body.batchId = selectedBatch.id;
    const res = await fetch('/api/admin/payouts', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setActionLoading(null);
    setShowNewPayout(false);
    setNewPayout({ causeName: '', charityName: '', amount: '', paymentMethod: 'check', cycleId: '', notes: '' });
    if (res.ok) {
      if (selectedBatch) openBatch(selectedBatch);
      else loadAllPayouts();
    } else alert('Failed to create payout.');
  };

  const updateBatchStatus = async (id: string, status: string) => {
    setActionLoading(id);
    await fetch(`/api/admin/payout-batches/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setActionLoading(null);
    loadBatches();
    if (selectedBatch?.id === id) {
      const updated = { ...selectedBatch, status: status as PayoutBatch['status'] };
      setSelectedBatch(updated);
    }
  };

  const processBatch = async (id: string) => {
    if (!confirm('Process this batch? This will mark all pending payouts as processing.')) return;
    setActionLoading(id + '-process');
    const res = await fetch(`/api/admin/payout-batches/${id}/process`, {
      method: 'POST', credentials: 'include',
    });
    setActionLoading(null);
    if (res.ok) { loadBatches(); if (selectedBatch?.id === id) openBatch(selectedBatch); }
    else alert('Failed to process batch.');
  };

  const updatePayoutStatus = async (payoutId: string, status: string) => {
    setActionLoading(payoutId);
    await fetch(`/api/admin/payouts/${payoutId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setActionLoading(null);
    if (selectedBatch) openBatch(selectedBatch);
    else loadAllPayouts();
  };

  if (loading && view === 'batches') return <p>Loading...</p>;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-xl)' }}
      >
        <div>
          <h1 className="heading-md">Charity Payouts</h1>
          <p className="text-body">Manage and process the 80% charity fund distributions.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {view === 'batches' && <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={() => setShowNewBatch(true)}>+ New Batch</motion.button>}
          {view === 'batch-detail' && <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={() => setShowNewPayout(true)}>+ Add Payout</motion.button>}
          {view === 'payouts' && <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="btn btn-primary" onClick={() => setShowNewPayout(true)}>+ New Payout</motion.button>}
        </div>
      </motion.div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-xl)', borderBottom: '1px solid #e5e7eb' }}>
        {(['batches', 'payouts'] as const).map(v => (
          <button key={v} onClick={() => switchView(v)}
            style={{ padding: '0.625rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: view === v || (view === 'batch-detail' && v === 'batches') ? 700 : 400, borderBottom: (view === v || (view === 'batch-detail' && v === 'batches')) ? '2px solid #1d4ed8' : '2px solid transparent', color: view === v || (view === 'batch-detail' && v === 'batches') ? '#1d4ed8' : '#6b7280', fontSize: 14 }}>
            {v === 'batches' ? 'Payout Batches' : 'Individual Payouts'}
          </button>
        ))}
      </div>

      {/* Batches list */}
      {view === 'batches' && (
        <motion.div className={styles.tableContainer}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.tableHeader}>
            <h2 className={styles.tableTitle}>Payout Batches</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Batch Name</th>
                  <th>Charity Pool</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No batches yet.</td></tr>
                )}
                <AnimatePresence>
                {batches.map((b, i) => {
                  const sc = STATUS_COLORS[b.status] || STATUS_COLORS.draft;
                  return (
                    <motion.tr key={b.id}
                      custom={i} variants={rowAnim} initial="hidden" animate="visible"
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      style={{ cursor: 'pointer' }} onClick={() => openBatch(b)}
                    >
                      <td>
                        <strong>{b.name}</strong>
                        {b.notes && <div style={{ fontSize: 12, color: 'var(--color-gray-500)', marginTop: 2 }}>{b.notes}</div>}
                      </td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>${b.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td><span className={styles.statusBadge} style={sc}>{b.status}</span></td>
                      <td style={{ fontSize: 13 }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {b.status === 'draft' && (
                          <button className={`${styles.actionBtn}`} style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a', margin: 0, marginRight: 6 }}
                            onClick={() => updateBatchStatus(b.id, 'review')} disabled={actionLoading === b.id}>
                            Submit for Review
                          </button>
                        )}
                        {b.status === 'review' && (
                          <button className={`${styles.actionBtn} ${styles.approveBtn}`} style={{ margin: 0, marginRight: 6 }}
                            onClick={() => processBatch(b.id)} disabled={!!actionLoading}>
                            {actionLoading === b.id + '-process' ? 'Processing...' : 'Process Batch'}
                          </button>
                        )}
                        {b.status === 'processing' && (
                          <button className={`${styles.actionBtn}`} style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', margin: 0 }}
                            onClick={() => updateBatchStatus(b.id, 'completed')} disabled={actionLoading === b.id}>
                            Mark Completed
                          </button>
                        )}
                        {(b.status === 'completed' || b.status === 'failed') && (
                          <span style={{ fontSize: 12, color: 'var(--color-gray-400)' }}>
                            {b.completedAt ? new Date(b.completedAt).toLocaleDateString() : '—'}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Batch detail */}
      {view === 'batch-detail' && selectedBatch && (
        <div>
          <button onClick={() => { setView('batches'); setSelectedBatch(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1d4ed8', fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-lg)', padding: 0 }}>
            ← Back to Batches
          </button>

          <div style={{ background: 'white', borderRadius: 8, padding: '1.5rem', border: '1px solid #e5e7eb', marginBottom: 'var(--space-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{selectedBatch.name}</h2>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: 14, color: '#6b7280' }}>
                <span>Total Pool: <strong style={{ color: '#16a34a' }}>${selectedBatch.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>Payouts: <strong>{batchPayouts.length}</strong></span>
                <span>Allocated: <strong>${batchPayouts.reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>
            <span className={styles.statusBadge} style={{ ...STATUS_COLORS[selectedBatch.status], fontSize: 14, padding: '6px 14px' }}>{selectedBatch.status}</span>
          </div>

          <PayoutsTable payouts={batchPayouts} actionLoading={actionLoading} onUpdateStatus={updatePayoutStatus} />
        </div>
      )}

      {/* All payouts */}
      {view === 'payouts' && (
        <div>
          <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-xl)' }}>
            {[
              { icon: '⏳', val: `$${allPayouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Pending' },
              { icon: '✅', val: `$${allPayouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Paid Out' },
              { icon: '🧾', val: allPayouts.filter(p => p.receiptNumber).length.toString(), label: 'Receipts Issued' },
            ].map(s => (
              <div key={s.label} className={styles.statCard}>
                <div className={styles.statIcon}>{s.icon}</div>
                <div className={styles.statInfo}><span className={styles.statValue}>{s.val}</span><span className={styles.statLabel}>{s.label}</span></div>
              </div>
            ))}
          </div>
          <PayoutsTable payouts={allPayouts} actionLoading={actionLoading} onUpdateStatus={updatePayoutStatus} />
        </div>
      )}

      {/* New Batch Modal */}
      <AnimatePresence>
      {showNewBatch && (
        <Modal title="Create Payout Batch" onClose={() => setShowNewBatch(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormRow label="Batch Name *">
              <input className="input" value={newBatch.name} onChange={e => setNewBatch(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Q1 2026 Distributions" />
            </FormRow>
            <FormRow label="Voting Cycle *">
              <select className="input" value={newBatch.cycleId} onChange={e => setNewBatch(p => ({ ...p, cycleId: e.target.value }))}>
                <option value="">Select a cycle...</option>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
              </select>
            </FormRow>
            <FormRow label="Notes">
              <textarea className="input" value={newBatch.notes} onChange={e => setNewBatch(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowNewBatch(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createBatch} disabled={actionLoading === 'create-batch'}>
              {actionLoading === 'create-batch' ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </Modal>
      )}
      </AnimatePresence>

      {/* New Payout Modal */}
      <AnimatePresence>
      {showNewPayout && (
        <Modal title="Add Payout" onClose={() => setShowNewPayout(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormRow label="Cause Name *">
              <input className="input" value={newPayout.causeName} onChange={e => setNewPayout(p => ({ ...p, causeName: e.target.value }))} />
            </FormRow>
            <FormRow label="Charity Name">
              <input className="input" value={newPayout.charityName} onChange={e => setNewPayout(p => ({ ...p, charityName: e.target.value }))} />
            </FormRow>
            <FormRow label="Amount ($) *">
              <input className="input" type="number" min="0" step="0.01" value={newPayout.amount} onChange={e => setNewPayout(p => ({ ...p, amount: e.target.value }))} />
            </FormRow>
            <FormRow label="Payment Method">
              <select className="input" value={newPayout.paymentMethod} onChange={e => setNewPayout(p => ({ ...p, paymentMethod: e.target.value }))}>
                <option value="check">Check</option>
                <option value="ach">ACH Transfer</option>
                <option value="paypal">PayPal</option>
              </select>
            </FormRow>
            <FormRow label="Voting Cycle *">
              <select className="input" value={newPayout.cycleId} onChange={e => setNewPayout(p => ({ ...p, cycleId: e.target.value }))}>
                <option value="">Select a cycle...</option>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="Notes">
              <textarea className="input" value={newPayout.notes} onChange={e => setNewPayout(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowNewPayout(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={createPayout} disabled={actionLoading === 'create-payout'}>
              {actionLoading === 'create-payout' ? 'Creating...' : 'Add Payout'}
            </button>
          </div>
        </Modal>
      )}
      </AnimatePresence>
    </div>
  );
}

function PayoutsTable({ payouts, actionLoading, onUpdateStatus }: {
  payouts: Payout[];
  actionLoading: string | null;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <h2 className={styles.tableTitle}>Payouts</h2>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Cause / Charity</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Receipt #</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No payouts found.</td></tr>
            )}
            {payouts.map(p => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.causeName}</strong>
                    {p.charityName && <div style={{ fontSize: 12, color: 'var(--color-gray-500)', marginTop: 2 }}>{p.charityName}</div>}
                  </td>
                  <td style={{ fontWeight: 700, color: '#16a34a' }}>${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>{p.paymentMethod}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.receiptNumber || '—'}</td>
                  <td><span className={styles.statusBadge} style={sc}>{p.status}</span></td>
                  <td>
                    {p.status === 'pending' && (
                      <button className={`${styles.actionBtn} ${styles.approveBtn}`} style={{ margin: 0 }}
                        onClick={() => onUpdateStatus(p.id, 'paid')} disabled={actionLoading === p.id}>
                        {actionLoading === p.id ? '...' : 'Mark Paid'}
                      </button>
                    )}
                    {p.status === 'processing' && (
                      <button className={`${styles.actionBtn} ${styles.approveBtn}`} style={{ margin: 0 }}
                        onClick={() => onUpdateStatus(p.id, 'paid')} disabled={actionLoading === p.id}>
                        {actionLoading === p.id ? '...' : 'Confirm Paid'}
                      </button>
                    )}
                    {p.status === 'paid' && (
                      <div style={{ fontSize: 12, color: 'var(--color-gray-400)' }}>
                        {p.processedAt ? new Date(p.processedAt).toLocaleDateString() : 'Paid'}
                      </div>
                    )}
                    {p.status === 'failed' && (
                      <button className={`${styles.actionBtn}`} style={{ margin: 0, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' }}
                        onClick={() => onUpdateStatus(p.id, 'pending')} disabled={actionLoading === p.id}>
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: 'white', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: 17 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </motion.div>
    </motion.div>
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
