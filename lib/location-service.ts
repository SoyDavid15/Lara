/**
 * location-service.ts
 *
 * Utilidades de ubicación compartidas entre varios módulos.
 *
 * NOTA: La lógica de rastreo activo (watchPositionAsync, intervalos de
 * inactividad, etc.) fue migrada a SafeWalkContext.tsx para que persista
 * mientras el usuario navega entre pantallas.
 *
 * Este archivo conserva las funciones utilitarias puras que otros
 * componentes necesitan importar (por ejemplo, newAlert.tsx).
 */

/**
 * getDistanceFromLatLonInMeters
 *
 * Calcula la distancia en metros entre dos coordenadas GPS usando
 * la fórmula de Haversine (adaptada a la curvatura de la Tierra).
 *
 * Usada en newAlert.tsx para determinar si una alerta nueva está a
 * menos de 500 metros de una alerta existente (lógica de fusión).
 *
 * @param lat1 Latitud del punto A
 * @param lon1 Longitud del punto A
 * @param lat2 Latitud del punto B
 * @param lon2 Longitud del punto B
 * @returns Distancia en metros
 */
export function getDistanceFromLatLonInMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000; // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}