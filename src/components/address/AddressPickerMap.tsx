/**
 * Type-resolution entry for the address picker map. Metro picks the platform file at build time
 * (`AddressPickerMap.native.tsx` / `AddressPickerMap.web.tsx`); this file used to be a byte-identical
 * copy of the native implementation that had to be kept in sync by hand (audit LOC-032).
 */
export * from './AddressPickerMap.native';
