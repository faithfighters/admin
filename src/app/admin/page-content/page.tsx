'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileEdit, ChevronRight } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

interface PageEntry {
    page: string;
    label: string;
    updatedAt?: string;
    updatedBy?: string;
}

export default function PageContentListPage() {
    return (
        <ProtectedRoute>
            <PageContentListContent />
        </ProtectedRoute>
    );
}

function PageContentListContent() {
    const [pages, setPages] = useState<PageEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/site-content', { credentials: 'include' })
            .then(r => r.json())
            .then(d => setPages(d.pages || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                    Page Content
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0 }}>
                    Edit text and images on public pages — changes go live immediately, no code deploy needed.
                </p>
            </div>

            {loading ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading…</p>
            ) : pages.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>No editable pages registered yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {pages.map(p => (
                        <Link
                            key={p.page}
                            href={`/admin/page-content/${p.page}`}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                background: '#15131f', borderRadius: 16, padding: '18px 20px',
                                border: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(231,66,27,0.12)', color: '#F8C38F',
                                }}>
                                    <FileEdit size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{p.label}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                                        {p.updatedAt ? `Last edited ${new Date(p.updatedAt).toLocaleDateString()}` : 'Not yet edited — showing defaults'}
                                    </div>
                                </div>
                            </div>
                            <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
