'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import styles from '../page.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: i * 0.07 } }),
};

interface Analytics {
  overview: {
    totalMembers: number;
    totalAdmins: number;
    totalMonthlyRevenue: number;
    totalToCharity: number;
    totalToPlatform: number;
    totalPaidOut: number;
    activeSubscriptions: number;
  };
  videoStats: { total: number; pending: number; approved: number; rejected: number };
  payoutStats: { totalPaidOut: number; pendingPayouts: number; processingPayouts: number; totalPayouts: number };
  revenue: { monthly: number; toCharity: number; toPlatform: number };
  planBreakdown: Record<string, number>;
  members: { total: number; active: number };
}

interface FinancialReport {
  summary: {
    monthlyRevenue: number;
    charityPool: number;
    platformFee: number;
    totalPaidOut: number;
    pendingPayout: number;
    netUnallocated: number;
  };
  revenueByPlan: Record<string, { count: number; revenue: number }>;
  payouts: Array<{
    id: string; causeName: string; charityName?: string; amount: number;
    paymentMethod: string; status: string; receiptNumber?: string;
    processedAt?: string; createdAt: string;
  }>;
}

interface VotingReport {
  cycles: Array<{
    cycleId: string; cycleName: string; status: string;
    startDate: string; endDate: string;
    totalVotes: number; uniqueVoters: number;
    causeBreakdown: Array<{ causeId: string; count: number }>;
  }>;
}

interface ParticipationReport {
  members: { total: number; activeSubscribers: number; churnRate: string };
  content: { totalVideos: number; approvedVideos: number; pendingReview: number; rejectionRate: string };
  planParticipation: Record<string, number>;
}

type Tab = 'overview' | 'financial' | 'voting' | 'participation';

const PLAN_LABELS: Record<string, string> = {
  basic: 'Basic ($39.95)',
  standard: 'Standard ($59.95)',
  premium: 'Premium ($79.95)',
};

