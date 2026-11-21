/**
 * Customer support channels. Values come from the build environment so the app never ships invented
 * contact details: a channel without a configured value is simply not shown.
 *
 *   EXPO_PUBLIC_SUPPORT_EMAIL      e.g. support@tasklync.pk (defaults to the address the app already used)
 *   EXPO_PUBLIC_SUPPORT_PHONE      helpline, international format, e.g. +92XXXXXXXXXX
 *   EXPO_PUBLIC_SUPPORT_WHATSAPP   WhatsApp number, international format (falls back to the helpline)
 *   EXPO_PUBLIC_IOS_APP_STORE_ID   numeric App Store id, enables "Rate Tasklync" on iOS
 */
const env = (value: string | undefined): string => (value ?? '').trim();

const phone = env(process.env.EXPO_PUBLIC_SUPPORT_PHONE);

export const SUPPORT_CONFIG = {
  email: env(process.env.EXPO_PUBLIC_SUPPORT_EMAIL) || 'support@tasklync.pk',
  phone,
  whatsapp: env(process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP) || phone,
  /** Must match app.config.ts android.package. */
  androidPackage: 'com.tasklync.user',
  iosAppStoreId: env(process.env.EXPO_PUBLIC_IOS_APP_STORE_ID),
} as const;

/** "+923001112233" -> "+92 300 1112233" for display; anything else is shown as given. */
export function formatSupportPhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, '');
  const pk = digits.match(/^\+92(\d{3})(\d{7})$/);
  return pk ? `+92 ${pk[1]} ${pk[2]}` : value;
}
