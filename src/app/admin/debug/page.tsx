'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface EndpointResult {
    url: string;
    status: number | null;
    ok: boolean;
    data: unknown;
    error?: string;
    duration: number;
}

const ENDPOINTS = [
    '/api/admin/analytics',
    '/api/admin/members',
    '/api/admin/videos',
    '/api/admin/activities',
    '/api/admin/blocked-words',
    '/api/admin/payout-batches',
    '/api/admin/payouts',
    '/api/admin/reports/financial',
    '/api/admin/reports/voting',
    '/api/admin/reports/participation',
    '/api/causes?status=active',
    '/api/leaderboard/members',
    '/api/subscription',
];

export default function DebugPage() {
    const [results, setResults] = useState<EndpointResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const runTests = async () => {
        setLoading(true);
        setResults([]);
        const out: EndpointResult[] = [];

        for (const url of ENDPOINTS) {
            const t0 = Date.now();
            try {
                const res = await fetch(url, { credentials: 'include' });
                const duration = Date.now() - t0;
                let data: unknown;
                try { data = await res.json(); } catch { data = '(non-JSON body)'; }
                out.push({ url, status: res.status, ok: res.ok, data, duration });
            } catch (e: unknown) {
                out.push({ url, status: null, ok: false, data: null, error: String(e), duration: Date.now() - t0 });
            }
            setResults([...out]);
        }
        setLoading(false);
    };

    useEffect(() => { runTests(); }, []);

    const toggle = (url: string) => setExpanded(p => ({ ...p, [url]: !p[url] }));

    return (
        <div style={{ padding: '32px', fontFamily: 'monospace', maxWidth: '1100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: 0 }}>API Debug Panel</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '4px 0 0' }}>
                        Tests all admin API endpoints and shows raw responses
                    </p>
                </div>
                <button
                    onClick={runTests}
                    disabled={loading}
                    style={{ padding: '10px 20px', background: loading ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace' }}
                >
                    {loading ? 'Running…' : '↺ Re-run All'}
                </button>
            </div>

            {/* Summary bar */}
            {results.length > 0 && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'OK', icon: <CheckCircle2 size={13} />, count: results.filter(r => r.ok).length, color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
                        { label: 'Failed', icon: <XCircle size={13} />, count: results.filter(r => !r.ok).length, color: '#F8C38F', bg: 'rgba(231,66,27,0.15)', border: 'rgba(231,66,27,0.3)' },
                        { label: 'Pending', icon: <Clock size={13} />, count: ENDPOINTS.length - results.length, color: '#fbbf24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
                    ].map(s => (
                        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: '10px', fontSize: '13px', fontWeight: 700, color: s.color }}>
                            {s.icon}{s.label}: {s.count}
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Pending placeholders */}
                {ENDPOINTS.slice(results.length).map(url => (
                    <div key={url} style={{ background: '#15131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Clock size={14} color="#fbbf24" />
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{url}</span>
                    </div>
                ))}

                {/* Results */}
                {[...results].reverse().map(r => (
                    <div
                        key={r.url}
                        style={{ background: '#15131f', border: `1.5px solid ${r.ok ? 'rgba(34,197,94,0.3)' : 'rgba(231,66,27,0.3)'}`, borderRadius: '12px', overflow: 'hidden' }}
                    >
                        <div
                            onClick={() => toggle(r.url)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', cursor: 'pointer', userSelect: 'none' }}
                        >
                            {r.ok ? <CheckCircle2 size={14} color="#4ade80" /> : <XCircle size={14} color="#F8C38F" />}
                            <span style={{
                                padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 800,
                                background: r.ok ? 'rgba(34,197,94,0.15)' : 'rgba(231,66,27,0.15)',
                                color: r.ok ? '#4ade80' : '#F8C38F',
                            }}>
                                {r.status ?? 'ERR'}
                            </span>
                            <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{r.url}</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{r.duration}ms</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{expanded[r.url] ? '▲' : '▼'}</span>
                        </div>

                        {expanded[r.url] && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '14px 18px', background: '#0b0a12' }}>
                                {r.error && (
                                    <div style={{ color: '#F8C38F', fontSize: '12px', marginBottom: '8px', fontWeight: 600 }}>
                                        Network error: {r.error}
                                    </div>
                                )}
                                <pre style={{
                                    margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.85)',
                                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                    maxHeight: '400px', overflowY: 'auto',
                                    background: 'rgba(255,255,255,0.04)', padding: '12px', borderRadius: '8px',
                                }}>
                                    {JSON.stringify(r.data, null, 2)}
                                </pre>
                            </div>
                        )}

                        {/* Quick stat preview for analytics */}
                        {r.url === '/api/admin/analytics' && r.ok && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 18px', background: '#0b0a12', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                {[
                                    ['totalMembers', String((r.data as Record<string,unknown>)?.totalMembers ?? '❌ undefined')],
                                    ['totalRevenue', String((r.data as Record<string,unknown>)?.totalRevenue ?? '❌ undefined')],
                                    ['activeCauses', String((r.data as Record<string,unknown>)?.activeCauses ?? '❌ undefined')],
                                    ['totalVotes', String((r.data as Record<string,unknown>)?.totalVotes ?? '❌ undefined')],
                                    ['videoStats.pending', String(((r.data as Record<string,unknown>)?.videoStats as Record<string,unknown>)?.pending ?? '❌ undefined')],
                                    ['recentActivity', Array.isArray(((r.data as Record<string,unknown>)?.recentActivity as Record<string,unknown>)?.latestMembers) ? `${(((r.data as Record<string,unknown>)?.recentActivity as Record<string,unknown>)?.latestMembers as unknown[]).length} items` : '❌ missing'],
                                ].map(([key, val]) => (
                                    <div key={String(key)} style={{ fontSize: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{key}: </span>
                                        <span style={{ fontWeight: 700, color: String(val).startsWith('❌') ? '#F8C38F' : '#ffffff' }}>
                                            {String(val)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
