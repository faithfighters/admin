'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { HeartHandshake } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
import styles from '../page.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowAnim: any = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut', delay: i * 0.04 } }),
};

interface AssistanceRequest {
  id: string;
  memberName: string;
  requestTitle: string;
  category: string;
  amountRequested: number;
  amountApproved?: number;
  amountPaid?: number;
  status: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  funding_in_progress: 'Funding in Progress',
  payment_scheduled: 'Payment Scheduled',
  testimonial_received: 'Testimonial Received',
  payment_completed: 'Payment Completed',
  case_closed: 'Case Closed',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  submitted:            { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' },
  under_review:         { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  approved:             { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' },
  funding_in_progress:  { bg: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
  payment_scheduled:    { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  payment_completed:    { bg: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  testimonial_received: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
  case_closed:          { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' },
};

export default function AdminRfaPage() {
  return (
    <ProtectedRoute>
      <RfaContent />
    </ProtectedRoute>
  );
}

function RfaContent() {
  const router = useRouter();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    fetch(`/api/admin/assistance-requests${qs}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setRequests(d.requests || []))
      .catch(() => toast('Failed to load assistance requests.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.85)' }}>Loading...</p>;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}
      >
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Assistance Requests</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Manage member assistance requests from submission through payment and testimonial.</p>
        </div>
      </motion.div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setStatusFilter('')}
          style={{
            padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: statusFilter === '' ? '1.5px solid #F8C38F' : '1.5px solid rgba(255,255,255,0.1)',
            background: statusFilter === '' ? 'rgba(248,195,143,0.15)' : 'rgba(255,255,255,0.04)',
            color: statusFilter === '' ? '#F8C38F' : 'rgba(255,255,255,0.6)',
          }}
        >
          All
        </button>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: statusFilter === key ? '1.5px solid #F8C38F' : '1.5px solid rgba(255,255,255,0.1)',
              background: statusFilter === key ? 'rgba(248,195,143,0.15)' : 'rgba(255,255,255,0.04)',
              color: statusFilter === key ? '#F8C38F' : 'rgba(255,255,255,0.6)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <motion.div className={styles.tableContainer}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className={styles.tableHeader}>
          <h2 className={styles.tableTitle}>Requests</h2>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Title</th>
                <th>Category</th>
                <th>Requested</th>
                <th>Approved</th>
                <th>Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <HeartHandshake size={28} color="rgba(255,255,255,0.25)" />
                    No assistance requests yet.
                  </div>
                </td></tr>
              )}
              <AnimatePresence>
                {requests.map((r, i) => {
                  const sc = STATUS_COLORS[r.status] || STATUS_COLORS.submitted;
                  return (
                    <motion.tr key={r.id}
                      custom={i} variants={rowAnim} initial="hidden" animate="visible"
                      exit={{ opacity: 0, transition: { duration: 0.2 } }}
                      style={{ cursor: 'pointer' }} onClick={() => router.push(`/admin/rfa/${r.id}`)}
                    >
                      <td><strong>{r.memberName}</strong></td>
                      <td>{r.requestTitle}</td>
                      <td style={{ textTransform: 'capitalize' }}>{r.category}</td>
                      <td style={{ fontWeight: 700 }}>${r.amountRequested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td>{r.amountApproved != null ? `$${r.amountApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td style={{ fontWeight: 700, color: '#4ade80' }}>{r.amountPaid ? `$${r.amountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td><span className={styles.statusBadge} style={sc}>{STATUS_LABELS[r.status] || r.status}</span></td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
