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
 * Vehicle GPS live location pin with radar circle
 */
export function createVehicleIcon() {
  const svgHtml = `
    <div style="
      position: relative;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        background: rgba(37, 99, 235, 0.3);
        animation: pulse 1.5s infinite;
      "></div>
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 9999px;
        background: #2563EB;
        border: 3px solid #ffffff;
        box-shadow: 0 2px 6px rgba(37,99,235,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="width: 4px; height: 4px; background: white; border-radius: 9999px;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-vehicle-pin',
    html: svgHtml,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
}
