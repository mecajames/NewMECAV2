/** Dark map style matching the site's slate-800/900 theme */
export const darkMapStyle: google.maps.MapTypeStyle[] = [
  // Overall geometry
  { elementType: 'geometry', stylers: [{ color: '#1e293b' }] }, // slate-800
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] }, // slate-900
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] }, // slate-400

  // Administrative
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] }, // slate-300
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#475569' }] }, // slate-600

  // Points of interest
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#334155' }] }, // slate-700
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] }, // slate-500
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1a3a2a' }] }, // muted green
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b8f71' }] },

  // Roads
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] }, // slate-700
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#475569' }] }, // slate-600
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },

  // Transit
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },

  // Water
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c1a2e' }] }, // dark navy
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
];
