import { ProfileMenuSectionConfig } from '../types/user.types';

/**
 * Profile Menu Configuration (Day 38)
 *
 * Implements Serial Position Effect & Hick's Law:
 * - Expressed as a typed data structure (not hardcoded JSX)
 * - Section 1: Core Account & Personal Management (Addresses, Payment, Booking History, Settings)
 * - Section 2: Support, Help & Legal
 * - Section 3: Privacy, Safety & Danger Zone (Blocked Workers, Delete Account)
 * - Standalone: Log Out is rendered below the sections (routine, reversible)
 */
export const PROFILE_MENU_SECTIONS: ProfileMenuSectionConfig[] = [
  {
    id: 'section-account',
    sectionTitle: 'Account & Preferences',
    items: [
      {
        id: 'addresses',
        icon: 'MapPin',
        label: 'Saved addresses',
        subtitle: 'Manage home, office and service locations',
        route: '/profile/addresses',
      },
      {
        id: 'payment-methods',
        icon: 'CreditCard',
        label: 'Payment methods',
        subtitle: 'JazzCash, EasyPaisa, Cash & Saved Cards',
        route: '/profile/payment-methods',
      },
      {
        id: 'booking-history',
        icon: 'Clock',
        label: 'Booking history',
        subtitle: 'Past services, job details and receipts',
        route: '/profile/booking-history',
      },
      {
        id: 'my-reviews',
        icon: 'Star',
        label: 'My reviews',
        subtitle: 'View, edit and track service ratings',
        route: '/profile/reviews',
      },
      {
        id: 'settings',
        icon: 'Settings',
        label: 'App Settings',
        subtitle: 'Language, currency & notification preferences',
        route: '/profile/settings',
      },
    ],
  },
  {
    id: 'section-support',
    sectionTitle: 'Support & Legal',
    items: [
      {
        id: 'support-center',
        icon: 'Headphones',
        label: 'Help & support',
        subtitle: '24/7 Live chat, FAQ & customer helpline',
        route: '/profile/support',
      },
      {
        id: 'rate-app',
        icon: 'Star',
        label: 'Rate Tasklync app',
        subtitle: 'Share feedback on the App Store / Play Store',
        action: 'rate_app',
      },
      {
        id: 'terms-privacy',
        icon: 'FileText',
        label: 'Privacy policy & terms of service',
        subtitle: 'Rules for using Tasklync',
        action: 'open_link',
        externalUrl: 'https://tasklync.pk/privacy',
      },
    ],
  },
  {
    id: 'section-privacy',
    sectionTitle: 'Privacy & Safety',
    items: [
      {
        id: 'blocked-workers',
        icon: 'UserX',
        label: 'Blocked workers',
        subtitle: 'Manage hidden workers and blocked list',
        route: '/profile/blocked-workers',
      },
    ],
  },
];
