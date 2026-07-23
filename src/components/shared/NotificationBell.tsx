'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {}
  }, []);

  // Initial fetch + poll every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) fetchNotifications();
  };

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', credentials: 'include' }).catch(() => {});
  };

  const markAllRead = async () => {
    setLoading(true);
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' }).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    setLoading(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        style={{
          position: 'relative', background: 'none', border: 'none',
          cursor: 'pointer', padding: '8px', borderRadius: '10px',
          color: '#64748b', display: 'flex', alignItems: 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '4px', right: '4px',
            background: '#E7421B', color: 'white',
            fontSize: '12px', fontWeight: 700, lineHeight: 1,
            minWidth: '16px', height: '16px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', border: '2px solid white',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 'calc(64px + 8px)', right: '12px',
          width: 'min(360px, calc(100vw - 24px))', background: 'white', borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid #f1f5f9', zIndex: 1000, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
          }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: '8px', background: '#fef2f2', color: '#E7421B',
                  fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={loading}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '12px', color: '#E7421B', fontWeight: 600, fontFamily: 'inherit',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><Bell size={32} color="#cbd5e1" /></div>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const item = (
                  <div
                    key={n._id}
                    onClick={() => !n.read && markRead(n._id)}
                    style={{
                      display: 'flex', gap: '12px', padding: '14px 20px',
                      background: n.read ? 'white' : '#fef9f9',
                      borderBottom: '1px solid #f8fafc', cursor: n.read ? 'default' : 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!n.read) (e.currentTarget.style.background = '#fef2f2'); }}
                    onMouseLeave={e => { if (!n.read) (e.currentTarget.style.background = '#fef9f9'); }}
                  >
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                      background: n.read ? 'transparent' : '#E7421B', marginTop: '6px',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '13px', color: '#0f172a', marginBottom: '2px' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, marginBottom: '4px' }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>
                );

                return n.link ? (
                  <Link key={n._id} href={n.link} style={{ textDecoration: 'none' }} onClick={() => { markRead(n._id); setOpen(false); }}>
                    {item}
                  </Link>
                ) : item;
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <Link
                href="/dashboard/activities"
                onClick={() => setOpen(false)}
                style={{ fontSize: '13px', color: '#E7421B', fontWeight: 600, textDecoration: 'none' }}
              >
                View all activity →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
