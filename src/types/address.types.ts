/**
 * Address & Map Data Types (Day 36 Specification)
 */

export type AddressLabelType = 'Home' | 'Office' | 'Other';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/** How the saved point was established (user-service `location_source`). */
export type LocationSource = 'gps_confirmed' | 'pin_adjusted' | 'search' | 'manual';

/** Structured parts + directions + provenance shared by Address and the create/update DTO. */
export interface AddressDetailFields {
  /** House / plot / flat / shop number */
  house_unit?: string | undefined;
  /** Street / lane */
  street?: string | undefined;
  /** Block / phase / sector */
  block_phase?: string | undefined;
  /** Society / colony / town */
  area?: string | undefined;
  landmark?: string | undefined;
  /** Directions for the professional (gate, floor, bell…). */
  instructions?: string | undefined;
  /** Geocoder text at confirm time (audit trail; not shown as the address). */
  geocoded_address?: string | undefined;
  place_id?: string | undefined;
  location_source?: LocationSource | undefined;
  gps_accuracy_m?: number | undefined;
  pin_shift_m?: number | undefined;
}

export interface Address extends AddressDetailFields {
  id: string;
  label: string; // 'Home' | 'Office' | 'Other' or custom label
  custom_label?: string | undefined;
  address_line: string;
  city?: string | undefined;
  country?: string | undefined;
  lat: number;
  lng: number;
  /** @deprecated alias of `instructions`, kept for older call sites */
  notes?: string | undefined;
  is_default: boolean;
  created_at?: string | undefined;
  updated_at?: string | undefined;
}

export interface CreateAddressDTO extends AddressDetailFields {
  label: string;
  custom_label?: string | undefined;
  address_line: string;
  city?: string | undefined;
  country?: string | undefined;
  lat: number;
  lng: number;
  /** @deprecated alias of `instructions` */
  notes?: string | undefined;
  is_default?: boolean | undefined;
}

export type UpdateAddressDTO = Partial<CreateAddressDTO>;

export interface PlacePrediction {
  place_id: string;
  description: string;
  primary_text: string;
  secondary_text: string;
  /** 'google' results need "Powered by Google" attribution when not shown on a Google map. */
  source?: 'google' | 'native' | undefined;
  /** Offline / native geocoder match: an area, not a confirmed place. */
  approximate?: boolean | undefined;
}

export interface PlaceDetails {
  place_id: string;
  description: string;
  formatted_address: string;
  lat: number;
  lng: number;
  city?: string | undefined;
  country?: string | undefined;
  area?: string | undefined;
  source?: 'google' | 'native' | undefined;
  /** True when the coordinates are only an area-level match — the pin must be adjusted. */
  approximate?: boolean | undefined;
}

export interface ReverseGeocodeResult {
  formatted_address: string;
  address_line: string;
  city?: string | undefined;
  country?: string | undefined;
  /** The ACTUAL coordinates that were resolved (never altered by the display text). */
  lat: number;
  lng: number;
  /** Which provider produced the text. 'coordinates' means nothing readable could be resolved. */
  source?: 'google' | 'osm' | 'native' | 'coordinates' | 'search' | undefined;
  /** How specific the text is (place / building / house / street / locality / city). */
  tier?: 'place' | 'building' | 'house' | 'street' | 'locality' | 'city' | undefined;
  /** Neighbourhood / society / colony, when the provider supplied it. */
  area?: string | undefined;
  /** Google place id when the point came from a Places selection. */
  place_id?: string | undefined;
  /** True when the point is only an area-level match (e.g. offline geocoder) — the user must adjust the pin. */
  approximate?: boolean | undefined;
}
