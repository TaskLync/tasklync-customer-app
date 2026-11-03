/**
 * Pakistani Phone Number Parsing, Carrier Detection & Deep Linking Utilities
 * Compliant with E.164 normalization, PTA network codes, and Android/iOS intent handling.
 */

import { Linking, Alert } from 'react-native';

export type PakistanCarrier = 'JAZZ' | 'ZONG' | 'TELENOR' | 'UFONE' | 'UNKNOWN';

export interface ParsedPakistaniPhone {
  raw: string;
  normalizedE164: string; // e.g., "+923001234567"
  nationalFormat: string; // e.g., "0300 1234567"
  carrier: PakistanCarrier;
  carrierDisplayName: string;
  isValid: boolean;
}

/**
 * Normalizes any variation of a Pakistani mobile phone number to E.164 standard (+923XXXXXXXXX).
 */
export function normalizePakistaniPhone(input: string | null | undefined): string {
  if (!input) return '';

  // Strip spaces, hyphens, brackets, non-digits (except leading +)
  let cleaned = input.trim().replace(/[^\d+]/g, '');

  // Handle "+92" or "0092"
  if (cleaned.startsWith('+92')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('0092')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('92') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Should now be a 10-digit number starting with 3 (e.g., 3001234567)
  if (cleaned.length === 10 && cleaned.startsWith('3')) {
    return `+92${cleaned}`;
  }

  // Fallback to raw if non-standard
  return input.trim();
}

/**
 * Identifies the cellular network carrier from the phone prefix.
 */
export function detectCarrier(e164Phone: string): { carrier: PakistanCarrier; name: string } {
  // Extract the 4-digit national prefix: +92 3XX -> "03XX"
  const digits = e164Phone.replace(/\D/g, '');
  let national = '';

  if (digits.startsWith('923') && digits.length === 12) {
    national = '0' + digits.substring(2, 5); // e.g. "0300"
  } else if (digits.startsWith('03') && digits.length === 11) {
    national = digits.substring(0, 4);
  } else if (digits.startsWith('3') && digits.length === 10) {
    national = '0' + digits.substring(0, 3);
  }

  if (!national) {
    return { carrier: 'UNKNOWN', name: 'Mobile' };
  }

  // Mobilink / Jazz: 0300 - 0309, 0320 - 0329 (Warid)
  if (/^030[0-9]/.test(national) || /^032[0-9]/.test(national)) {
    return { carrier: 'JAZZ', name: 'Jazz' };
  }

  // Zong: 0310 - 0319
  if (/^031[0-9]/.test(national)) {
    return { carrier: 'ZONG', name: 'Zong' };
  }

  // Telenor: 0340 - 0349
  if (/^034[0-9]/.test(national)) {
    return { carrier: 'TELENOR', name: 'Telenor' };
  }

  // Ufone: 0330 - 0337
  if (/^033[0-9]/.test(national)) {
    return { carrier: 'UFONE', name: 'Ufone' };
  }

  return { carrier: 'UNKNOWN', name: 'Mobile' };
}

/**
 * Formats a phone number for user-facing display: "0300 1234567"
 */
export function formatDisplayPhone(input: string | null | undefined): string {
  if (!input) return 'Not available';

  const e164 = normalizePakistaniPhone(input);
  const digits = e164.replace(/\D/g, '');

  if (digits.startsWith('923') && digits.length === 12) {
    const local = '0' + digits.substring(2);
    return `${local.substring(0, 4)} ${local.substring(4)}`;
  }

  return input;
}

/**
 * Parses a phone number with full metadata.
 */
export function parsePakistaniPhone(input: string | null | undefined): ParsedPakistaniPhone {
  const raw = input || '';
  const normalizedE164 = normalizePakistaniPhone(raw);
  const { carrier, name: carrierDisplayName } = detectCarrier(normalizedE164);
  const nationalFormat = formatDisplayPhone(raw);
  const isValid = normalizedE164.startsWith('+923') && normalizedE164.length === 13;

  return {
    raw,
    normalizedE164,
    nationalFormat,
    carrier,
    carrierDisplayName,
    isValid,
  };
}

/**
 * Opens the native device phone dialer.
 */
export async function openPhoneDialer(phone: string | null | undefined): Promise<boolean> {
  if (!phone) {
    Alert.alert('Phone Unavailable', 'No contact phone number is available.');
    return false;
  }

  const normalized = normalizePakistaniPhone(phone);
  const url = `tel:${normalized}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    } else {
      Alert.alert('Error', 'Unable to initiate phone call on this device.');
      return false;
    }
  } catch (error) {
    console.warn('[openPhoneDialer] Error opening phone dialer:', error);
    Alert.alert('Error', 'Could not open phone dialer.');
    return false;
  }
}

/**
 * Opens WhatsApp chat with a pre-filled contextual message.
 */
export async function openWhatsAppChat(
  phone: string | null | undefined,
  message?: string
): Promise<boolean> {
  if (!phone) {
    Alert.alert('Phone Unavailable', 'No contact phone number is available.');
    return false;
  }

  const normalized = normalizePakistaniPhone(phone);
  // Strip the leading '+' for WhatsApp URL: 923001234567
  const waDigits = normalized.replace(/\D/g, '');
  const encodedText = message ? encodeURIComponent(message) : '';

  const deepLink = `whatsapp://send?phone=${waDigits}${encodedText ? `&text=${encodedText}` : ''}`;
  const webFallback = `https://wa.me/${waDigits}${encodedText ? `?text=${encodedText}` : ''}`;

  try {
    const canOpen = await Linking.canOpenURL(deepLink);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return true;
    } else {
      // Fallback to web link
      await Linking.openURL(webFallback);
      return true;
    }
  } catch (error) {
    console.warn('[openWhatsAppChat] Error opening WhatsApp:', error);
    Alert.alert('WhatsApp Unavailable', 'Could not open WhatsApp on this device.');
    return false;
  }
}
