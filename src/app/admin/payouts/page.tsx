'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle2, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
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

interface Cause {
  id: string;
  name: string;
  category: string;
  goalAmount: number;
  raisedAmount: number;
  totalVotes: number;
  submittedByName: string;
  status: string;
}

type View = 'batches' | 'payouts' | 'batch-detail';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  draft:      { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' },
  review:     { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  processing: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  completed:  { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  failed:     { bg: 'rgba(231,66,27,0.15)', color: '#F8C38F' },
  pending:    { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  paid:       { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
};

export default function AdminPayoutsPage() {
  return (
    <ProtectedRoute>
      <PayoutsContent />
    </ProtectedRoute>
  );
}

function PayoutsContent() {
  const { toast } = useToast();
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
  const [newPayout, setNewPayout] = useState({ causeId: '', causeName: '', charityName: '', amount: '', paymentMethod: 'check', cycleId: '', notes: '' });
  const [causes, setCauses] = useState<Cause[]>([]);
  const [causesLoading, setCausesLoading] = useState(false);
  const [selectedCause, setSelectedCause] = useState<Cause | null>(null);

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
    try {
      const res = await fetch(`/api/admin/payout-batches/${batch.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load batch');
      const d = await res.json();
      setBatchPayouts(d.payouts || []);
    } catch {
      toast('Failed to load batch payouts. Please try again.', 'error');
      setView('batches');
      setSelectedBatch(null);
    }
  };

  const switchView = (v: View) => {
    setView(v);
    setSelectedBatch(null);
    if (v === 'payouts') loadAllPayouts();
    if (v === 'batches') loadBatches();
  };

  const createBatch = async () => {
    if (!newBatch.name || !newBatch.cycleId) { toast('Batch name and cycle are required.', 'error'); return; }
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
    if (d.batch) { loadBatches(); toast('Batch created successfully.', 'success'); }
    else toast('Failed to create batch.', 'error');
  };

  // Fetch causes when payout modal opens
  useEffect(() => {
    if (!showNewPayout || causes.length > 0) return;
    setCausesLoading(true);
    Promise.all([
      fetch('/api/causes?status=active', { credentials: 'include' }).then(r => r.ok ? r.json() : { causes: [] }),
      fetch('/api/causes?status=pending', { credentials: 'include' }).then(r => r.ok ? r.json() : { causes: [] }),
      fetch('/api/causes?status=funded', { credentials: 'include' }).then(r => r.ok ? r.json() : { causes: [] }),
    ]).then(([a, b, c]) => {
      setCauses([...(a.causes ?? []), ...(b.causes ?? []), ...(c.causes ?? [])]);
    }).catch(() => {}).finally(() => setCausesLoading(false));
  }, [showNewPayout, causes.length]);

  const handleCauseSelect = (causeId: string) => {
    const cause = causes.find(c => c.id === causeId) ?? null;
    setSelectedCause(cause);
    if (cause) {
      setNewPayout(p => ({
        ...p,
        causeId: cause.id,
        causeName: cause.name,
        amount: cause.goalAmount > 0 ? cause.goalAmount.toFixed(2) : p.amount,
      }));
    } else {
      setNewPayout(p => ({ ...p, causeId: '', causeName: '' }));
    }
  };

  const createPayout = async () => {
    if (!newPayout.causeName || !newPayout.causeId || !parseFloat(newPayout.amount) || !newPayout.cycleId) { toast('Cause, amount, and cycle are required.', 'error'); return; }
    setActionLoading('create-payout');
    const body: any = { ...newPayout, amount: parseFloat(newPayout.amount) };
    if (selectedBatch) body.batchId = selectedBatch.id;
    const res = await fetch('/api/admin/payouts', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setActionLoading(null);
    setShowNewPayout(false);
    setNewPayout({ causeId: '', causeName: '', charityName: '', amount: '', paymentMethod: 'check', cycleId: '', notes: '' });
    setSelectedCause(null);
    if (res.ok) {
      toast('Payout created successfully.', 'success');
      if (selectedBatch) openBatch(selectedBatch);
      else loadAllPayouts();
    } else toast('Failed to create payout.', 'error');
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
    if (res.ok) { toast('Batch processing started.', 'success'); loadBatches(); if (selectedBatch?.id === id) openBatch(selectedBatch); }
    else toast('Failed to process batch.', 'error');
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

  if (loading && view === 'batches') return <p style={{ color: 'rgba(255,255,255,0.85)' }}>Loading...</p>;

  return (
    <div>
      <style>{`
        .po-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .po-stats-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 28px; }
        @media (max-width: 768px) {
          .po-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          .po-stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="po-header"
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Charity Payouts</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Review, approve, and distribute funds to verified charity recipients.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {view === 'batches' && (
            <button onClick={() => setShowNewBatch(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
              + New Batch
            </button>
          )}
          {(view === 'batch-detail' || view === 'payouts') && (
            <button onClick={() => setShowNewPayout(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
              + {view === 'batch-detail' ? 'Add Payout' : 'New Payout'}
            </button>
          )}
        </div>
      </motion.div>

      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {(['batches', 'payouts'] as const).map(v => (
          <button key={v} onClick={() => switchView(v)}
            style={{ padding: '0.625rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: view === v || (view === 'batch-detail' && v === 'batches') ? 700 : 400, borderBottom: (view === v || (view === 'batch-detail' && v === 'batches')) ? '2px solid #F8C38F' : '2px solid transparent', color: view === v || (view === 'batch-detail' && v === 'batches') ? '#F8C38F' : 'rgba(255,255,255,0.5)', fontSize: 14 }}>
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
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>No batches yet.</td></tr>
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
                        {b.notes && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{b.notes}</div>}
                      </td>
                      <td style={{ fontWeight: 700, color: '#4ade80' }}>${b.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td><span className={styles.statusBadge} style={sc}>{b.status}</span></td>
                      <td style={{ fontSize: 13 }}>{new Date(b.createdAt).toLocaleDateString()}</td>
                      <td onClick={e => e.stopPropagation()}>
                        {b.status === 'draft' && (
                          <button className={`${styles.actionBtn}`} style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)', margin: 0, marginRight: 6 }}
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
                          <button className={`${styles.actionBtn}`} style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)', margin: 0 }}
                            onClick={() => updateBatchStatus(b.id, 'completed')} disabled={actionLoading === b.id}>
                            Mark Completed
                          </button>
                        )}
                        {(b.status === 'completed' || b.status === 'failed') && (
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
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
          <button onClick={() => { setView('batches'); setSelectedBatch(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F8C38F', fontSize: 14, fontWeight: 600, marginBottom: '20px', padding: 0 }}>
            ← Back to Batches
          </button>

          <div style={{ background: '#15131f', borderRadius: 8, padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: 20, marginBottom: 4, color: '#ffffff' }}>{selectedBatch.name}</h2>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
                <span>Total Pool: <strong style={{ color: '#4ade80' }}>${selectedBatch.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
                <span>Payouts: <strong style={{ color: '#ffffff' }}>{batchPayouts.length}</strong></span>
                <span>Allocated: <strong style={{ color: '#ffffff' }}>${batchPayouts.reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
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
          <div className="po-stats-grid">
            {[
              { icon: <Clock size={20} />, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', val: `$${allPayouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Pending Payout' },
              { icon: <CheckCircle2 size={20} />, color: '#4ade80', bg: 'rgba(34,197,94,0.15)', val: `$${allPayouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Total Paid Out' },
              { icon: <Receipt size={20} />, color: '#a78bfa', bg: 'rgba(139,92,246,0.15)', val: allPayouts.filter(p => p.receiptNumber).length.toString(), label: 'Receipts Issued' },
            ].map(s => (
              <div key={s.label} style={{ background: '#15131f', borderRadius: '20px', padding: '22px 24px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color, flexShrink: 0 }}>{s.icon}</div>
                <div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>{s.label}</div>
                </div>
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
              <input style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties} value={newBatch.name} onChange={e => setNewBatch(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Q1 2026 Distributions" />
            </FormRow>
            <FormRow label="Voting Cycle *">
              <select style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties} value={newBatch.cycleId} onChange={e => setNewBatch(p => ({ ...p, cycleId: e.target.value }))}>
                <option value="">Select a cycle...</option>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
              </select>
            </FormRow>
            <FormRow label="Notes">
              <textarea style={{ padding: '9px 14px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }} value={newBatch.notes} onChange={e => setNewBatch(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setShowNewBatch(false)} style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={createBatch} disabled={actionLoading === 'create-batch'} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: actionLoading === 'create-batch' ? 'not-allowed' : 'pointer', opacity: actionLoading === 'create-batch' ? 0.6 : 1, fontFamily: 'inherit' }}>
              {actionLoading === 'create-batch' ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </Modal>
      )}
      </AnimatePresence>

      {/* New Payout Modal */}
      <AnimatePresence>
      {showNewPayout && (
        <Modal title="Add Payout" onClose={() => { setShowNewPayout(false); setSelectedCause(null); setNewPayout({ causeId: '', causeName: '', charityName: '', amount: '', paymentMethod: 'check', cycleId: '', notes: '' }); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <FormRow label="Cause *">
              <select
                style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties}
                value={newPayout.causeId}
                onChange={e => handleCauseSelect(e.target.value)}
                disabled={causesLoading}
              >
                <option value="">{causesLoading ? 'Loading causes…' : 'Select a cause…'}</option>
                {causes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} — ${c.goalAmount.toLocaleString()} requested
                  </option>
                ))}
              </select>
            </FormRow>

            {/* Cause info card — shown once a cause is selected */}
            {selectedCause && (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Requested By</div>
                  <div style={{ fontWeight: 700, color: '#ffffff', marginTop: 2 }}>{selectedCause.submittedByName || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Goal Amount</div>
                  <div style={{ fontWeight: 700, color: '#4ade80', marginTop: 2 }}>${selectedCause.goalAmount.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Votes Received</div>
                  <div style={{ fontWeight: 700, color: '#ffffff', marginTop: 2 }}>{selectedCause.totalVotes.toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Cause Status</div>
                  <div style={{ fontWeight: 700, color: '#ffffff', marginTop: 2, textTransform: 'capitalize' }}>{selectedCause.status}</div>
                </div>
                {selectedCause.raisedAmount > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                      Funding Progress
                    </div>
                    <div style={{ height: 6, borderRadius: 4, backgroundColor: 'rgba(34,197,94,0.2)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${selectedCause.goalAmount > 0 ? Math.min(100, (selectedCause.raisedAmount / selectedCause.goalAmount) * 100) : 0}%`, background: 'linear-gradient(90deg, #16a34a, #4ade80)', borderRadius: 4 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
                      ${selectedCause.raisedAmount.toLocaleString()} raised of ${selectedCause.goalAmount.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}

            <FormRow label="Charity Name">
              <input style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties} value={newPayout.charityName} onChange={e => setNewPayout(p => ({ ...p, charityName: e.target.value }))} placeholder="Optional — charity receiving the funds" />
            </FormRow>
            <FormRow label="Amount ($) *">
              <input style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties} type="number" min="0" step="0.01" value={newPayout.amount} onChange={e => setNewPayout(p => ({ ...p, amount: e.target.value }))} placeholder="Auto-filled from cause goal" />
            </FormRow>
            <FormRow label="Payment Method">
              <select style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties} value={newPayout.paymentMethod} onChange={e => setNewPayout(p => ({ ...p, paymentMethod: e.target.value }))}>
                <option value="check">Check</option>
                <option value="ach">ACH Transfer</option>
                <option value="paypal">PayPal</option>
              </select>
            </FormRow>
            <FormRow label="Voting Cycle *">
              <select style={{ padding: "9px 14px", border: "1.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", fontSize: "14px", outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", color: "#ffffff" } as React.CSSProperties} value={newPayout.cycleId} onChange={e => setNewPayout(p => ({ ...p, cycleId: e.target.value }))}>
                <option value="">Select a cycle...</option>
                {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormRow>
            <FormRow label="Notes">
              <textarea style={{ padding: '9px 14px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', resize: 'vertical', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }} value={newPayout.notes} onChange={e => setNewPayout(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </FormRow>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button onClick={() => setShowNewPayout(false)} style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', fontFamily: 'inherit' }}>Cancel</button>
            <button onClick={createPayout} disabled={actionLoading === 'create-payout'} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: actionLoading === 'create-payout' ? 'not-allowed' : 'pointer', opacity: actionLoading === 'create-payout' ? 0.6 : 1, fontFamily: 'inherit' }}>
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
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>No payouts found.</td></tr>
            )}
            {payouts.map(p => {
              const sc = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.causeName}</strong>
                    {p.charityName && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{p.charityName}</div>}
                  </td>
                  <td style={{ fontWeight: 700, color: '#4ade80' }}>${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
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
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                        {p.processedAt ? new Date(p.processedAt).toLocaleDateString() : 'Paid'}
                      </div>
                    )}
                    {p.status === 'failed' && (
                      <button className={`${styles.actionBtn}`} style={{ margin: 0, background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{ background: '#15131f', borderRadius: 12, width: '100%', maxWidth: 520, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
      >
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, color: '#ffffff' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'rgba(255,255,255,0.5)' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </motion.div>
    </motion.div>
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
