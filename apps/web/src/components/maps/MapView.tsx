'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { PlaceDTO } from '@tripgenie/types';
import { MapFallback } from './MapFallback';

interface MapViewProps {
  places: PlaceDTO[];
  selectedPlaceId?: string | null;
  onSelectPlace?: (place: PlaceDTO) => void;
  className?: string;
}

export function MapView({ places, selectedPlaceId, onSelectPlace, className = '' }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!apiKey) return;

    if (typeof window !== 'undefined' && (window as any).google?.maps) {
      setMapLoaded(true);
      return;
    }

    const scriptId = 'google-maps-js-sdk';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      if ((window as any).google?.maps) {
        setMapLoaded(true);
      } else {
        const handleLoad = () => setMapLoaded(true);
        const handleError = () => setMapError(true);
        existingScript.addEventListener('load', handleLoad);
        existingScript.addEventListener('error', handleError);
        return () => {
          existingScript.removeEventListener('load', handleLoad);
          existingScript.removeEventListener('error', handleError);
        };
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || typeof window === 'undefined' || !(window as any).google?.maps) {
      return;
    }

    const validPlaces = places.filter((p) => p.latitude !== null && p.longitude !== null);
    const centerLat = validPlaces.length > 0 ? validPlaces[0].latitude! : 15.5553;
    const centerLng = validPlaces.length > 0 ? validPlaces[0].longitude! : 73.7517;

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: 12,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
        { featureType: 'water', stylers: [{ color: '#090d16' }] },
      ],
    });

    const bounds = new (window as any).google.maps.LatLngBounds();
    const activeMarkers: any[] = [];

    validPlaces.forEach((place) => {
      const position = { lat: place.latitude!, lng: place.longitude! };
      bounds.extend(position);

      const marker = new (window as any).google.maps.Marker({
        position,
        map,
        title: place.name,
      });

      marker.addListener('click', () => {
        onSelectPlace?.(place);
      });

      activeMarkers.push(marker);
    });

    if (validPlaces.length > 1) {
      map.fitBounds(bounds);
    }

    return () => {
      activeMarkers.forEach((m) => m.setMap(null));
    };
  }, [mapLoaded, places, onSelectPlace]);

  if (!apiKey || mapError) {
    return (
      <div className={className}>
        <MapFallback
          places={places}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={onSelectPlace}
          reason={mapError ? 'Google Maps SDK failed to load.' : 'Google Maps JS API key unconfigured.'}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full min-h-[350px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl ${className}`}>
      <div ref={mapRef} className="w-full h-full min-h-[350px]" />
    </div>
  );
}
