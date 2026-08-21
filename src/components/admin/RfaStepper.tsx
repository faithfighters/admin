'use client';

import { Check } from 'lucide-react';

// Testimonial is collected before payment is marked complete — recipients
// are far less likely to follow through once they already have the funds.
export const RFA_STAGES = [
  { key: 'submitted', label: 'Submitted' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'funding_in_progress', label: 'Funding in Progress' },
  { key: 'payment_scheduled', label: 'Payment Scheduled' },
  { key: 'testimonial_received', label: 'Testimonial Received' },
  { key: 'payment_completed', label: 'Payment Completed' },
  { key: 'case_closed', label: 'Case Closed' },
] as const;

export default function RfaStepper({
  status,
  onSelectStage,
  disabled,
}: {
  status: string;
  onSelectStage: (stage: string) => void;
  disabled?: boolean;
}) {
  const currentIndex = RFA_STAGES.findIndex(s => s.key === status);

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: '760px' }}>
        {RFA_STAGES.map((stage, i) => {
          const isDone = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <button
                onClick={() => !disabled && onSelectStage(stage.key)}
                disabled={disabled}
                title={`Set status to ${stage.label}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  background: 'none', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', padding: 0, flex: 1,
                }}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, flexShrink: 0,
                  background: isCurrent
                    ? 'linear-gradient(135deg, #E7421B, #F8C38F)'
                    : isDone
                      ? 'rgba(74,222,128,0.2)'
                      : 'rgba(255,255,255,0.06)',
                  color: isCurrent ? '#ffffff' : isDone ? '#4ade80' : 'rgba(255,255,255,0.4)',
                  border: isCurrent ? '2px solid #F8C38F' : '1.5px solid rgba(255,255,255,0.1)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(248,195,143,0.15)' : 'none',
                }}>
                  {isDone ? <Check size={14} /> : i + 1}
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: isCurrent ? 700 : 600, textAlign: 'center',
                  color: isCurrent ? '#F8C38F' : isDone ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.4)',
                  lineHeight: 1.3, maxWidth: '86px',
                }}>
                  {stage.label}
                </span>
              </button>
              {i < RFA_STAGES.length - 1 && (
                <div style={{
                  height: '1.5px', flex: 1, marginTop: '15px', marginLeft: '-8px', marginRight: '-8px',
                  background: i < currentIndex ? '#4ade80' : 'rgba(255,255,255,0.1)',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
