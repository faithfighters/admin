'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { useToast } from '@/components/shared/Toast';
import RfaStepper from '@/components/admin/RfaStepper';
import styles from '../../page.module.css';

interface StatusHistoryEntry {
  status: string;
  changedAt: string;
  changedByName?: string;
  note?: string;
}

interface Testimonial {
  type?: string;
  writtenText?: string;
  videoUrl?: string;
  photoUrl?: string;
  submittedAt?: string;
  status?: string;
}

interface AssistanceRequest {
  id: string;
  memberName: string;
  requestTitle: string;
  category: string;
  description: string;
  documentUrls: string[];
  status: string;
  statusHistory: StatusHistoryEntry[];
  amountRequested: number;
  amountApproved?: number;
  amountPaid?: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentReferenceNumber?: string;
  internalNotes?: string;
  fundsUsage?: string;
  paymentRecipientType?: string;
  paymentRecipientName?: string;
  paymentCompleted?: boolean;
  testimonial?: Testimonial;
  testimonialRequestedAt?: string;
  createdAt: string;
  voteCount?: number;
  requiredVotes?: number;
}

const inputStyle: React.CSSProperties = {
  padding: '9px 14px', border: '1.5px solid rgba(255,255,255,0.08)', borderRadius: '10px',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)', color: '#ffffff',
};

export default function AdminRfaDetailPage() {
  return (
    <ProtectedRoute>
      <RfaDetailContent />
    </ProtectedRoute>
  );
}

function RfaDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [request, setRequest] = useState<AssistanceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [financials, setFinancials] = useState({
    amountApproved: '', amountPaid: '', paymentDate: '', paymentMethod: 'check',
    paymentReferenceNumber: '', internalNotes: '', paymentCompleted: false,
  });
  const [paymentDetails, setPaymentDetails] = useState({
    fundsUsage: '', paymentRecipientType: 'vendor', paymentRecipientName: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/assistance-requests/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const r: AssistanceRequest = d.request;
        setRequest(r);
        setFinancials({
          amountApproved: r.amountApproved != null ? String(r.amountApproved) : '',
          amountPaid: r.amountPaid != null ? String(r.amountPaid) : '',
          paymentDate: r.paymentDate || '',
          paymentMethod: r.paymentMethod || 'check',
          paymentReferenceNumber: r.paymentReferenceNumber || '',
          internalNotes: r.internalNotes || '',
          paymentCompleted: !!r.paymentCompleted,
        });
        setPaymentDetails({
          fundsUsage: r.fundsUsage || '',
          paymentRecipientType: r.paymentRecipientType || 'vendor',
          paymentRecipientName: r.paymentRecipientName || '',
        });
      })
      .catch(() => toast('Failed to load request.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const setStage = async (status: string) => {
    if (!request) return;
    if (!confirm(`Set status to "${status.replace(/_/g, ' ')}"?`)) return;
    setSaving('status');
    const res = await fetch(`/api/admin/assistance-requests/${id}/status`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSaving(null);
    if (res.ok) { toast('Status updated.', 'success'); load(); }
    else toast('Failed to update status.', 'error');
  };

  const saveFinancials = async () => {
    setSaving('financials');
    const res = await fetch(`/api/admin/assistance-requests/${id}/financials`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amountApproved: financials.amountApproved ? Number(financials.amountApproved) : undefined,
        amountPaid: financials.amountPaid ? Number(financials.amountPaid) : undefined,
        paymentDate: financials.paymentDate || undefined,
        paymentMethod: financials.paymentMethod || undefined,
        paymentReferenceNumber: financials.paymentReferenceNumber || undefined,
        internalNotes: financials.internalNotes || undefined,
        paymentCompleted: financials.paymentCompleted,
      }),
    });
    setSaving(null);
    if (res.ok) { toast('Financials saved.', 'success'); load(); }
    else toast('Failed to save financials.', 'error');
  };

  const requestTestimonial = async () => {
    setSaving('request-testimonial');
    const res = await fetch(`/api/admin/assistance-requests/${id}/request-testimonial`, {
      method: 'POST', credentials: 'include',
    });
    setSaving(null);
    if (res.ok) { toast('Recipient notified.', 'success'); load(); }
    else toast('Failed to notify recipient.', 'error');
  };

  const rejectTestimonial = async () => {
    if (!confirm('Reject and remove this testimonial? The member will be able to submit a new one.')) return;
    setSaving('reject-testimonial');
    const res = await fetch(`/api/admin/assistance-requests/${id}/testimonial/reject`, {
      method: 'POST', credentials: 'include',
    });
    setSaving(null);
    if (res.ok) { toast('Testimonial rejected and removed.', 'success'); load(); }
    else toast('Failed to reject testimonial.', 'error');
  };

  const approveTestimonial = async () => {
    setSaving('approve-testimonial');
    const res = await fetch(`/api/admin/assistance-requests/${id}/testimonial/approve`, {
      method: 'POST', credentials: 'include',
    });
    setSaving(null);
    if (res.ok) { toast('Testimonial approved — case closed.', 'success'); load(); }
    else toast('Failed to approve testimonial.', 'error');
  };

  const savePaymentDetails = async () => {
    setSaving('payment-details');
    const res = await fetch(`/api/admin/assistance-requests/${id}/payment-details`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentDetails),
    });
    setSaving(null);
    if (res.ok) { toast('Payment details saved.', 'success'); load(); }
    else toast('Failed to save payment details.', 'error');
  };

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.85)' }}>Loading...</p>;
  if (!request) return <p style={{ color: 'rgba(255,255,255,0.85)' }}>Request not found.</p>;

  return (
    <div>
      <button
        onClick={() => router.push('/admin/rfa')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F8C38F', fontSize: 14, fontWeight: 600, marginBottom: '20px', padding: 0 }}
      >
        ← Back to Assistance Requests
      </button>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', margin: '0 0 4px' }}>{request.requestTitle}</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                {request.memberName} · <span style={{ textTransform: 'capitalize' }}>{request.category}</span> · Submitted {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Requested</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#4ade80' }}>${request.amountRequested.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: '16px' }}>{request.description}</p>

          {!!request.requiredVotes && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                <span>Votes toward this request's goal</span>
                <span style={{ fontWeight: 700, color: '#ffffff' }}>{request.voteCount ?? 0} / {request.requiredVotes}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '4px',
                  width: `${Math.min(100, ((request.voteCount ?? 0) / request.requiredVotes) * 100)}%`,
                  background: 'linear-gradient(90deg, #F8C38F, #E7421B)',
                }} />
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '6px 0 0' }}>
                Based on the platform's $0.80-per-vote conversion — specific to this request's own ${request.amountRequested.toLocaleString()} goal, not the linked cause's cumulative totals.
              </p>
            </div>
          )}

          {request.documentUrls?.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {request.documentUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)', fontSize: '12px', textDecoration: 'none' }}>
                  <FileText size={14} /> Document {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Status stepper */}
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 20px' }}>Case Status</h2>
          <RfaStepper status={request.status} onSelectStage={setStage} disabled={saving === 'status'} />
        </div>

        {/* Financial tracking */}
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px' }}>Financial Tracking</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            <FormRow label="Amount Approved ($)">
              <input style={inputStyle} type="number" min="0" step="0.01" value={financials.amountApproved} onChange={e => setFinancials(p => ({ ...p, amountApproved: e.target.value }))} />
            </FormRow>
            <FormRow label="Amount Paid ($)">
              <input style={inputStyle} type="number" min="0" step="0.01" value={financials.amountPaid} onChange={e => setFinancials(p => ({ ...p, amountPaid: e.target.value }))} />
            </FormRow>
            <FormRow label="Payment Date">
              <input style={inputStyle} type="date" value={financials.paymentDate ? financials.paymentDate.slice(0, 10) : ''} onChange={e => setFinancials(p => ({ ...p, paymentDate: e.target.value }))} />
            </FormRow>
            <FormRow label="Payment Method">
              <select style={inputStyle} value={financials.paymentMethod} onChange={e => setFinancials(p => ({ ...p, paymentMethod: e.target.value }))}>
                <option value="check">Check</option>
                <option value="ach">ACH Transfer</option>
                <option value="paypal">PayPal</option>
                <option value="other">Other</option>
              </select>
            </FormRow>
            <FormRow label="Payment Reference Number">
              <input style={inputStyle} value={financials.paymentReferenceNumber} onChange={e => setFinancials(p => ({ ...p, paymentReferenceNumber: e.target.value }))} />
            </FormRow>
          </div>
          <FormRow label="Internal Notes (admin-only)">
            <textarea style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties} rows={3} value={financials.internalNotes} onChange={e => setFinancials(p => ({ ...p, internalNotes: e.target.value }))} />
          </FormRow>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.85)', cursor: 'pointer' }}>
            <input type="checkbox" checked={financials.paymentCompleted} onChange={e => setFinancials(p => ({ ...p, paymentCompleted: e.target.checked }))} />
            Payment completed
          </label>
          <div style={{ marginTop: '16px' }}>
            <button onClick={saveFinancials} disabled={saving === 'financials'} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: saving === 'financials' ? 'not-allowed' : 'pointer', opacity: saving === 'financials' ? 0.6 : 1, fontFamily: 'inherit' }}>
              {saving === 'financials' ? 'Saving…' : 'Save Financials'}
            </button>
          </div>
        </div>

        {/* Payment details */}
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px' }}>Payment Details</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
            <FormRow label="Paid To (Type)">
              <select style={inputStyle} value={paymentDetails.paymentRecipientType} onChange={e => setPaymentDetails(p => ({ ...p, paymentRecipientType: e.target.value }))}>
                <option value="vendor">Vendor</option>
                <option value="landlord">Landlord</option>
                <option value="utility_company">Utility Company</option>
                <option value="individual">Individual</option>
                <option value="other">Other</option>
              </select>
            </FormRow>
            <FormRow label="Recipient Name">
              <input style={inputStyle} value={paymentDetails.paymentRecipientName} onChange={e => setPaymentDetails(p => ({ ...p, paymentRecipientName: e.target.value }))} />
            </FormRow>
          </div>
          <FormRow label="What the funds are being used for">
            <textarea style={{ ...inputStyle, resize: 'vertical' } as React.CSSProperties} rows={2} value={paymentDetails.fundsUsage} onChange={e => setPaymentDetails(p => ({ ...p, fundsUsage: e.target.value }))} />
          </FormRow>
          <div style={{ marginTop: '16px' }}>
            <button onClick={savePaymentDetails} disabled={saving === 'payment-details'} style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: saving === 'payment-details' ? 'not-allowed' : 'pointer', opacity: saving === 'payment-details' ? 0.6 : 1, fontFamily: 'inherit' }}>
              {saving === 'payment-details' ? 'Saving…' : 'Save Payment Details'}
            </button>
          </div>
        </div>

        {/* Testimonial */}
        <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px' }}>Testimonial</h2>
          {request.testimonial?.status === 'submitted' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                Submitted {request.testimonial.submittedAt ? new Date(request.testimonial.submittedAt).toLocaleString() : ''}
              </div>
              {request.testimonial.type === 'written' && (
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
                  &ldquo;{request.testimonial.writtenText}&rdquo;
                </p>
              )}
              {request.testimonial.type === 'video' && request.testimonial.videoUrl && (
                <a href={request.testimonial.videoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '13px' }}>
                  <VideoIcon size={16} /> View video testimonial
                </a>
              )}
              {request.testimonial.photoUrl && (
                <a href={request.testimonial.photoUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '13px' }}>
                  <ImageIcon size={16} /> View photo
                </a>
              )}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {request.status !== 'case_closed' && (
                  <button
                    onClick={approveTestimonial}
                    disabled={saving === 'approve-testimonial'}
                    style={{ padding: '8px 16px', background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: saving === 'approve-testimonial' ? 'not-allowed' : 'pointer', opacity: saving === 'approve-testimonial' ? 0.6 : 1, fontFamily: 'inherit' }}
                  >
                    {saving === 'approve-testimonial' ? 'Approving…' : 'Approve & Close Case'}
                  </button>
                )}
                <button
                  onClick={rejectTestimonial}
                  disabled={saving === 'reject-testimonial'}
                  style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: saving === 'reject-testimonial' ? 'not-allowed' : 'pointer', opacity: saving === 'reject-testimonial' ? 0.6 : 1, fontFamily: 'inherit' }}
                >
                  {saving === 'reject-testimonial' ? 'Removing…' : 'Reject & Remove'}
                </button>
              </div>
            </div>
          ) : request.status === 'payment_completed' || request.status === 'testimonial_received' || request.status === 'case_closed' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
                No testimonial submitted yet. The member can submit one once notified.
              </p>
              <div>
                <button
                  onClick={requestTestimonial}
                  disabled={saving === 'request-testimonial'}
                  style={{ padding: '9px 18px', background: 'linear-gradient(135deg, #E7421B, #F8C38F)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '13px', cursor: saving === 'request-testimonial' ? 'not-allowed' : 'pointer', opacity: saving === 'request-testimonial' ? 0.6 : 1, fontFamily: 'inherit' }}
                >
                  {saving === 'request-testimonial'
                    ? 'Sending…'
                    : request.testimonialRequestedAt ? 'Resend Notification' : 'Notify Recipient — Request Testimonial'}
                </button>
                {request.testimonialRequestedAt && (
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    ✓ Requested on {new Date(request.testimonialRequestedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
              No testimonial submitted yet. The member can submit one once the case reaches Payment Completed.
            </p>
          )}
        </div>

        {/* Status history */}
        {request.statusHistory?.length > 0 && (
          <div style={{ background: '#15131f', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', margin: '0 0 16px' }}>Status History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <AnimatePresence>
                {[...request.statusHistory].reverse().map((h, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: i < request.statusHistory.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#ffffff', textTransform: 'capitalize' }}>{h.status.replace(/_/g, ' ')}</span>
                      {h.changedByName && <span style={{ color: 'rgba(255,255,255,0.4)' }}> — {h.changedByName}</span>}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date(h.changedAt).toLocaleString()}</span>
                  </div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '4px' }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</label>
      {children}
    </div>
  );
}
