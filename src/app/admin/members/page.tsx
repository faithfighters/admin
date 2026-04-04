'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { User, PLAN_CONFIG, PlanKey } from '@/lib/types';
import styles from '../page.module.css';

export default function AdminMembersPage() {
    return (
        <ProtectedRoute adminOnly>
            <MembersContent />
        </ProtectedRoute>
    );
}

function MembersContent() {
    const [members, setMembers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/members', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => setMembers((data.members || []).filter((m: User) => m.role === 'member')))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = members.filter(
        (m) =>
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.email.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return <div><p>Loading members...</p></div>;

    return (
        <div>
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
                <h1 className="heading-md">Members Directory</h1>
                <p className="text-body">Manage platform members and view subscription status.</p>
            </div>

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>All Members ({filtered.length})</h2>
                    <input
                        type="text"
                        placeholder="Search members..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--color-gray-100)', fontSize: '14px', outline: 'none' }}
                    />
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th>Name / Email</th>
                                <th>Joined</th>
                                <th>Plan</th>
                                <th>Votes Remaining</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray-400)' }}>No members found.</td></tr>
                            )}
                            {filtered.map((member) => (
                                <tr key={member.id}>
                                    <td>
                                        <strong>{member.name}</strong>
                                        <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>{member.email}</div>
                                    </td>
                                    <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                                    <td>
                                        {member.plan ? (
                                            <span style={{ fontWeight: 600 }}>
                                                {PLAN_CONFIG[member.plan as PlanKey].name}
                                                <span style={{ color: 'var(--color-gray-500)', fontWeight: 400, marginLeft: '4px', fontSize: '12px' }}>
                                                    (${PLAN_CONFIG[member.plan as PlanKey].price}/mo)
                                                </span>
                                            </span>
                                        ) : 'No plan'}
                                    </td>
                                    <td>
                                        {member.votesRemaining ?? 0}
                                        <span style={{ color: 'var(--color-gray-300)' }}> / {member.votesTotal ?? 0}</span>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles.statusActive}`}>Active</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
