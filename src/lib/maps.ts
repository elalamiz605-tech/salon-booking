/** Google Maps links that need no API key. */
export type LatLng = { lat: number; lng: number };

export const mapEmbedUrl = ({ lat, lng }: LatLng) => `https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
export const directionsUrl = ({ lat, lng }: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
