import React, { useEffect } from 'react';
import L from 'leaflet';
import { useMap } from 'react-leaflet';

/**
 * Automatically calls Leaflet's invalidateSize() when container resizes,
 * sidebar toggles, orientation changes, or layout transitions finish.
 */
export function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    // Attach ResizeObserver to the map's DOM container for responsive sidebar/flex transitions
    let resizeObserver = null;
    const container = map.getContainer();
    if (container && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    // Delayed invalidation for initial CSS animations & sidebar toggle
    const timer1 = setTimeout(() => map.invalidateSize(), 150);
    const timer2 = setTimeout(() => map.invalidateSize(), 400);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [map]);

  return null;
}

/**
 * Creates custom SVG map marker icons matching severity color codes
 */
export function createDamageIcon(severity = 'Medium') {
  let color = '#F97316'; // Medium: Orange
  let borderColor = '#EA580C';
  let pulseColor = 'rgba(249, 115, 22, 0.25)';

  if (severity === 'High') {
    color = '#DC2626'; // High: Red
    borderColor = '#B91C1C';
    pulseColor = 'rgba(220, 38, 38, 0.25)';
  } else if (severity === 'Low') {
    color = '#EAB308'; // Low: Yellow
    borderColor = '#CA8A04';
    pulseColor = 'rgba(234, 179, 8, 0.25)';
  }

  const svgHtml = `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        background: ${pulseColor};
        animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
      "></div>
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 9999px;
        background: ${color};
        border: 2px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-damage-pin',
    html: svgHtml,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

/**
 * Vehicle GPS live location pin with radar circle and optional directional bearing
 */
export function createVehicleIcon(heading = null, speed = 0) {
  const rotation = heading !== null ? heading : 0;
  const hasHeading = heading !== null && speed > 2;

  const svgHtml = `
    <div style="
      position: relative;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 36px;
        height: 36px;
        border-radius: 9999px;
        background: rgba(37, 99, 235, 0.25);
        animation: pulse 1.8s infinite;
      "></div>
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 9999px;
        background: #2563EB;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 8px rgba(37,99,235,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: rotate(${rotation}deg);
        transition: transform 0.3s ease;
      ">
        ${hasHeading ? `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2" fill="white" />
          </svg>
        ` : `
          <div style="width: 6px; height: 6px; background: white; border-radius: 9999px;"></div>
        `}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-vehicle-pin',
    html: svgHtml,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

/**
 * Format coordinates into human-readable degrees with directional suffix
 */
export function formatCoordinates(lat, lng, decimals = 5) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'Coordinates N/A';
  }
  const latNum = Number(lat);
  const lngNum = Number(lng);
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lngDir = lngNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(decimals)}° ${latDir}, ${Math.abs(lngNum).toFixed(decimals)}° ${lngDir}`;
}

/**
 * External mapping service direction links
 */
export function getDirectionsUrl(lat, lng, provider = 'google') {
  if (provider === 'osm') {
    return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;${lat}%2C${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Standardized status style helper
 */
export function getGPSStatusBadge(status) {
  switch (status) {
    case 'GPS Connected':
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500 animate-pulse',
        label: 'GPS Connected',
      };
    case 'GPS Signal Unreliable':
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
        label: 'GPS Signal Unreliable',
      };
    case 'GPS Reconnecting':
      return {
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500 animate-ping',
        label: 'GPS Reconnecting',
      };
    case 'GPS Permission Denied':
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500',
        label: 'GPS Permission Denied',
      };
    case 'GPS Unavailable':
    default:
      return {
        bg: 'bg-slate-100 text-slate-600 border-slate-200',
        dot: 'bg-slate-400',
        label: 'GPS Unavailable',
      };
  }
}

