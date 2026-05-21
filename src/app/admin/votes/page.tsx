'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { VotingCycle, Cause } from '@/lib/types';
import styles from '../page.module.css';

export default function AdminVotesPage() {
    return (
        <ProtectedRoute>
            <VotingCyclesContent />
        </ProtectedRoute>
    );
}

interface CycleDoc {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: string;
    causes: any[];
}

function VotingCyclesContent() {
    const [cycles, setCycles] = useState<CycleDoc[]>([]);
    const [allCauses, setAllCauses] = useState<Cause[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewCycle, setShowNewCycle] = useState(false);

    // New cycle form
    const [newName, setNewName] = useState('');
    const [newStart, setNewStart] = useState('');
    const [newEnd, setNewEnd] = useState('');
    const [selectedCauseIds, setSelectedCauseIds] = useState<string[]>([]);
    const [creating, setCreating] = useState(false);

    // Add cause to active cycle
    const [addingCauseId, setAddingCauseId] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/cycles', { credentials: 'include' }).then(r => r.json()),
            fetch('/api/causes?status=active', { credentials: 'include' }).then(r => r.json()),
        ])
            .then(([cycleData, causeData]) => {
                setCycles(cycleData.cycles || []);
                setAllCauses(causeData.causes || []);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const activeCycle = cycles.find(c => c.status === 'active');

    // Causes already in the active cycle
    const activeCausesIds: string[] = (activeCycle?.causes ?? []).map((c: any) =>
        typeof c === 'string' ? c : c.id ?? c._id?.toString()
    );

    // Causes NOT yet in the active cycle
    const availableCauses = allCauses.filter(c => !activeCausesIds.includes(c.id));

    const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

    /* ── Create a new cycle ── */
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/admin/cycles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newName, startDate: newStart, endDate: newEnd, causes: selectedCauseIds }),
            });
            if (res.ok) {
                const data = await res.json();
                setCycles(prev => [...prev.map(c => ({ ...c, status: 'closed' })), data.cycle]);
                setShowNewCycle(false);
                setNewName(''); setNewStart(''); setNewEnd(''); setSelectedCauseIds([]);
                flash('✅ Voting cycle created and activated!');
            } else {
                flash('❌ Failed to create cycle.');
            }
        } finally { setCreating(false); }
    };

    /* ── Add a cause to the active cycle ── */
    const handleAddCause = async () => {
        if (!activeCycle || !addingCauseId) return;
        setSaving(true);
        const currentIds = activeCausesIds;
        const newIds = [...currentIds, addingCauseId];
        try {
            const res = await fetch(`/api/admin/cycles/${activeCycle.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ causes: newIds }),
            });
            if (res.ok) {
                // Refresh cycles
                const data = await fetch('/api/admin/cycles', { credentials: 'include' }).then(r => r.json());
                setCycles(data.cycles || []);
                setAddingCauseId('');
                flash('✅ Cause added to cycle!');
            } else {
                flash('❌ Failed to add cause.');
            }
        } finally { setSaving(false); }
    };

    /* ── Remove a cause from the active cycle ── */
    const handleRemoveCause = async (causeId: string) => {
        if (!activeCycle) return;
        const newIds = activeCausesIds.filter(id => id !== causeId);
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/cycles/${activeCycle.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ causes: newIds }),
            });
            if (res.ok) {
                const data = await fetch('/api/admin/cycles', { credentials: 'include' }).then(r => r.json());
                setCycles(data.cycles || []);
                flash('✅ Cause removed from cycle.');
            } else {
                flash('❌ Failed to remove cause.');
            }
        } finally { setSaving(false); }
    };

    if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading cycles…</div>;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: 0 }}>Voting Cycles</h1>
                    <p style={{ color: '#64748b', marginTop: '6px' }}>Manage donation voting cycles and cause allocations.</p>
                </div>
                {!activeCycle && (
                    <button
                        style={primaryBtn}
                        onClick={() => setShowNewCycle(v => !v)}
                    >
                        {showNewCycle ? 'Cancel' : '+ New Cycle'}
                    </button>
                )}
            </div>

            {/* Flash message */}
            {msg && (
                <div style={{
                    padding: '12px 20px', borderRadius: '12px', marginBottom: '20px',
                    fontSize: '13px', fontWeight: 600,
                    background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
                    color: msg.startsWith('✅') ? '#16a34a' : '#dc2626',
                    border: `1px solid ${msg.startsWith('✅') ? '#bbf7d0' : '#fecaca'}`,
                }}>{msg}</div>
            )}

            {/* ── Create new cycle form ── */}
            {showNewCycle && (
                <form onSubmit={handleCreate} style={cardStyle}>
                    <h2 style={cardTitle}>New Voting Cycle</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                            <label style={labelStyle}>Cycle Name *</label>
                            <input value={newName} onChange={e => setNewName(e.target.value)}
                                placeholder="e.g. Q2 2026 Cycle" required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Start Date *</label>
                            <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>End Date *</label>
                            <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} required style={inputStyle} />
                        </div>
                    </div>

                    {/* Cause selection */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Select Causes to Include in This Cycle</label>
                        {allCauses.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#94a3b8' }}>No active causes found. Create and approve causes first.</p>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                                {allCauses.map(c => {
                                    const checked = selectedCauseIds.includes(c.id);
                                    return (
                                        <label key={c.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '8px 14px', borderRadius: '12px', cursor: 'pointer',
                                            border: `1.5px solid ${checked ? '#dc2626' : '#e2e8f0'}`,
                                            background: checked ? '#fff5f6' : '#f8fafc',
                                            fontSize: '13px', fontWeight: 600, color: checked ? '#dc2626' : '#0f172a',
                                            transition: 'all 0.15s',
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => setSelectedCauseIds(prev =>
                                                    checked ? prev.filter(id => id !== c.id) : [...prev, c.id]
                                                )}
                                                style={{ accentColor: '#dc2626' }}
                                            />
                                            {c.name}
                                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>({c.category})</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button type="submit" style={primaryBtn} disabled={creating}>
                        {creating ? 'Creating…' : '🚀 Create & Activate Cycle'}
                    </button>
                </form>
            )}

            {/* ── Active Cycle Panel ── */}
            {activeCycle ? (
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h2 style={{ ...cardTitle, marginBottom: '4px' }}>🟢 {activeCycle.name}</h2>
                            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                                {new Date(activeCycle.startDate).toLocaleDateString()} – {new Date(activeCycle.endDate).toLocaleDateString()}
                            </p>
                        </div>
                        <span style={{ padding: '6px 14px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '12px', fontWeight: 700 }}>
                            ACTIVE
                        </span>
                    </div>

                    {/* Causes in this cycle */}
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                            Causes in this Cycle ({activeCausesIds.length})
                        </h3>
                        {activeCausesIds.length === 0 ? (
                            <div style={{
                                padding: '20px', borderRadius: '12px', background: '#fefce8',
                                border: '1px solid #fde047', color: '#854d0e', fontSize: '13px', fontWeight: 600,
                            }}>
                                ⚠️ No causes added yet. Add causes below so members can vote on them.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(activeCycle.causes as any[]).map((c: any) => {
                                    const name = typeof c === 'string' ? c : c.name ?? 'Cause';
                                    const id = typeof c === 'string' ? c : c.id ?? c._id?.toString();
                                    const category = typeof c === 'string' ? '' : c.category ?? '';
                                    return (
                                        <div key={id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px 16px', borderRadius: '12px',
                                            background: '#f8fafc', border: '1px solid #f1f5f9',
                                        }}>
                                            <div>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{name}</span>
                                                {category && <span style={{ marginLeft: '8px', fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{category}</span>}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveCause(id)}
                                                disabled={saving}
                                                style={{ border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: '12px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px', cursor: 'pointer' }}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Add a cause */}
                    {availableCauses.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                            <select
                                value={addingCauseId}
                                onChange={e => setAddingCauseId(e.target.value)}
                                style={{ ...inputStyle, flex: 1, margin: 0 }}
                            >
                                <option value="">— Add a cause to this cycle —</option>
                                {availableCauses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddCause}
                                disabled={!addingCauseId || saving}
                                style={{ ...primaryBtn, opacity: !addingCauseId ? 0.5 : 1 }}
                            >
                                {saving ? 'Saving…' : '+ Add Cause'}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{
                    padding: '24px', borderRadius: '16px', marginBottom: '24px',
                    background: '#fefce8', border: '1px solid #fde047', textAlign: 'center',
                    color: '#854d0e', fontSize: '14px', fontWeight: 600,
                }}>
                    ⚠️ No active voting cycle. Click &quot;+ New Cycle&quot; above to create one — then members can cast their votes.
                </div>
            )}

            {/* ── All Cycles History ── */}
            <div style={cardStyle}>
                <h2 style={cardTitle}>All Cycles History</h2>
                {cycles.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '13px' }}>No cycles created yet.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                {['Cycle Name', 'Start', 'End', 'Causes', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {cycles.map(cycle => (
                                <tr key={cycle.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{cycle.name}</td>
                                    <td style={{ padding: '12px', color: '#64748b' }}>{new Date(cycle.startDate).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px', color: '#64748b' }}>{new Date(cycle.endDate).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px', color: '#64748b' }}>{(cycle.causes as any[]).length}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                            background: cycle.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                            color: cycle.status === 'active' ? '#166534' : '#475569',
                                        }}>{cycle.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

/* ── Style helpers ── */
const primaryBtn: React.CSSProperties = {
    padding: '10px 22px', background: '#dc2626', color: '#fff', border: 'none',
    borderRadius: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
    transition: 'all 0.2s', whiteSpace: 'nowrap',
};

const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '20px',
    padding: '28px', marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
};

const cardTitle: React.CSSProperties = {
    fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0',
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', fontWeight: 700, color: '#374151', marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
