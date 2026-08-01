export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

const PATTERNS: Record<HapticStyle, number[]> = {
  selection: [10],
  light:     [15],
  medium:    [25],
  heavy:     [50],
  success:   [10, 60, 10],
  error:     [50, 30, 50],
};

export function haptic(style: HapticStyle = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(PATTERNS[style]);
  }
}

// Added for compatibility with FaithFighters components
const vibe = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
};

export const haptics = {
    tap: () => vibe(10),
    success: () => vibe([20, 80, 30]),
    error: () => vibe([50, 30, 50]),
    warning: () => vibe(30),
    select: () => vibe(5),
    menu: () => vibe(8),
};
