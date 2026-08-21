'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { User, PLAN_CONFIG, PlanKey } from '@/lib/types';
import styles from '../page.module.css';
import { useToast } from '@/components/shared/Toast';
import { haptic } from '@/lib/haptics';
import { Shield, UserX, Users, Download, Search, UserCheck, Crown, CheckSquare, Square, Minus, Trash2, X, Mail, Calendar, Vote, Award, RotateCcw } from 'lucide-react';

type RoleFilter = 'all' | 'member' | 'moderator' | 'admin';
type PlanFilter = 'all' | 'faith_fighter' | 'none';
type SortOption = 'newest' | 'oldest' | 'name_asc' | 'name_desc';

export default function AdminMembersPage() {
    return (
        <ProtectedRoute>
            <MembersContent />
        </ProtectedRoute>
    );
}

function avatarColor(plan?: string): string {
    if (plan) return '#60a5fa';
    return 'rgba(255,255,255,0.3)';
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MembersContent() {
    const router = useRouter();
    const { toast } = useToast();
    const [members, setMembers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
    const [sort, setSort] = useState<SortOption>('newest');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);
    const [profileMember, setProfileMember] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/admin/members', { credentials: 'include' })
            .then((r) => r.json())
            .then((data) => setMembers(data.members || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const updateMember = useCallback(async (id: string, body: { role?: string; isActive?: boolean }, successMsg: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/members/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setMembers(prev => prev.map(m => m.id === id
                    ? { ...m, ...(body.role ? { role: body.role as User['role'] } : {}), ...(body.isActive !== undefined ? { isActive: body.isActive } : {}) }
                    : m));
                haptic('success');
                toast(successMsg, 'success');
            } else {
                const data = await res.json().catch(() => ({}));
                toast(data.message || 'Action failed. Please try again.', 'error');
            }
        } catch {
            toast('Action failed. Please try again.', 'error');
        } finally {
            setActionLoading(null);
        }
    }, [toast]);

    const deleteMember = useCallback(async (id: string, name: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/members/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (res.ok) {
                setMembers(prev => prev.filter(m => m.id !== id));
                haptic('success');
                toast(`${name} removed — their email can be used to register again`, 'success');
            } else {
                const data = await res.json().catch(() => ({}));
                toast(data.message || 'Failed to remove member.', 'error');
            }
        } catch {
            toast('Failed to remove member.', 'error');
        } finally {
            setActionLoading(null);
        }
    }, [toast]);

    const exportCSV = useCallback(() => {
        const rows = [
            ['Name', 'Email', 'Role', 'Plan', 'Votes Remaining', 'Joined'],
            ...members.map(m => [
                m.name,
                m.email,
                m.role,
                m.plan ? PLAN_CONFIG[m.plan as PlanKey].name : 'No Plan',
                String(m.votesRemaining ?? 0),
                formatDate(m.joinedAt),
            ]),
        ];
        const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'members.csv';
        a.click();
        URL.revokeObjectURL(url);
        haptic('medium');
    }, [members]);

    const handleBulkAction = useCallback(async (action: 'moderator' | 'member' | 'deactivate') => {
        if (selectedIds.size === 0) return;
        haptic('medium');
        setBulkLoading(true);
        const ids = Array.from(selectedIds);
        let successCount = 0;
        for (const id of ids) {
            try {
                const body = action === 'deactivate' ? { role: 'member' } : { role: action };
                const res = await fetch(`/api/admin/members/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(body),
                });
                if (res.ok) {
                    successCount++;
                    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: body.role as User['role'] } : m));
                }
            } catch {
                // continue
            }
        }
        setBulkLoading(false);
        setSelectedIds(new Set());
        haptic('success');
        toast(`Updated ${successCount} of ${ids.length} members`, successCount === ids.length ? 'success' : 'error');
    }, [selectedIds, toast]);

    // Derived stats
    const totalMembers = members.length;
    const totalAdmins = members.filter(m => m.role === 'admin' || m.role === 'moderator').length;
    const activeSubscribers = members.filter(m => !!m.plan).length;
    const noPlan = members.filter(m => !m.plan).length;

    // Filter + sort
    const filtered = members
        .filter(m => {
            const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
                m.email.toLowerCase().includes(search.toLowerCase());
            const matchRole = roleFilter === 'all' || m.role === roleFilter;
            const matchPlan = planFilter === 'all'
                ? true
                : planFilter === 'none' ? !m.plan : !!m.plan;
            return matchSearch && matchRole && matchPlan;
        })
        .sort((a, b) => {
            if (sort === 'newest') return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
            if (sort === 'oldest') return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
            if (sort === 'name_asc') return a.name.localeCompare(b.name);
            if (sort === 'name_desc') return b.name.localeCompare(a.name);
            return 0;
        });

    const allSelected = filtered.length > 0 && filtered.every(m => selectedIds.has(m.id));
    const someSelected = filtered.some(m => selectedIds.has(m.id)) && !allSelected;

    const toggleSelectAll = () => {
        haptic('selection');
        if (allSelected) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(m => next.delete(m.id));
                return next;
            });
        } else {
            setSelectedIds(prev => {
                const next = new Set(prev);
                filtered.forEach(m => next.add(m.id));
                return next;
            });
        }
    };

    const toggleSelect = (id: string) => {
        haptic('selection');
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    if (loading) return (
        <div>
            <div style={{ height: '36px', width: '220px', borderRadius: '12px', background: '#15131f', marginBottom: '8px' }} />
            <div style={{ height: '20px', width: '340px', borderRadius: '8px', background: '#15131f', marginBottom: '32px' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[...Array(4)].map((_, i) => (
                    <div key={i} style={{ height: '80px', borderRadius: '16px', background: '#15131f' }} />
                ))}
            </div>
            <div style={{ background: '#15131f', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                {[...Array(6)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '16px', padding: '16px 24px', borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
                        <div style={{ flex: 2 }}>
                            <div style={{ height: '14px', width: '140px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', marginBottom: '6px' }} />
                            <div style={{ height: '12px', width: '180px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }} />
                        </div>
                        <div style={{ height: '14px', width: '80px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', flex: 1 }} />
                        <div style={{ height: '14px', width: '100px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', flex: 1 }} />
                        <div style={{ height: '14px', width: '60px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', flex: 1 }} />
                        <div style={{ height: '24px', width: '60px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)' }} />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div>
            {/* Page Header */}
            <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>Members Directory</h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Manage platform members and view subscription status.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => router.push('/admin/members/import')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 18px', borderRadius: '10px',
                            background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.8)',
                            border: '1px solid rgba(255,255,255,0.1)', fontSize: '13px', fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <UserCheck size={14} /> Import Existing Members
                    </button>
                    <button
                        onClick={exportCSV}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '9px 18px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white',
                            border: 'none', fontSize: '13px', fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Banner */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Members', value: totalMembers, icon: <Users size={18} color="#60a5fa" />, accent: 'rgba(59,130,246,0.15)' },
                    { label: 'Admins & Mods', value: totalAdmins, icon: <Shield size={18} color="#a78bfa" />, accent: 'rgba(139,92,246,0.15)' },
                    { label: 'Subscribers', value: activeSubscribers, icon: <Crown size={18} color="#4ade80" />, accent: 'rgba(34,197,94,0.15)' },
                    { label: 'No Plan', value: noPlan, icon: <UserCheck size={18} color="#fbbf24" />, accent: 'rgba(245,158,11,0.15)' },
                ].map(({ label, value, icon, accent }) => (
                    <div key={label} style={{
                        background: '#15131f', borderRadius: '14px', padding: '16px 18px',
                        border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '14px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{value}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>{label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters Bar */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '280px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        placeholder="Search members..."
                        aria-label="Search members by name or email"
                        value={search}
                        onChange={(e) => { haptic('light'); setSearch(e.target.value); }}
                        style={{ width: '100%', padding: '8px 12px 8px 34px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }}
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={(e) => { haptic('light'); setRoleFilter(e.target.value as RoleFilter); }}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '13px', background: '#15131f', color: '#ffffff', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="all">All Roles</option>
                    <option value="member">Member</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                </select>

                <select
                    value={planFilter}
                    onChange={(e) => { haptic('light'); setPlanFilter(e.target.value as PlanFilter); }}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '13px', background: '#15131f', color: '#ffffff', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="all">All Plans</option>
                    <option value="faith_fighter">Faith Fighter</option>
                    <option value="none">No Plan</option>
                </select>

                <select
                    value={sort}
                    onChange={(e) => { haptic('light'); setSort(e.target.value as SortOption); }}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1.5px solid rgba(255,255,255,0.1)', fontSize: '13px', background: '#15131f', color: '#ffffff', cursor: 'pointer', outline: 'none' }}
                >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name_asc">Name A–Z</option>
                    <option value="name_desc">Name Z–A</option>
                </select>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
                    background: 'rgba(59,130,246,0.12)', border: '1.5px solid rgba(59,130,246,0.3)', borderRadius: '12px',
                    padding: '10px 16px', marginBottom: '14px',
                }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#60a5fa', marginRight: '4px' }}>
                        {selectedIds.size} member{selectedIds.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkAction('moderator')}
                        style={{ padding: '6px 14px', borderRadius: '8px', background: '#3b82f6', color: 'white', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Make Moderator
                    </button>
                    <button
                        disabled={bulkLoading}
                        onClick={() => handleBulkAction('member')}
                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Revoke Moderator
                    </button>
                    <button
                        disabled={bulkLoading}
                        onClick={() => {
                            if (confirm(`Deactivate ${selectedIds.size} selected member(s)?`)) handleBulkAction('deactivate');
                        }}
                        style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(231,66,27,0.15)', color: '#F8C38F', border: '1px solid rgba(231,66,27,0.3)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Deactivate Selected
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '8px', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '12px', cursor: 'pointer' }}
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* Table */}
            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>All Members ({filtered.length})</h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <button
                                        onClick={toggleSelectAll}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}
                                        aria-label="Select all"
                                    >
                                        {allSelected
                                            ? <CheckSquare size={16} color="#60a5fa" />
                                            : someSelected
                                                ? <Minus size={16} color="#60a5fa" />
                                                : <Square size={16} />}
                                    </button>
                                </th>
                                <th>Name / Email</th>
                                <th>Joined</th>
                                <th>Plan</th>
                                <th>Type</th>
                                <th>Votes</th>
                                <th>Role</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                                            <Users size={36} color="rgba(255,255,255,0.25)" style={{ marginBottom: '12px' }} />
                                            <div style={{ fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>No members found</div>
                                            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                                                Try adjusting your search or filters.
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((member) => {
                                const isSelected = selectedIds.has(member.id);
                                const initial = member.name.charAt(0).toUpperCase();
                                const bgColor = avatarColor(member.plan);

                                return (
                                    <tr key={member.id} style={{ background: isSelected ? 'rgba(59,130,246,0.08)' : undefined }}>
                                        {/* Checkbox */}
                                        <td style={{ textAlign: 'center' }}>
                                            <button
                                                onClick={() => toggleSelect(member.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)' }}
                                                aria-label={`Select ${member.name}`}
                                            >
                                                {isSelected ? <CheckSquare size={15} color="#60a5fa" /> : <Square size={15} />}
                                            </button>
                                        </td>

                                        {/* Name / Email */}
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '34px', height: '34px', borderRadius: '50%',
                                                    background: bgColor, color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 700, fontSize: '13px', flexShrink: 0,
                                                }}>
                                                    {initial}
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <strong style={{ display: 'block', color: 'rgba(255,255,255,0.85)' }}>{member.name}</strong>
                                                        {member.isActive === false && (
                                                            <span style={{
                                                                display: 'inline-block', padding: '2px 8px', borderRadius: '20px',
                                                                background: 'rgba(231,66,27,0.15)', color: '#F8C38F',
                                                                fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap',
                                                            }}>
                                                                Deactivated
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{member.email}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Joined */}
                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(member.joinedAt)}</td>

                                        {/* Plan */}
                                        <td>
                                            {member.plan ? (
                                                <span style={{
                                                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                                    background: 'rgba(34,197,94,0.15)', color: '#4ade80',
                                                    fontSize: '12px', fontWeight: 700,
                                                }}>
                                                    {PLAN_CONFIG[member.plan as PlanKey].name}
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                                    background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                                                    fontSize: '12px', fontWeight: 600,
                                                }}>
                                                    No Plan
                                                </span>
                                            )}
                                        </td>

                                        {/* User type + In Need badge */}
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                <span style={{
                                                    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                                    background: member.userType === 'recipient' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.06)',
                                                    color: member.userType === 'recipient' ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                                                    fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                                                }}>
                                                    {member.userType === 'recipient' ? 'Need Help' : 'Donor'}
                                                </span>
                                                {member.hasSubmittedRequest && (
                                                    <span style={{
                                                        display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                                        background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                                                        fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap',
                                                    }}>
                                                        In Need
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Votes progress bar */}
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', maxWidth: '60px' }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${member.votesTotal ? (member.votesRemaining! / member.votesTotal) * 100 : 0}%`,
                                                        background: '#60a5fa',
                                                        borderRadius: '3px',
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                                                    {member.votesRemaining ?? 0}/{member.votesTotal ?? 0}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Role badge */}
                                        <td>
                                            {member.role === 'admin' ? (
                                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: 'rgba(231,66,27,0.15)', color: '#F8C38F', fontSize: '12px', fontWeight: 700 }}>Admin</span>
                                            ) : member.role === 'moderator' ? (
                                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: '12px', fontWeight: 700 }}>Mod</span>
                                            ) : (
                                                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600 }}>Member</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <button
                                                    className={styles.actionBtn}
                                                    disabled={actionLoading === member.id}
                                                    onClick={() => setProfileMember(member)}
                                                    style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', margin: 0 }}
                                                    title="View profile"
                                                >
                                                    <UserCheck size={12} /> Profile
                                                </button>
                                                <button
                                                    className={styles.actionBtn}
                                                    disabled={actionLoading === member.id}
                                                    onClick={() => updateMember(member.id, { role: 'moderator' }, `${member.name} is now a moderator`)}
                                                    style={{ background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.3)', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', margin: 0 }}
                                                    title="Grant moderator access"
                                                >
                                                    <Shield size={12} /> Make Mod
                                                </button>
                                                {member.isActive === false ? (
                                                    <button
                                                        className={styles.actionBtn}
                                                        disabled={actionLoading === member.id}
                                                        onClick={() => updateMember(member.id, { isActive: true }, `${member.name} reactivated`)}
                                                        style={{ background: 'rgba(74,222,128,0.15)', borderColor: 'rgba(74,222,128,0.3)', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', margin: 0 }}
                                                        title="Reactivate member"
                                                    >
                                                        <RotateCcw size={12} /> Activate
                                                    </button>
                                                ) : (
                                                    <button
                                                        className={styles.actionBtn}
                                                        disabled={actionLoading === member.id}
                                                        onClick={() => {
                                                            if (confirm(`Deactivate ${member.name}? They will be immediately signed out and blocked from logging in until reactivated.`)) {
                                                                updateMember(member.id, { isActive: false }, `${member.name} deactivated`);
                                                            }
                                                        }}
                                                        style={{ background: 'rgba(231,66,27,0.15)', borderColor: 'rgba(231,66,27,0.3)', color: '#F8C38F', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', margin: 0 }}
                                                        title="Deactivate member"
                                                    >
                                                        <UserX size={12} /> Deactivate
                                                    </button>
                                                )}
                                                <button
                                                    className={styles.actionBtn}
                                                    disabled={actionLoading === member.id}
                                                    onClick={() => {
                                                        if (confirm(`Permanently remove ${member.name} (${member.email})? This cannot be undone, and their email will become available for a new registration.`)) {
                                                            deleteMember(member.id, member.name);
                                                        }
                                                    }}
                                                    style={{ background: 'rgba(220,38,38,0.15)', borderColor: 'rgba(220,38,38,0.3)', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', margin: 0 }}
                                                    title="Permanently remove member"
                                                >
                                                    <Trash2 size={12} /> Remove
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {profileMember && (
                <div
                    onClick={() => setProfileMember(null)}
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#15131f', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)',
                            maxWidth: '420px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        }}
                    >
                        <div style={{
                            background: 'linear-gradient(135deg, #E7421B, #F8C38F)', borderRadius: '20px 20px 0 0',
                            padding: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '20px', fontWeight: 800, color: 'white',
                                }}>
                                    {profileMember.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'white' }}>{profileMember.name}</div>
                                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>{profileMember.email}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setProfileMember(null)}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: 'white', display: 'flex' }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {[
                                { icon: <Shield size={14} color="#a78bfa" />, label: 'Role', value: profileMember.role.charAt(0).toUpperCase() + profileMember.role.slice(1) },
                                { icon: <UserX size={14} color={profileMember.isActive === false ? '#F8C38F' : '#4ade80'} />, label: 'Account Status', value: profileMember.isActive === false ? 'Deactivated' : 'Active' },
                                { icon: <Crown size={14} color="#4ade80" />, label: 'Plan', value: profileMember.plan ? PLAN_CONFIG[profileMember.plan as PlanKey].name : 'No Plan' },
                                { icon: <UserCheck size={14} color="#60a5fa" />, label: 'Type', value: profileMember.userType ? profileMember.userType.charAt(0).toUpperCase() + profileMember.userType.slice(1) : '—' },
                                { icon: <Vote size={14} color="#60a5fa" />, label: 'Votes', value: `${profileMember.votesRemaining ?? 0} / ${profileMember.votesTotal ?? 0}` },
                                { icon: <Calendar size={14} color="rgba(255,255,255,0.6)" />, label: 'Joined', value: formatDate(profileMember.joinedAt) },
                                { icon: <Award size={14} color="#fbbf24" />, label: 'Assistance Request', value: profileMember.hasSubmittedRequest ? 'Submitted' : 'None' },
                                { icon: <Mail size={14} color="rgba(255,255,255,0.6)" />, label: 'Stripe Customer ID', value: profileMember.stripeCustomerId || '—' },
                            ].map(({ icon, label, value }) => (
                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                                        {icon} {label}
                                    </div>
                                    <div style={{ color: 'white', fontSize: '13px', fontWeight: 600, textAlign: 'right', wordBreak: 'break-all' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
