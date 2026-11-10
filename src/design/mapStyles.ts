/**
 * Google Maps night style (Android / PROVIDER_GOOGLE). On iOS the Apple map follows `userInterfaceStyle`.
 * Tuned to the app's dark surfaces: roads and labels stay legible, water and parks are muted, POI noise is off.
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1b1f24' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a93a0' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#121417' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2b3036' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#16231b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b3036' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9aa3af' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#333a41' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a424a' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a24' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#5b6b7a' }] },
];

/** Light theme: the platform default look with POI/transit clutter removed. */
export const LIGHT_MAP_STYLE = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];
