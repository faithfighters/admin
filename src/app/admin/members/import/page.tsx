'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
import styles from '../../page.module.css';

interface ImportResult {
    email: string;
    status: 'created' | 'updated' | 'skipped';
    reason?: string;
}

export default function ImportMembersPage() {
    return (
        <ProtectedRoute>
            <ImportMembersContent />
        </ProtectedRoute>
    );
}

function ImportMembersContent() {
    const router = useRouter();
    const { toast } = useToast();
    const [input, setInput] = useState('');
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState<ImportResult[] | null>(null);
    const [summary, setSummary] = useState<{ createdCount: number; updatedCount: number; skippedCount: number } | null>(null);

    const runImport = async () => {
        const rows = input
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map(line => {
                const [email, stripeCustomerId] = line.split(',').map(s => s.trim());
                return { email, stripeCustomerId: stripeCustomerId || undefined };
            })
            .filter(r => r.email);

        if (rows.length === 0) {
            toast('Paste at least one row first.', 'error');
            return;
        }

        setRunning(true);
        setResults(null);
        try {
            const res = await fetch('/api/admin/members/import-stripe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ rows }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Import failed.');
            setResults(data.results);
            setSummary({ createdCount: data.createdCount, updatedCount: data.updatedCount, skippedCount: data.skippedCount });
            toast(`Done — ${data.createdCount} created, ${data.updatedCount} updated, ${data.skippedCount} skipped.`, 'success');
        } catch (e: any) {
            toast(e.message || 'Import failed.', 'error');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div>
            <button
                onClick={() => router.push('/admin/members')}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16,
                }}
            >
                <ArrowLeft size={14} /> Members Directory
            </button>

            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                Import Existing Members
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 24px', maxWidth: 640 }}>
                Bring in members who already have an active Stripe subscription under this account, without
                charging them again. Their platform account is created (or updated) to match their real
                subscription — they access it via <strong>Forgot password</strong> on the login page using
                their email.
            </p>

            <div style={{
                background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.25)',
                borderRadius: 14, padding: '16px 18px', marginBottom: 24, fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6,
            }}>
                <strong style={{ color: '#93c5fd' }}>Where to get the list:</strong> Stripe Dashboard → Customers
                (or Billing → Subscriptions) → filter to active subscriptions on the Faith Fighter $30 price →
                Export. Paste rows below as <code>email,stripeCustomerId</code> — one per line. The Stripe
                Customer ID is optional (we&apos;ll look it up by email if it&apos;s left off), but including it
                avoids ambiguity if an email matches more than one customer.
            </div>

            <div className={styles.formGroup} style={{ marginBottom: 20 }}>
                <label className={styles.formLabel}>Rows (email,stripeCustomerId — one per line)</label>
                <textarea
                    className={styles.formTextarea}
                    style={{ minHeight: 220, fontFamily: 'monospace', fontSize: 13 }}
                    placeholder={'jane@example.com,cus_ABC123\njohn@example.com'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
            </div>

            <button
                onClick={runImport}
                disabled={running}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 10, border: 'none',
                    background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', fontSize: 14, fontWeight: 700,
                    cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.6 : 1,
                }}
            >
                {running ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={16} />}
                {running ? 'Importing…' : 'Run Import'}
            </button>

            {summary && (
                <div style={{ display: 'flex', gap: 12, marginTop: 24, marginBottom: 16 }}>
                    <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#4ade80', fontWeight: 700 }}>
                        {summary.createdCount} created
                    </div>
                    <div style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: '#60a5fa', fontWeight: 700 }}>
                        {summary.updatedCount} updated
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                        {summary.skippedCount} skipped
                    </div>
                </div>
            )}

            {results && (
                <div style={{ background: '#15131f', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Email</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '12px 16px', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.85)' }}>{r.email}</td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                            background: r.status === 'created' ? 'rgba(34,197,94,0.15)' : r.status === 'updated' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)',
                                            color: r.status === 'created' ? '#4ade80' : r.status === 'updated' ? '#60a5fa' : 'rgba(255,255,255,0.5)',
                                        }}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 16px', color: 'rgba(255,255,255,0.45)' }}>{r.reason || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
