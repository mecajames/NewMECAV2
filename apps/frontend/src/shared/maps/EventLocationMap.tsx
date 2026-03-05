import { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleMap, MarkerF, InfoWindowF, StreetViewPanorama } from '@react-google-maps/api';
import { Navigation, Eye, EyeOff, MapPin } from 'lucide-react';
import { useGoogleMaps } from './GoogleMapsProvider';

interface EventLocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  venueName: string;
  venueAddress: string;
  venueCity?: string | null;
  venueState?: string | null;
}

const containerStyle = { width: '100%', height: '100%' };

// Pin display size for Google Maps
const PIN_W = 48;
const PIN_H = 62;

/** Build SVG pin: white teardrop, red border, MECA logo inside */
function buildPinSvg(logoBase64: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="62" viewBox="0 0 48 62">
    <path d="M24 58 C24 58 4 34 4 22 A20 20 0 1 1 44 22 C44 34 24 58 24 58Z"
          fill="white" stroke="red" stroke-width="3"/>
    <image href="${logoBase64}" x="7" y="5" width="34" height="34"/>
  </svg>`;
}

function buildFallbackPinSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="62" viewBox="0 0 48 62">
    <path d="M24 58 C24 58 4 34 4 22 A20 20 0 1 1 44 22 C44 34 24 58 24 58Z"
          fill="white" stroke="red" stroke-width="3"/>
    <text x="24" y="28" text-anchor="middle" font-size="20" font-weight="bold" fill="red">M</text>
  </svg>`;
}

/** Load the logo image and convert to base64 for embedding in SVG */
function loadLogoBase64(): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = '/meca-logo-transparent.png';
  });
}

export default function EventLocationMap({
  latitude,
  longitude,
  venueName,
  venueAddress,
  venueCity,
  venueState,
}: EventLocationMapProps) {
  const { isLoaded, loadError } = useGoogleMaps();
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);
  const [pinSvgUrl, setPinSvgUrl] = useState<string | null>(null);

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';

  // Pre-load the MECA logo as base64, then build the SVG pin
  useEffect(() => {
    if (!isLoaded || !hasCoords) return;
    loadLogoBase64().then((base64) => {
      const svg = base64 ? buildPinSvg(base64) : buildFallbackPinSvg();
      setPinSvgUrl('data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg));
    });
  }, [isLoaded, hasCoords]);

  const center = useMemo(
    () => (hasCoords ? { lat: latitude!, lng: longitude! } : { lat: 39.8283, lng: -98.5795 }),
    [hasCoords, latitude, longitude]
  );

  const markerIcon = useMemo(() => {
    if (!isLoaded || !hasCoords || !pinSvgUrl) return undefined;
    return {
      url: pinSvgUrl,
      scaledSize: new google.maps.Size(PIN_W, PIN_H),
      anchor: new google.maps.Point(PIN_W / 2, PIN_H),
    };
  }, [isLoaded, hasCoords, pinSvgUrl]);

  const mapOptions = useMemo<google.maps.MapOptions>(
    () => ({
      // Hide all default POI markers — we'll control nearby places ourselves later
      styles: [
        { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      ],
      disableDefaultUI: false,
      clickableIcons: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'cooperative',
    }),
    []
  );

  const onMarkerClick = useCallback(() => setShowInfoWindow(true), []);
  const onInfoWindowClose = useCallback(() => setShowInfoWindow(false), []);

  const fullAddress = [venueAddress, venueCity, venueState].filter(Boolean).join(', ');

  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;

  // Fallback: no coords or load error → iframe embed
  if (!hasCoords || loadError) {
    return (
      <IframeMapFallback
        latitude={latitude}
        longitude={longitude}
        venueAddress={venueAddress}
      />
    );
  }

  // Loading state
  if (!isLoaded) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden bg-slate-700 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent" />
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-slate-700 relative">
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={15} options={mapOptions}>
        {/* Custom MECA marker */}
        <MarkerF position={center} icon={markerIcon} onClick={onMarkerClick} />

        {/* Info window */}
        {showInfoWindow && (
          <InfoWindowF position={center} onCloseClick={onInfoWindowClose}>
            <div style={{ position: 'relative', paddingRight: '24px' }}>
              <style>{`.gm-style-iw button[aria-label="Close"] { display: none !important; }`}</style>
              <button
                onClick={onInfoWindowClose}
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: '#666',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ✕
              </button>
              <img src="/meca-logo-transparent.png" alt="MECA" style={{ height: '32px', marginBottom: '4px' }} />
              <p style={{ fontWeight: 600, fontSize: '14px', margin: 0, color: '#111' }}>{venueName}</p>
              <p style={{ fontSize: '12px', margin: '2px 0 0', color: '#555' }}>{fullAddress}</p>
            </div>
          </InfoWindowF>
        )}

        {/* Street View */}
        {showStreetView && (
          <StreetViewPanorama
            options={{
              position: center,
              pov: { heading: 0, pitch: 0 },
              visible: true,
              enableCloseButton: false,
            }}
          />
        )}
      </GoogleMap>

      {/* Address overlay — top left */}
      <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg max-w-xs">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{venueName}</p>
            <p className="text-gray-300 text-xs mt-0.5">{fullAddress}</p>
          </div>
        </div>
      </div>

      {/* Overlay Buttons — bottom left */}
      <div className="absolute bottom-3 left-3 flex gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg shadow-lg transition-colors"
        >
          <Navigation className="h-4 w-4" />
          Get Directions
        </a>
        <button
          onClick={() => setShowStreetView((prev) => !prev)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-lg shadow-lg transition-colors border border-slate-500"
        >
          {showStreetView ? (
            <>
              <EyeOff className="h-4 w-4" />
              Map View
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Street View
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/** Fallback iframe for events without coordinates or when API fails to load */
function IframeMapFallback({
  latitude,
  longitude,
  venueAddress,
}: {
  latitude?: number | null;
  longitude?: number | null;
  venueAddress: string;
}) {
  const query =
    typeof latitude === 'number' && typeof longitude === 'number'
      ? `${latitude},${longitude}`
      : encodeURIComponent(venueAddress);

  return (
    <div className="aspect-video rounded-lg overflow-hidden bg-slate-700">
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 0 }}
        src={`https://www.google.com/maps?q=${query}&output=embed`}
        allowFullScreen
      />
    </div>
  );
}