export default function AdminAnalyticsPage() {
  return (
    <ProtectedRoute adminOnly>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

function AnalyticsContent() {
  const [tab, setTab] = useState<Tab>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [financial, setFinancial] = useState<FinancialReport | null>(null);
  const [voting, setVoting] = useState<VotingReport | null>(null);
  const [participation, setParticipation] = useState<ParticipationReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'overview' && !analytics) {
        const d = await fetch('/api/admin/analytics', { credentials: 'include' }).then(r => r.json());
        setAnalytics(d);
      } else if (t === 'financial' && !financial) {
        const d = await fetch('/api/admin/reports/financial', { credentials: 'include' }).then(r => r.json());
        setFinancial(d);
      } else if (t === 'voting' && !voting) {
        const d = await fetch('/api/admin/reports/voting', { credentials: 'include' }).then(r => r.json());
        setVoting(d);
      } else if (t === 'participation' && !participation) {
        const d = await fetch('/api/admin/reports/participation', { credentials: 'include' }).then(r => r.json());
        setParticipation(d);
      }
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load('overview'); }, []);

  const switchTab = (t: Tab) => { setTab(t); load(t); };

  const exportCSV = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  const exportFinancialCSV = () => {
    if (!financial) return;
    const headers = ['Cause', 'Charity', 'Amount', 'Method', 'Status', 'Receipt #', 'Processed At', 'Created At'];
    const rows = financial.payouts.map(p => [
      p.causeName, p.charityName || '', p.amount.toString(), p.paymentMethod,
      p.status, p.receiptNumber || '', p.processedAt || '', p.createdAt,
    ]);
    exportCSV([headers, ...rows], `fffa-financial-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportVotingCSV = () => {
    if (!voting) return;
    const headers = ['Cycle Name', 'Status', 'Start Date', 'End Date', 'Total Votes', 'Unique Voters'];
    const rows = voting.cycles.map(c => [c.cycleName, c.status, c.startDate, c.endDate, c.totalVotes.toString(), c.uniqueVoters.toString()]);
    exportCSV([headers, ...rows], `fffa-voting-report-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 'var(--space-xl)' }}
      >
        <h1 className="heading-md">Platform Analytics & Reports</h1>
        <p className="text-body">Live metrics, financial summaries, and exportable reports.</p>
      </motion.div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-xl)', borderBottom: '1px solid #e5e7eb' }}>
        {([['overview', 'Overview'], ['financial', 'Financial'], ['voting', 'Voting'], ['participation', 'Participation']] as const).map(([v, l]) => (
          <button key={v} onClick={() => switchTab(v)}
            style={{ padding: '0.625rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontWeight: tab === v ? 700 : 400, borderBottom: tab === v ? '2px solid #1d4ed8' : '2px solid transparent', color: tab === v ? '#1d4ed8' : '#6b7280', fontSize: 14 }}>
            {l}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--color-gray-500)' }}>Loading...</p>}

      {/* Overview */}
      {tab === 'overview' && analytics && (
        <div>
          <div className={styles.statsGrid}>
            {[
              { icon: '👥', val: analytics.overview.totalMembers, label: 'Total Members' },
              { icon: '📋', val: analytics.overview.activeSubscriptions, label: 'Active Subscriptions' },
              { icon: '💰', val: `$${analytics.overview.totalMonthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Monthly Revenue' },
              { icon: '🏛️', val: `$${analytics.overview.totalToCharity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'To Charities (80%)' },
            ].map((s, i) => (
              <motion.div
                key={s.label} custom={i} variants={fadeUp}
                initial="hidden" animate="visible"
                whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }}
                className={styles.statCard}
              >
                <div className={styles.statIcon}>{s.icon}</div>
                <div className={styles.statInfo}><span className={styles.statValue}>{s.val}</span><span className={styles.statLabel}>{s.label}</span></div>
              </motion.div>
            ))}
          </div>

          <div className={styles.overviewGrid}>
            {/* Fund split */}
            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-xl)' }}>Fund Allocation Split</h2>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 42, fontWeight: 900, color: 'var(--color-dark)', lineHeight: 1 }}>
                  ${analytics.overview.totalMonthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>Monthly Revenue</div>
                <div style={{ display: 'flex', marginTop: 'var(--space-xl)', gap: '0.75rem' }}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                    style={{ flex: 8, background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: 'white', padding: '1rem', borderRadius: 8 }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 800 }}>${analytics.overview.totalToCharity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>80% to Charities</div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                    style={{ flex: 2, background: '#1e293b', color: 'white', padding: '1rem', borderRadius: 8 }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 800 }}>${analytics.overview.totalToPlatform.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>20% Ops</div>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Plan distribution */}
            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-xl)' }}>Plan Distribution</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {Object.entries(analytics.planBreakdown).map(([plan, count]) => {
                  const total = Object.values(analytics.planBreakdown).reduce((s, n) => s + n, 0);
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors: Record<string, string> = { basic: '#3b82f6', standard: '#10b981', premium: '#8b5cf6' };
                  return (
                    <div key={plan}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>
                        <span>{PLAN_LABELS[plan] || plan}</span>
                        <span>{pct}% ({count})</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div
                          initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                          style={{ height: '100%', background: colors[plan] || '#6b7280', borderRadius: 4 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Video stats */}
            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-xl)' }}>Video Moderation</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Total Submitted', val: analytics.videoStats.total, color: '#1e293b' },
                  { label: 'Approved', val: analytics.videoStats.approved, color: '#16a34a' },
                  { label: 'Pending Review', val: analytics.videoStats.pending, color: '#d97706' },
                  { label: 'Rejected', val: analytics.videoStats.rejected, color: '#dc2626' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>{s.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout stats */}
            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-xl)' }}>Payout Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { label: 'Total Paid Out', val: `$${analytics.payoutStats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: '#16a34a' },
                  { label: 'Pending Payouts', val: analytics.payoutStats.pendingPayouts, color: '#d97706' },
                  { label: 'Processing', val: analytics.payoutStats.processingPayouts, color: '#2563eb' },
                  { label: 'Total Payouts', val: analytics.payoutStats.totalPayouts, color: '#1e293b' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.625rem 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>{s.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Financial Report */}
      {tab === 'financial' && financial && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-secondary" onClick={exportFinancialCSV}>⬇ Export CSV</button>
          </div>
          <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--space-xl)' }}>
            {[
              { icon: '💰', val: `$${financial.summary.monthlyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Monthly Revenue' },
              { icon: '🏛️', val: `$${financial.summary.charityPool.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Charity Pool (80%)' },
              { icon: '⚙️', val: `$${financial.summary.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Platform Fee (20%)' },
              { icon: '✅', val: `$${financial.summary.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Total Paid Out' },
              { icon: '⏳', val: `$${financial.summary.pendingPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Pending Payout' },
              { icon: '📊', val: `$${financial.summary.netUnallocated.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, label: 'Net Unallocated' },
            ].map((s, i) => (
              <motion.div
                key={s.label} custom={i} variants={fadeUp}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                whileHover={{ y: -4, boxShadow: '0 12px 28px rgba(0,0,0,0.1)', transition: { duration: 0.2 } }}
                className={styles.statCard}
              >
                <div className={styles.statIcon}>{s.icon}</div>
                <div className={styles.statInfo}><span className={styles.statValue}>{s.val}</span><span className={styles.statLabel}>{s.label}</span></div>
              </motion.div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)' }}>Revenue by Plan</h2>
              {Object.entries(financial.revenueByPlan).map(([plan, data]) => (
                <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{PLAN_LABELS[plan] || plan}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>${data.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{data.count} subscribers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}><h2 className={styles.tableTitle}>Payout History</h2></div>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Cause</th><th>Charity</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt #</th><th>Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {financial.payouts.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No payouts.</td></tr>
                  )}
                  {financial.payouts.map(p => (
                    <tr key={p.id}>
                      <td><strong>{p.causeName}</strong></td>
                      <td>{p.charityName || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#16a34a' }}>${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600 }}>{p.paymentMethod}</td>
                      <td>
                        <span style={{ padding: '2px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, background: p.status === 'paid' ? '#dcfce7' : '#fef9c3', color: p.status === 'paid' ? '#166534' : '#854d0e' }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.receiptNumber || '—'}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Voting Report */}
      {tab === 'voting' && voting && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-lg)' }}>
            <button className="btn btn-secondary" onClick={exportVotingCSV}>⬇ Export CSV</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
            {voting.cycles.length === 0 && <p style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>No voting cycles yet.</p>}
            {voting.cycles.map((c, i) => (
              <motion.div
                key={c.cycleId}
                custom={i} variants={fadeUp}
                initial="hidden" whileInView="visible" viewport={{ once: true }}
                className={styles.recentActivity}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 16 }}>{c.cycleName}</h3>
                    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                      {new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ padding: '4px 10px', borderRadius: 9999, fontSize: 12, fontWeight: 600, background: c.status === 'active' ? '#dcfce7' : '#f3f4f6', color: c.status === 'active' ? '#166534' : '#374151' }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: 'var(--space-lg)' }}>
                  {[
                    { label: 'Total Votes', val: c.totalVotes },
                    { label: 'Unique Voters', val: c.uniqueVoters },
                    { label: 'Causes', val: c.causeBreakdown.length },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 8, padding: '0.75rem' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1e293b' }}>{s.val}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {c.causeBreakdown.length > 0 && (
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Vote Breakdown by Cause</div>
                    {c.causeBreakdown.sort((a, b) => b.count - a.count).map(entry => {
                      const pct = c.totalVotes > 0 ? Math.round((entry.count / c.totalVotes) * 100) : 0;
                      return (
                        <div key={entry.causeId} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{entry.causeId}</span>
                            <span style={{ fontWeight: 600 }}>{entry.count} votes ({pct}%)</span>
                          </div>
                          <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                            <motion.div
                              initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                              viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                              style={{ height: '100%', background: '#3b82f6', borderRadius: 3 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Participation Report */}
      {tab === 'participation' && participation && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-xl)' }}>
            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)' }}>Member Participation</h2>
              {[
                { label: 'Total Members', val: participation.members.total, color: '#1e293b' },
                { label: 'Active Subscribers', val: participation.members.activeSubscribers, color: '#16a34a' },
                { label: 'Churn Rate', val: participation.members.churnRate, color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>{s.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)' }}>Content Metrics</h2>
              {[
                { label: 'Total Videos', val: participation.content.totalVideos, color: '#1e293b' },
                { label: 'Approved', val: participation.content.approvedVideos, color: '#16a34a' },
                { label: 'Pending Review', val: participation.content.pendingReview, color: '#d97706' },
                { label: 'Rejection Rate', val: participation.content.rejectionRate, color: '#dc2626' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>{s.label}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            <div className={styles.recentActivity}>
              <h2 className="heading-sm" style={{ marginBottom: 'var(--space-lg)' }}>Plan Participation</h2>
              {Object.entries(participation.planParticipation).map(([plan, count]) => {
                const total = Object.values(participation.planParticipation).reduce((s, n) => s + n, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors: Record<string, string> = { basic: '#3b82f6', standard: '#10b981', premium: '#8b5cf6' };
                return (
                  <div key={plan} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      <span>{plan.charAt(0).toUpperCase() + plan.slice(1)}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }} whileInView={{ width: `${pct}%` }}
                        viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', background: colors[plan] || '#6b7280', borderRadius: 3 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
