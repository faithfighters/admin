'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
import PageContentForm from '@/components/admin/PageContentForm';
import { SiteContentPageManifest } from '@/lib/types';

// Maps a page slug to its path on the live site, for the "View live page" link.
const LIVE_PATHS: Record<string, string> = {
  home: '/',
};

const LIVE_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://faithfightersforamerica.com';

export default function PageContentEditorPage() {
    return (
        <ProtectedRoute>
            <PageContentEditorContent />
        </ProtectedRoute>
    );
}

function PageContentEditorContent() {
    const { page } = useParams<{ page: string }>();
    const router = useRouter();
    const { toast } = useToast();

    const [manifest, setManifest] = useState<SiteContentPageManifest | null>(null);
    const [values, setValues] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch(`/api/site-content/${page}/manifest`, { credentials: 'include' }),
            fetch(`/api/site-content/${page}`, { credentials: 'include' }),
        ])
            .then(async ([manifestRes, contentRes]) => {
                if (!manifestRes.ok) { setNotFound(true); return; }
                const manifestData = await manifestRes.json();
                const contentData = contentRes.ok ? await contentRes.json() : { content: {} };
                setManifest(manifestData.manifest);
                setValues(contentData.content || {});
            })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [page]);

    const handleChange = (key: string, value: any) => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/site-content/${page}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ content: values }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Failed to save.');
            }
            toast('Saved — changes are live now.', 'success');
        } catch (e: any) {
            toast(e.message || 'Failed to save.', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Loading…</p>;
    }

    if (notFound || !manifest) {
        return (
            <div>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>No editable content found for &ldquo;{page}&rdquo;.</p>
                <button onClick={() => router.push('/admin/page-content')} style={{ marginTop: 12, color: '#F8C38F', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    ← Back to Page Content
                </button>
            </div>
        );
    }

    const livePath = LIVE_PATHS[page as string];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <div>
                    <button
                        onClick={() => router.push('/admin/page-content')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                            color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 10,
                        }}
                    >
                        <ArrowLeft size={14} /> Page Content
                    </button>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
                        {manifest.label}
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
                        Edit the text and images below, then Save — the live page updates immediately.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    {livePath && (
                        <a
                            href={`${LIVE_SITE_URL}${livePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10,
                                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                                color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700, textDecoration: 'none',
                            }}
                        >
                            <ExternalLink size={14} /> View live page
                        </a>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', fontSize: 13, fontWeight: 700,
                            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
                        }}
                    >
                        <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>

            <div style={{ background: '#15131f', borderRadius: 20, padding: 28, border: '1px solid rgba(255,255,255,0.06)' }}>
                <PageContentForm manifest={manifest} values={values} onChange={handleChange} />
            </div>
        </div>
    );
}
