/**
 * User & Profile Service Specification Interfaces (Day 35)
 */
import type { AddressDetailFields } from './address.types';

export interface UserPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  preferred_language: 'en' | 'ur' | 'ar';
  preferred_currency: 'PKR' | 'USD';
}

export interface UserAddress extends AddressDetailFields {
  id: string;
  label: string;
  address_line: string;
  city?: string | undefined;
  country?: string | undefined;
  lat: number;
  lng: number;
  is_default: boolean;
}

export interface UserProfileStats {
  bookings_count: number;
  rating?: number | undefined;
  completed_jobs?: number | undefined;
  loyalty_points?: number | undefined;
}

/**
 * Full Canonical User Profile shape (GET /users/me)
 */
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string | undefined;
  avatar_url?: string | null | undefined;
  preferred_language?: 'en' | 'ur' | 'ar' | undefined;
  preferred_currency?: 'PKR' | 'USD' | undefined;
  stats?: UserProfileStats | undefined;
  created_at?: string | undefined;
  is_verified?: boolean | undefined;
}

/**
 * Isolated Editable Form State for dirty-checking
 */
export interface EditProfileFormState {
  name: string;
  email?: string | undefined;
}

export interface UpdateUserPayload {
  name?: string | undefined;
  email?: string | undefined;
  preferred_language?: 'en' | 'ur' | 'ar' | undefined;
  preferred_currency?: 'PKR' | 'USD' | undefined;
}

export interface UpdatePreferencesPayload {
  push_enabled?: boolean | undefined;
  email_enabled?: boolean | undefined;
  preferred_language?: 'en' | 'ur' | 'ar' | undefined;
  preferred_currency?: 'PKR' | 'USD' | undefined;
}

/** POST /users/me/addresses body. Detail fields require user-service migration 004 (ignored before). */
export interface CreateAddressPayload extends AddressDetailFields {
  label: string;
  address_line: string;
  city?: string | undefined;
  country?: string | undefined;
  lat: number;
  lng: number;
  is_default?: boolean | undefined;
}

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

/**
 * Data-Driven Profile Menu Configuration Models
 */
export type ProfileMenuActionType =
  | 'logout'
  | 'delete_account'
  | 'rate_app'
  | 'contact_support'
  | 'open_link';

export interface ProfileMenuItemConfig {
  id: string;
  icon: string;
  label: string;
  subtitle?: string | undefined;
  route?: string | undefined;
  action?: ProfileMenuActionType | undefined;
  tone?: 'default' | 'danger' | undefined;
  badge?: string | undefined;
  externalUrl?: string | undefined;
}

export interface ProfileMenuSectionConfig {
  id: string;
  sectionTitle: string;
  items: ProfileMenuItemConfig[];
}
