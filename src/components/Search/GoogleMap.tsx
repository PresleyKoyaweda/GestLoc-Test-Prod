import React, { useEffect, useRef } from 'react';
import { Property } from '../../types';

// Load Google Maps script dynamically
const loadGoogleMapsScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      // Wait for it to load
      const checkLoaded = () => {
        if (window.google && window.google.maps) {
          resolve();
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
      reject(new Error('Google Maps API key not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
};

interface GoogleMapProps {
  properties: Property[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
  properties, 
  center = { lat: 45.5017, lng: -73.5673 }, // Montreal default
  zoom = 12,
  height = '400px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Geocoding service to convert addresses to coordinates
  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng()
          });
        } else {
          console.warn('Geocoding failed for address:', address);
          resolve(null);
        }
      });
    });
  };

  // Initialize map
  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        await loadGoogleMapsScript();
        setIsLoaded(true);

        // Create map
        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        console.log('🗺️ Google Map initialized');
      } catch (error) {
        console.warn('Google Maps not available in demo mode');
      }
    };

    initializeMap();
  }, [center.lat, center.lng, zoom]);

  // Add markers for properties
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for each property
    const addMarkers = async () => {
      for (const property of properties) {
      const fullAddress = `${property.address.street}, ${property.address.city}, ${property.address.province}, Canada`;
      const coordinates = await geocodeAddress(fullAddress);
      
      if (coordinates && mapInstanceRef.current) {
        const marker = new google.maps.Marker({
          position: coordinates,
          map: mapInstanceRef.current,
          title: property.name,
          icon: {
            url: property.type === 'entire' ? 
              'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="white" stroke-width="2"/>
                  <text x="16" y="20" text-anchor="middle" fill="white" font-size="16">🏠</text>
                </svg>
              `) :
              'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#10B981" stroke="white" stroke-width="2"/>
                  <text x="16" y="20" text-anchor="middle" fill="white" font-size="16">🛏️</text>
                </svg>
              `),
            scaledSize: new google.maps.Size(32, 32)
          }
        });

        // Info window
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 250px;">
              <h3 style="margin: 0 0 8px 0; color: #1F2937; font-size: 16px; font-weight: 600;">
                ${property.name}
              </h3>
              <p style="margin: 0 0 8px 0; color: #6B7280; font-size: 14px;">
                ${property.address.street}<br>
                ${property.address.city}, ${property.address.province}
              </p>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="color: #6B7280; font-size: 12px;">
                  ${property.type === 'entire' ? 'Logement entier' : 'Colocation'}
                </span>
                <span style="color: #059669; font-weight: 600; font-size: 14px;">
                  ${property.rent ? `${property.rent}$/mois` : 'À partir de 500$/mois'}
                </span>
              </div>
              <div style="display: flex; gap: 4px; margin-bottom: 8px;">
                <span style="background: #EFF6FF; color: #1D4ED8; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                  ${property.totalArea} m²
                </span>
                <span style="background: ${property.status === 'libre' ? '#ECFDF5' : '#FEF3C7'}; 
                             color: ${property.status === 'libre' ? '#065F46' : '#92400E'}; 
                             padding: 2px 6px; border-radius: 4px; font-size: 11px;">
                  ${property.status === 'libre' ? 'Disponible' : 
                    property.status === 'en_attente_validation' ? 'En attente' : 'Occupé'}
                </span>
              </div>
              ${property.description ? `
                <p style="margin: 0; color: #6B7280; font-size: 12px; line-height: 1.4;">
                  ${property.description.substring(0, 100)}${property.description.length > 100 ? '...' : ''}
                </p>
              ` : ''}
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.push(marker);
      }
      }
    };

    if (properties.length > 0) {
      addMarkers();
    }
  }, [properties, isLoaded]);

  if (!isLoaded) {
    return (
      <div 
        style={{ 
          width: '100%', 
          height,
          borderRadius: '12px',
          overflow: 'hidden'
        }}
        className="border border-gray-200 flex items-center justify-center bg-gray-50"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Chargement de la carte...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height,
        borderRadius: '12px',
        overflow: 'hidden'
      }}
      className="border border-gray-200"
    />
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

export default GoogleMap;