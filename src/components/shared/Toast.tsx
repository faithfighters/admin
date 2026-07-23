'use client';

import { useState, useCallback, useEffect, createContext, useContext } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

const ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} />,
    error:   <XCircle size={16} />,
    info:    <AlertCircle size={16} />,
};

const COLORS: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
    error:   { bg: '#fef2f2', border: '#fecaca', color: '#E7421B' },
    info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb' },
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
    const c = COLORS[item.type];
    useEffect(() => {
        const t = setTimeout(() => onDismiss(item.id), 3500);
        return () => clearTimeout(t);
    }, [item.id, onDismiss]);

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            background: c.bg, border: `1px solid ${c.border}`, color: c.color,
            borderRadius: '12px', padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            fontSize: '14px', fontWeight: 600, maxWidth: '360px', width: '100%',
            animation: 'toast-in 0.2s ease',
        }}>
            {ICONS[item.type]}
            <span style={{ flex: 1 }}>{item.message}</span>
            <button
                onClick={() => onDismiss(item.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, opacity: 0.6, padding: 0, display: 'flex' }}
            >
                <X size={14} />
            </button>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).slice(2);
        setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    }, []);

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
            <div style={{
                position: 'fixed', bottom: '24px', right: '24px',
                display: 'flex', flexDirection: 'column', gap: '8px',
                zIndex: 9999, alignItems: 'flex-end',
            }}>
                {toasts.map(t => <ToastItem key={t.id} item={t} onDismiss={dismiss} />)}
            </div>
        </ToastContext.Provider>
    );
}
