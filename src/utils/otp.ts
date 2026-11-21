/**
 * Pure helpers for the OTP verification flow (no React / RN imports so they stay unit-testable).
 * Lengths are always passed in by the caller (from OTP_CONFIG); nothing is assumed here.
 */

const MASK_CHAR = '•';

/**
 * Normalises whatever lands in the hidden OTP field (typing, paste, SMS autofill) into digits only.
 *
 * A paste can carry surrounding text ("Your code is 482913. Do not share it."), so when the raw text
 * contains a run of exactly `length` digits we take that run; otherwise we strip non-digits and clamp,
 * which covers normal typing and spaced pastes such as "482 913".
 */
export function sanitizeOtpInput(text: string, length: number): string {
  if (!text) return '';
  if (text.length > length) {
    const run = text.match(new RegExp(`(?<!\\d)\\d{${length}}(?!\\d)`));
    if (run) return run[0];
  }
  return text.replace(/\D/g, '').slice(0, length);
}

/** Last `count` digits of a phone number ("+923001234567", 2 → "67"). */
export function phoneLastDigits(phone: string | undefined | null, count: number): string {
  return (phone ?? '').replace(/\D/g, '').slice(-count);
}

/**
 * Masks a phone number for display. The country code is read from the number itself (everything before
 * the last `nationalLength` digits); the first national digit and the last `visibleDigits` stay visible.
 *   maskPhoneNumber("+923001234567", 2, 10) → "+92 3•• ••• ••67"
 */
export function maskPhoneNumber(
  phone: string | undefined | null,
  visibleDigits: number,
  nationalLength: number,
): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= visibleDigits) return phone;

  const national = digits.length > nationalLength ? digits.slice(-nationalLength) : digits;
  const countryCode = digits.slice(0, digits.length - national.length);

  const masked = Array.from(national, (d, i) =>
    i === 0 || i >= national.length - visibleDigits ? d : MASK_CHAR,
  ).join('');
  const grouped = [masked.slice(0, 3), masked.slice(3, 6), masked.slice(6)].filter(Boolean).join(' ');

  return countryCode ? `+${countryCode} ${grouped}` : grouped;
}

/** Seconds → "MM:SS" (e.g. 55 → "00:55", 125 → "02:05"). */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
