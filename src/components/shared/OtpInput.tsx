import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: boolean;
}

export default function OtpInput({ value, onChange, disabled = false, error = false }: OtpInputProps) {
    const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Sync external value to internal state
    useEffect(() => {
        const valDigits = value.split('').slice(0, 6);
        const newDigits = Array(6).fill('');
        for (let i = 0; i < valDigits.length; i++) {
            newDigits[i] = valDigits[i];
        }
        setDigits(newDigits);
    }, [value]);

    const handleDigitChange = (index: number, val: string) => {
        // Only allow numbers
        const lastChar = val.slice(-1);
        if (lastChar && !/^\d$/.test(lastChar)) return;

        const newDigits = [...digits];
        newDigits[index] = lastChar;
        setDigits(newDigits);

        const combined = newDigits.join('');
        onChange(combined);

        // Auto focus next input
        if (lastChar && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!digits[index] && index > 0) {
                // Focus previous input and clear it
                const newDigits = [...digits];
                newDigits[index - 1] = '';
                setDigits(newDigits);
                onChange(newDigits.join(''));
                inputRefs.current[index - 1]?.focus();
            } else if (digits[index]) {
                // Clear current input
                const newDigits = [...digits];
                newDigits[index] = '';
                setDigits(newDigits);
                onChange(newDigits.join(''));
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (disabled) return;

        const pasteData = e.clipboardData.getData('text').trim();
        if (!/^\d+$/.test(pasteData)) return; // Only allow digits

        const pasteDigits = pasteData.slice(0, 6).split('');
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
            if (pasteDigits[i]) {
                newDigits[i] = pasteDigits[i];
            }
        }
        setDigits(newDigits);
        onChange(newDigits.join(''));

        // Focus the last filled input or the last input
        const focusIndex = Math.min(pasteDigits.length, 5);
        inputRefs.current[focusIndex]?.focus();
    };

    return (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '12px 0' }}>
            {digits.map((digit, i) => (
                <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    disabled={disabled}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    style={{
                        width: '42px',
                        height: '46px',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: error ? '#E7421B' : '#ffffff',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: error ? '1.5px solid #E7421B' : '1.5px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        outline: 'none',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                        boxShadow: error ? '0 0 0 3px rgba(231, 66, 27, 0.05)' : undefined,
                    }}
                    onFocus={(e) => {
                        if (!error) {
                            e.target.style.borderColor = '#ff5a1f';
                            e.target.style.boxShadow = '0 0 0 3px rgba(255, 90, 31, 0.18)';
                        }
                    }}
                    onBlur={(e) => {
                        if (!error) {
                            e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.target.style.boxShadow = 'none';
                        }
                    }}
                />
            ))}
        </div>
    );
}
