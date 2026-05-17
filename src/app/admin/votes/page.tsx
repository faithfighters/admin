'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { VotingCycle, Cause } from '@/lib/types';
import styles from '../page.module.css';

export default function AdminVotesPage() {
    return (
        <ProtectedRoute adminOnly>
            <VotingCyclesContent />
        </ProtectedRoute>
    );
}

interface CycleWithCauses extends VotingCycle {
    causeDetails?: Cause[];
}

function VotingCyclesContent() {
    const [cycles, setCycles] = useState<CycleWithCauses[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewCycle, setShowNewCycle] = useState(false);
    const [newCycleName, setNewCycleName] = useState('');
    const [newCycleStart, setNewCycleStart] = useState('');
    const [newCycleEnd, setNewCycleEnd] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch('/api/admin/cycles', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => setCycles(data.cycles || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const activeCycle = cycles.find((c) => c.status === 'active');

    const handleCreateCycle = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/cycles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newCycleName, startDate: newCycleStart, endDate: newCycleEnd }),
            });
            if (res.ok) {
                const data = await res.json();
                setCycles((prev) => [
                    ...prev.map((c) => ({ ...c, status: 'closed' as const })),
                    data.cycle,
                ]);
                setShowNewCycle(false);
                setNewCycleName('');
                setNewCycleStart('');
                setNewCycleEnd('');
            }
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div><p>Loading cycles...</p></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)' }}>
                <div>
                    <h1 className="heading-md">Voting Cycles</h1>
                    <p className="text-body">Manage donation voting cycles and cause allocations.</p>
                </div>
                <button className="btn btn--primary" onClick={() => setShowNewCycle(!showNewCycle)}>
                    {showNewCycle ? 'Cancel' : '+ New Cycle'}
                </button>
            </div>

            {showNewCycle && (
                <form onSubmit={handleCreateCycle} style={{ background: 'white', border: '1px solid var(--color-gray-100)', borderRadius: 12, padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 'var(--space-md)', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Cycle Name</label>
                        <input type="text" placeholder="Q2 2026 Cycle" value={newCycleName} onChange={(e) => setNewCycleName(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid var(--color-gray-200)', borderRadius: 8, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>Start Date</label>
                        <input type="date" value={newCycleStart} onChange={(e) => setNewCycleStart(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid var(--color-gray-200)', borderRadius: 8, fontFamily: 'inherit' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: 4 }}>End Date</label>
                        <input type="date" value={newCycleEnd} onChange={(e) => setNewCycleEnd(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid var(--color-gray-200)', borderRadius: 8, fontFamily: 'inherit' }} />
                    </div>
                    <button type="submit" className="btn btn--primary" disabled={creating}>
                        {creating ? 'Creating...' : 'Create'}
                    </button>
                </form>
            )}

            {activeCycle ? (
                <div className={styles.tableContainer} style={{ marginBottom: 'var(--space-2xl)' }}>
                    <div className={styles.tableHeader}>
                        <h2 className={styles.tableTitle}>Active: {activeCycle.name}</h2>
                        <span className={`${styles.statusBadge} ${styles.statusActive}`}>Active</span>
                    </div>
                    <div style={{ padding: 'var(--space-lg)', borderTop: '1px solid var(--color-gray-100)' }}>
                        <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-md)' }}>
                            {new Date(activeCycle.startDate).toLocaleDateString()} – {new Date(activeCycle.endDate).toLocaleDateString()}
                        </p>
                        <table>
                            <thead>
                                <tr>
                                    <th>Cause</th>
                                    <th>Category</th>
                                    <th>Goal</th>
                                    <th>Raised</th>
                                    <th>Votes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeCycle.causeDetails || []).map((cause) => (
                                    <tr key={cause.id}>
                                        <td><strong>{cause.name}</strong></td>
                                        <td>{cause.category}</td>
                                        <td>${cause.goalAmount.toLocaleString()}</td>
                                        <td style={{ color: '#16a34a', fontWeight: 700 }}>${cause.raisedAmount.toLocaleString()}</td>
                                        <td>{cause.totalVotes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: 'var(--space-xl)', marginBottom: 'var(--space-2xl)', textAlign: 'center', color: '#854d0e' }}>
                    No active voting cycle. Create one above to start collecting votes.
                </div>
            )}

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>All Cycles</h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Cycle Name</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Status</th>
                                <th>Causes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cycles.map((cycle) => (
                                <tr key={cycle.id}>
                                    <td><strong>{cycle.name}</strong></td>
                                    <td>{new Date(cycle.startDate).toLocaleDateString()}</td>
                                    <td>{new Date(cycle.endDate).toLocaleDateString()}</td>
                                    <td>
                                        <span className={styles.statusBadge} style={cycle.status !== 'active' ? { background: '#f3f4f6', color: '#374151' } : {}}>
                                            {cycle.status}
                                        </span>
                                    </td>
                                    <td>{(cycle.causes as string[]).length}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
