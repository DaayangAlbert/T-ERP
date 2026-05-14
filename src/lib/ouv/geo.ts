/**
 * Géofence ouvrier : calcul de distance entre la position GPS de l'ouvrier et
 * le centre du chantier (Site.lat / Site.lng). Formule haversine standard,
 * précision suffisante pour des chantiers < 100 km de diamètre.
 *
 * Le rayon par défaut est de 100m (cf prompt 1.2). Au-delà, l'API marque
 * `outOfGeofence: true` sur le TimeReport — l'UI alerte côté ouvrier et
 * remonte au CC ; ce n'est PAS un blocage dur (les chantiers BTP ont parfois
 * des bases vie à 200-300m du point GPS officiel).
 */
export const DEFAULT_GEOFENCE_RADIUS_M = 100;
export const ALERT_GEOFENCE_RADIUS_M = 500; // au-delà, alerte CC obligatoire

const EARTH_RADIUS_M = 6_371_000;

/**
 * Distance haversine en mètres entre deux points (lat, lng) en degrés décimaux.
 */
export function haversineDistanceM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a =
    sinDLat * sinDLat +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}
