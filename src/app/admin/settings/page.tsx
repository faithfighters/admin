'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
import { haptic } from '@/lib/haptics';
import {
    Shield, Bell, Globe,
    ChevronRight, ToggleLeft, ToggleRight, Save,
    RefreshCw, X, LogOut,
    AlertTriangle, Zap, Settings,
} from 'lucide-react';

interface SettingToggle {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
}

interface NotificationToggle {
    id: string;
    label: string;
    desc: string;
    enabled: boolean;
}

export default function SettingsPage() {
    return (
        <ProtectedRoute>
            <SettingsContent />
        </ProtectedRoute>
    );
}

function SettingsContent() {
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('platform');

    // Feature toggles
    const [features, setFeatures] = useState<SettingToggle[]>([
        { id: 'video_submissions', label: 'Video Submissions', description: 'Allow members to submit video campaigns', enabled: true },
        { id: 'public_voting', label: 'Public Voting', description: 'Enable public voting on active campaigns', enabled: true },
        { id: 'auto_approve', label: 'Auto-Approve Videos', description: 'Skip manual moderation for trusted members', enabled: false },
        { id: 'email_notifications', label: 'Email Notifications', description: 'Send email alerts for new submissions and votes', enabled: true },
        { id: 'member_registration', label: 'Member Registration', description: 'Allow new members to register on the platform', enabled: true },
        { id: 'stripe_webhooks', label: 'Stripe Webhooks', description: 'Process payment events in real-time', enabled: true },
        { id: 'ai_moderation', label: 'AI Content Moderation', description: 'Use AI to pre-screen video submissions', enabled: false },
        { id: 'two_factor', label: 'Require 2FA for Admins', description: 'Enforce two-factor authentication for all admin accounts', enabled: false },
    ]);

    // Notification toggles — component-level state, not inside map()
    const [notifications, setNotifications] = useState<NotificationToggle[]>([
        { id: 'new_video', label: 'New Video Submission', desc: 'Alert when a member submits a new video', enabled: true },
        { id: 'moderation_required', label: 'Moderation Required', desc: 'Alert when videos reach pending moderation queue', enabled: true },
        { id: 'new_member', label: 'New Member Registration', desc: 'Alert when a new member joins', enabled: false },
        { id: 'payment_received', label: 'Payment Received', desc: 'Alert on successful subscription payments', enabled: true },
        { id: 'payout_processed', label: 'Payout Processed', desc: 'Alert when a charity payout is completed', enabled: true },
        { id: 'failed_payment', label: 'Failed Payment', desc: 'Alert on failed or declined payments', enabled: true },
        { id: 'content_reported', label: 'Content Reported', desc: 'Alert when content is reported by users', enabled: true },
        { id: 'weekly_digest', label: 'Weekly Summary Digest', desc: 'Weekly email digest of platform metrics', enabled: false },
    ]);

    // Login history
    const [loginHistory, setLoginHistory] = useState([
        { id: 1, ip: '192.168.1.1', device: 'Chrome on macOS', time: 'Today, 2:34 PM', status: 'success' },
        { id: 2, ip: '192.168.1.1', device: 'Chrome on macOS', time: 'Yesterday, 9:12 AM', status: 'success' },
        { id: 3, ip: '10.0.0.45', device: 'Safari on iPhone', time: 'Jun 12, 2026, 6:45 PM', status: 'success' },
        { id: 4, ip: '203.0.113.1', device: 'Firefox on Windows', time: 'Jun 10, 2026, 3:22 PM', status: 'failed' },
        { id: 5, ip: '192.168.1.1', device: 'Chrome on macOS', time: 'Jun 9, 2026, 11:08 AM', status: 'success' },
    ]);

    // Platform config
    const [supportEmail, setSupportEmail] = useState('support@faithfightersforamerica.com');
    const [charityPoolPercent, setCharityPoolPercent] = useState(80);
    const [maxVotesPerCycle, setMaxVotesPerCycle] = useState(30);
    const [voteCycleDays, setVoteCycleDays] = useState(30);

    const toggleFeature = (id: string) => {
        haptic('selection');
        setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
    };

    const toggleNotification = (id: string) => {
        haptic('selection');
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, enabled: !n.enabled } : n));
    };

    const handleSave = async () => {
        haptic('medium');
        setSaving(true);
        await new Promise(r => setTimeout(r, 800));
        setSaving(false);
        toast('Settings saved successfully', 'success');
        haptic('success');
    };

    const twoFactorEnabled = features.find(f => f.id === 'two_factor')?.enabled ?? false;

    const sections = [
        { id: 'platform', label: 'Platform', icon: <Globe size={16} /> },
        { id: 'features', label: 'Feature Flags', icon: <Zap size={16} /> },
        { id: 'security', label: 'Security', icon: <Shield size={16} /> },
        { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Settings size={26} color="#F8C38F" />
                    Settings &amp; Configuration
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', margin: 0 }}>Manage platform configuration, feature flags, and security settings.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '24px', alignItems: 'start' }}>

                {/* Left nav */}
                <div style={{ background: '#15131f', borderRadius: '20px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: '20px' }}>
                    {sections.map(s => (
                        <button
                            key={s.id}
                            onClick={() => { setActiveSection(s.id); haptic('selection'); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', borderRadius: '12px', border: 'none',
                                background: activeSection === s.id ? 'linear-gradient(135deg, #E7421B, #F8C38F)' : 'transparent',
                                color: activeSection === s.id ? 'white' : 'rgba(255,255,255,0.5)',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                transition: 'all 0.2s', textAlign: 'left', marginBottom: '2px',
                            }}
                        >
                            {s.icon} {s.label}
                            {activeSection === s.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                        </button>
                    ))}
                </div>

                {/* Content area */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Platform Settings */}
                    {activeSection === 'platform' && (
                        <div style={{ background: '#15131f', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>Platform Configuration</h2>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Core platform settings and business rules.</p>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                {([
                                    { label: 'Support Email', value: supportEmail, setter: setSupportEmail, type: 'email' },
                                ] as { label: string; value: string; setter: (v: string) => void; type: string }[]).map(field => (
                                    <div key={field.label}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>{field.label}</label>
                                        <input
                                            type={field.type}
                                            value={field.value}
                                            onChange={e => field.setter(e.target.value)}
                                            style={{ width: '100%', padding: '10px 14px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }}
                                            onFocus={e => (e.target.style.borderColor = '#F8C38F')}
                                            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                                        />
                                    </div>
                                ))}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    {([
                                        { label: 'Charity Pool %', value: charityPoolPercent, setter: setCharityPoolPercent, min: 50, max: 95, suffix: '%' },
                                        { label: 'Max Votes / Cycle', value: maxVotesPerCycle, setter: setMaxVotesPerCycle, min: 1, max: 100, suffix: '' },
                                        { label: 'Vote Cycle (Days)', value: voteCycleDays, setter: setVoteCycleDays, min: 7, max: 90, suffix: 'd' },
                                    ] as { label: string; value: number; setter: (v: number) => void; min: number; max: number; suffix: string }[]).map(field => (
                                        <div key={field.label}>
                                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '6px' }}>{field.label}</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={field.value}
                                                    min={field.min}
                                                    max={field.max}
                                                    onChange={e => field.setter(Number(e.target.value))}
                                                    style={{ width: '100%', padding: '10px 32px 10px 14px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', fontSize: '14px', fontWeight: 700, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', color: '#ffffff' }}
                                                />
                                                {field.suffix && (
                                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                                                        {field.suffix}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Fund split preview */}
                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fund Split Preview</div>
                                    <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', height: '32px' }}>
                                        <div style={{ flex: charityPoolPercent, background: 'linear-gradient(90deg, #16a34a, #22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'white' }}>
                                            {charityPoolPercent}% Charity
                                        </div>
                                        <div style={{ flex: 100 - charityPoolPercent, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'white' }}>
                                            {100 - charityPoolPercent}% Ops
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Feature Flags */}
                    {activeSection === 'features' && (
                        <div style={{ background: '#15131f', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>Feature Flags</h2>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Toggle platform features on/off without code deployments.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {features.map(f => (
                                    <div
                                        key={f.id}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '14px', border: '1px solid', borderColor: f.enabled ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)', background: f.enabled ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={() => toggleFeature(f.id)}
                                    >
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginBottom: '2px' }}>{f.label}</div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{f.description}</div>
                                        </div>
                                        <div style={{ flexShrink: 0, marginLeft: '16px' }}>
                                            {f.enabled
                                                ? <ToggleRight size={32} color="#4ade80" />
                                                : <ToggleLeft size={32} color="rgba(255,255,255,0.3)" />
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Security */}
                    {activeSection === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Login History */}
                            <div style={{ background: '#15131f', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>Recent Login History</h2>
                                    {loginHistory.length > 0 && (
                                        <button
                                            onClick={() => {
                                                haptic('medium');
                                                setLoginHistory([]);
                                                toast('All sessions removed', 'success');
                                            }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '10px', background: 'rgba(231,66,27,0.12)', border: '1px solid rgba(231,66,27,0.3)', color: '#F8C38F', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            <LogOut size={13} />
                                            Logout All
                                        </button>
                                    )}
                                </div>
                                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>Last 5 admin logins for security monitoring.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {loginHistory.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                                            No active sessions.
                                        </div>
                                    ) : loginHistory.map((entry, i) => (
                                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', background: i === 0 ? 'rgba(255,255,255,0.04)' : 'transparent', border: '1px solid', borderColor: i === 0 ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{entry.device}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{entry.ip}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{entry.time}</div>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: entry.status === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(231,66,27,0.15)', color: entry.status === 'success' ? '#4ade80' : '#F8C38F' }}>
                                                        {entry.status}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        haptic('light');
                                                        setLoginHistory(prev => prev.filter(e => e.id !== entry.id));
                                                        toast('Session removed', 'success');
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', flexShrink: 0 }}
                                                    aria-label="Remove session"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 2FA Warning */}
                            {!twoFactorEnabled && (
                                <div style={{ padding: '16px 20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <AlertTriangle size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fbbf24' }}>Two-Factor Authentication is not enabled</div>
                                        <div style={{ fontSize: '12px', color: 'rgba(251,191,36,0.8)' }}>Enable 2FA to protect admin accounts. Go to Feature Flags to enable.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notifications */}
                    {activeSection === 'notifications' && (
                        <div style={{ background: '#15131f', borderRadius: '20px', padding: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>Notification Preferences</h2>
                            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>Configure when and how admins receive notifications.</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {notifications.map(n => (
                                    <div
                                        key={n.id}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: '12px', border: '1px solid', borderColor: n.enabled ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.06)', background: n.enabled ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}
                                        onClick={() => toggleNotification(n.id)}
                                    >
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{n.label}</div>
                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{n.desc}</div>
                                        </div>
                                        {n.enabled
                                            ? <ToggleRight size={28} color="#4ade80" />
                                            : <ToggleLeft size={28} color="rgba(255,255,255,0.3)" />
                                        }
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Save / Reset buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <button
                            onClick={() => { haptic('light'); }}
                            style={{ padding: '11px 20px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <RefreshCw size={14} /> Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{ padding: '11px 24px', border: 'none', borderRadius: '12px', background: saving ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
                        >
                            {saving
                                ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                                : <><Save size={14} /> Save Changes</>
                            }
                        </button>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
