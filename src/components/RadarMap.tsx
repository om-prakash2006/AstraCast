import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CityWeatherData, NowcastStep, RadarTileResponse } from '../types/weather';

interface RadarMapProps {
  weatherData: CityWeatherData;
  activeStep: NowcastStep;
  radarTiles: RadarTileResponse | null;
  activeTab?: string;
  isCleanLight?: boolean;
}

// Explicit zoom level constraints
// CARTO Positron & Dark Matter support 0 to 20, natively rendered up to zoom 19
export const CARTO_MIN_ZOOM = 0;
export const CARTO_MAX_ZOOM = 20;
export const CARTO_MAX_NATIVE_ZOOM = 19;

// Doppler Weather Radar operational viewport constraints
export const MAP_MIN_ZOOM = 5;
export const MAP_MAX_ZOOM = 14;

// RainViewer radar overlay constraints (free API native max zoom is 7; overzooms to 18)
export const RADAR_TILES_MIN_ZOOM = 0;
export const RADAR_TILES_MAX_ZOOM = 18;
export const RADAR_TILES_MAX_NATIVE_ZOOM = 7;

export const RadarMap: React.FC<RadarMapProps> = ({
  weatherData,
  activeStep,
  radarTiles,
  activeTab = 'OVERVIEW',
  isCleanLight = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer refs
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const radarTileLayerRef = useRef<L.TileLayer | null>(null);
  const ringsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cellsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const lightningLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const weatherObsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const satelliteLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const riskLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const movementLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const sweepLineRef = useRef<L.Polyline | null>(null);

  // Independent Phase 9 Layer Toggle states
  const [showWeatherObs, setShowWeatherObs] = useState(true);
  const [showSatelliteLayer, setShowSatelliteLayer] = useState(true);
  const [showRadarTiles, setShowRadarTiles] = useState(true);
  const [showLightning, setShowLightning] = useState(true);
  const [showThunderstormRisk, setShowThunderstormRisk] = useState(true);
  const [showStormMovement, setShowStormMovement] = useState(true);
  const [showRings, setShowRings] = useState(true);
  const [showCells, setShowCells] = useState(true);
  const [basemapMode, setBasemapMode] = useState<'positron' | 'darkmatter'>(
    isCleanLight ? 'positron' : 'darkmatter'
  );

  // Sync basemap mode with theme toggle
  useEffect(() => {
    setBasemapMode(isCleanLight ? 'positron' : 'darkmatter');
  }, [isCleanLight]);
  const [cartoKey, setCartoKey] = useState<string>(
    ((import.meta.env.VITE_CARTO_API_KEY as string | undefined) || '').trim()
  );

  // Overlay collapse states for flexible zooming
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [isScaleCollapsed, setIsScaleCollapsed] = useState<boolean>(false);
  const [isFeedCollapsed, setIsFeedCollapsed] = useState<boolean>(false);

  // Slide & Fullscreen states for unobstructed map viewing and zooming
  const [isLeftSlid, setIsLeftSlid] = useState<boolean>(false);
  const [isRightSlid, setIsRightSlid] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Synchronize Leaflet map viewport and dimensions whenever fullscreen is toggled
  useEffect(() => {
    const invalidate = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    invalidate();
    const t1 = setTimeout(invalidate, 50);
    const t2 = setTimeout(invalidate, 150);
    const t3 = setTimeout(invalidate, 300);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Mouse coordinate tracker
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number }>({
    lat: weatherData.station.lat + 0.1455,
    lng: weatherData.station.lng + 0.3078,
  });
  const [cursorDbz, setCursorDbz] = useState<number>(58.2);
  const [currentZoom, setCurrentZoom] = useState<number>(8);

  const { station, current, severity, lightningStrikes, stormCells } = weatherData;

  const getCartoTileUrl = (mode: 'positron' | 'darkmatter', key: string) => {
    const cleanKey = key.trim();
    const style = mode === 'darkmatter' ? 'dark_all' : 'light_all';
    if (cleanKey && cleanKey !== 'MY_CARTO_API_KEY') {
      // CARTO Basemaps API strictly requires `key=YOUR_KEY`
      // Providing both `key` and `api_key` guarantees full compatibility across CDNs
      return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cleanKey)}&api_key=${encodeURIComponent(cleanKey)}`;
    }
    return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;
  };

  // Sync CARTO key from server runtime if Vite client bundle did not inline it
  useEffect(() => {
    if (!cartoKey || cartoKey === 'MY_CARTO_API_KEY') {
      fetch('/api/config/carto')
        .then((res) => res.json())
        .then((data) => {
          if (data?.cartoApiKey && data.cartoApiKey !== 'MY_CARTO_API_KEY') {
            setCartoKey(data.cartoApiKey.trim());
          }
        })
        .catch(() => {});
    }
  }, [cartoKey]);

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([station.lat, station.lng], 8);
      setCurrentZoom(8);
      mapInstanceRef.current.invalidateSize();
    }
  };

  // Update basemap tile URL when basemapMode or cartoKey changes
  useEffect(() => {
    if (baseTileLayerRef.current) {
      baseTileLayerRef.current.setUrl(getCartoTileUrl(basemapMode, cartoKey));
    }
  }, [basemapMode, cartoKey]);

  // Recalculate map container size whenever activeTab switches or returns to OVERVIEW
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (activeTab === 'OVERVIEW') {
      const invalidate = () => {
        mapInstanceRef.current?.invalidateSize();
      };
      invalidate();
      const t1 = setTimeout(invalidate, 50);
      const t2 = setTimeout(invalidate, 150);
      const t3 = setTimeout(invalidate, 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [activeTab]);

  // Keep Leaflet viewport properly sized on container layout adjustments & browser resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    const handleVisibilityOrResize = () => {
      if (document.visibilityState === 'visible' && mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleVisibilityOrResize);
    document.addEventListener('visibilitychange', handleVisibilityOrResize);

    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 100);
    const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 400);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleVisibilityOrResize);
      document.removeEventListener('visibilitychange', handleVisibilityOrResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [station.lat, station.lng],
        zoom: 8,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        zoomControl: false,
        attributionControl: false,
      });

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      // Enterprise basemap (CARTO Positron or Dark Matter monochrome)
      // Explicitly set minZoom: 0, maxZoom: 20, maxNativeZoom: 19 so requests never exceed
      // CARTO's native zoom levels, preventing 'zoom level not supported' tile errors.
      const baseLayer = L.tileLayer(getCartoTileUrl(basemapMode, cartoKey), {
        subdomains: 'abcd',
        minZoom: CARTO_MIN_ZOOM,
        maxZoom: CARTO_MAX_ZOOM,
        maxNativeZoom: CARTO_MAX_NATIVE_ZOOM,
        attribution: '&copy; CARTO &copy; OpenStreetMap contributors',
      }).addTo(map);

      baseLayer.on('tileerror', () => {
        // Fallback gracefully without throwing
      });

      baseTileLayerRef.current = baseLayer;

      // Layer groups
      ringsLayerGroupRef.current = L.layerGroup().addTo(map);
      satelliteLayerGroupRef.current = L.layerGroup().addTo(map);
      riskLayerGroupRef.current = L.layerGroup().addTo(map);
      cellsLayerGroupRef.current = L.layerGroup().addTo(map);
      movementLayerGroupRef.current = L.layerGroup().addTo(map);
      lightningLayerGroupRef.current = L.layerGroup().addTo(map);
      weatherObsLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorPos({
          lat: Math.round(e.latlng.lat * 10000) / 10000,
          lng: Math.round(e.latlng.lng * 10000) / 10000,
        });

        // Approximate point reflectivity based on distance from storm cells
        let maxLocalDbz = 16.0;
        stormCells.forEach((c) => {
          const dLat = (e.latlng.lat - c.lat) * 111;
          const dLng = (e.latlng.lng - c.lng) * 111 * Math.cos((c.lat * Math.PI) / 180);
          const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
          if (distKm < 30) {
            const calculated = c.dbz * Math.max(0.2, 1 - distKm / 30);
            if (calculated > maxLocalDbz) maxLocalDbz = calculated;
          }
        });
        setCursorDbz(Math.round(maxLocalDbz * 10) / 10);
      });

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map view when station changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([station.lat, station.lng], 8);
      setCurrentZoom(8);
      mapInstanceRef.current.invalidateSize();
    }
  }, [station.lat, station.lng]);

  // RainViewer Radar Tiles update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (radarTileLayerRef.current) {
      map.removeLayer(radarTileLayerRef.current);
      radarTileLayerRef.current = null;
    }

    if (showRadarTiles && radarTiles && radarTiles.host && radarTiles.latestPath) {
      // Use latest available frame
      const tileUrl = `${radarTiles.host}${radarTiles.latestPath}/256/{z}/{x}/{y}/2/1_1.png`;
      const radarLayer = L.tileLayer(tileUrl, {
        opacity: 0.75,
        zIndex: 5,
        minZoom: RADAR_TILES_MIN_ZOOM,
        maxZoom: RADAR_TILES_MAX_ZOOM,
        maxNativeZoom: RADAR_TILES_MAX_NATIVE_ZOOM, // RainViewer free API restricts raster tiles to zoom 7; overzoom to 18
      }).addTo(map);
      radarTileLayerRef.current = radarLayer;
    }
  }, [radarTiles, showRadarTiles]);

  // Redraw Radar Rings, Axes, and Station Marker
  useEffect(() => {
    const group = ringsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showRings) return;

    const center: [number, number] = [station.lat, station.lng];

    // Label and axis theming using the 9 green colors
    const lblBg = isCleanLight ? '#E5F5E0' : '#00441B';
    const lblColor = isCleanLight ? '#006D2C' : '#F7FCF5';
    const lblBorder = isCleanLight ? '#74C476' : '#41AB5D';
    const lblShadow = isCleanLight ? '0 2px 6px rgba(0,0,0,0.15)' : '0 2px 6px rgba(0,0,0,0.6)';
    const axisColor = isCleanLight ? '#41AB5D' : '#74C476';

    // Range rings (50, 100, 150, 200, 250 km)
    const ringRadiiKm = [50, 100, 150, 200, 250];
    ringRadiiKm.forEach((km, idx) => {
      const circle = L.circle(center, {
        radius: km * 1000,
        color: idx === 4 ? (isCleanLight ? '#238B45' : '#41AB5D') : (isCleanLight ? '#74C476' : '#A1D99B'),
        weight: idx === 4 ? 1.8 : 1.1,
        dashArray: idx % 2 === 0 ? '4, 4' : undefined,
        fill: false,
        opacity: idx === 4 ? 0.9 : 0.65,
      });
      group.addLayer(circle);

      // Label on East axis
      const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);
      const labelLng = station.lng + km / kmPerDegreeLng;
      const textIcon = L.divIcon({
        className: 'custom-radar-label',
        html: `<div style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: ${lblColor}; background: ${lblBg}; padding: 2px 6px; border: 1.5px solid ${lblBorder}; box-shadow: ${lblShadow}; white-space: nowrap;">${km}KM${
          idx === 4 ? ' (MAX)' : ''
        }</div>`,
        iconSize: [65, 16],
        iconAnchor: [0, 8],
      });
      group.addLayer(L.marker([station.lat, labelLng], { icon: textIcon, interactive: false }));
    });

    // Cardinal Axes
    const kmPerDegreeLat = 111.0;
    const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);
    const maxKm = 260;

    // North-South line
    const nsLine = L.polyline(
      [
        [station.lat - maxKm / kmPerDegreeLat, station.lng],
        [station.lat + maxKm / kmPerDegreeLat, station.lng],
      ],
      { color: axisColor, weight: 1.2, opacity: 0.55, interactive: false }
    );
    group.addLayer(nsLine);

    // East-West line
    const ewLine = L.polyline(
      [
        [station.lat, station.lng - maxKm / kmPerDegreeLng],
        [station.lat, station.lng + maxKm / kmPerDegreeLng],
      ],
      { color: axisColor, weight: 1.2, opacity: 0.55, interactive: false }
    );
    group.addLayer(ewLine);

    // Bearing labels
    const nIcon = L.divIcon({
      html: `<div style="font-family: 'JetBrains Mono'; font-size: 10px; font-weight: 800; color: ${lblColor}; background: ${lblBg}; padding: 2px 6px; border: 1.5px solid ${lblBorder}; box-shadow: ${lblShadow}; text-align: center;">000° N</div>`,
      iconSize: [50, 16],
      iconAnchor: [25, 16],
    });
    group.addLayer(
      L.marker([station.lat + (maxKm + 8) / kmPerDegreeLat, station.lng], {
        icon: nIcon,
        interactive: false,
      })
    );

    const sIcon = L.divIcon({
      html: `<div style="font-family: 'JetBrains Mono'; font-size: 10px; font-weight: 800; color: ${lblColor}; background: ${lblBg}; padding: 2px 6px; border: 1.5px solid ${lblBorder}; box-shadow: ${lblShadow}; text-align: center;">180° S</div>`,
      iconSize: [50, 16],
      iconAnchor: [25, 0],
    });
    group.addLayer(
      L.marker([station.lat - (maxKm + 8) / kmPerDegreeLat, station.lng], {
        icon: sIcon,
        interactive: false,
      })
    );

    const eIcon = L.divIcon({
      html: `<div style="font-family: 'JetBrains Mono'; font-size: 10px; font-weight: 800; color: ${lblColor}; background: ${lblBg}; padding: 2px 6px; border: 1.5px solid ${lblBorder}; box-shadow: ${lblShadow};">090° E</div>`,
      iconSize: [50, 16],
      iconAnchor: [0, 8],
    });
    group.addLayer(
      L.marker([station.lat, station.lng + (maxKm + 8) / kmPerDegreeLng], {
        icon: eIcon,
        interactive: false,
      })
    );

    const wIcon = L.divIcon({
      html: `<div style="font-family: 'JetBrains Mono'; font-size: 10px; font-weight: 800; color: ${lblColor}; background: ${lblBg}; padding: 2px 6px; border: 1.5px solid ${lblBorder}; box-shadow: ${lblShadow}; text-align: right;">270° W</div>`,
      iconSize: [50, 16],
      iconAnchor: [50, 8],
    });
    group.addLayer(
      L.marker([station.lat, station.lng - (maxKm + 8) / kmPerDegreeLng], {
        icon: wIcon,
        interactive: false,
      })
    );

    // Radar Center Station HQ Marker
    const hqIcon = L.divIcon({
      className: 'radar-hq-marker',
      html: `
        <div style="display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <div style="width: 10px; height: 10px; background: #238B45; border: 2px solid #F7FCF5; box-shadow: 0 0 10px rgba(65,171,93,1);"></div>
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 900; color: ${lblColor}; background: ${lblBg}; padding: 2px 6px; border: 1.5px solid ${lblBorder}; box-shadow: ${lblShadow};">${station.radarStationCode} (HQ)</span>
        </div>
      `,
      iconSize: [190, 22],
      iconAnchor: [5, 5],
    });
    group.addLayer(L.marker(center, { icon: hqIcon }));

    // Animated/Static sweep line
    const sweepEndLat = station.lat + (180 / kmPerDegreeLat);
    const sweepEndLng = station.lng + (180 / kmPerDegreeLng);
    const sweepLine = L.polyline([center, [sweepEndLat, sweepEndLng]], {
      color: '#41AB5D',
      weight: 2,
      opacity: 0.9,
      dashArray: '4, 2',
      interactive: false,
    });
    group.addLayer(sweepLine);
    sweepLineRef.current = sweepLine;
  }, [station, showRings]);

  // Redraw Storm Cells with Nowcast offset
  useEffect(() => {
    const group = cellsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showCells) return;

    const kmPerDegreeLat = 111.0;
    const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);

    // Offset based on active nowcast step
    const { dx, dy } = activeStep.stormCenterOffsetKm;
    const dLat = dy / kmPerDegreeLat;
    const dLng = dx / kmPerDegreeLng;

    stormCells.forEach((cell, idx) => {
      const projectedLat = cell.lat + dLat;
      const projectedLng = cell.lng + dLng;

      // Color mapping
      let fillColor = '#dc2626';
      let strokeColor = '#991b1b';
      let statusTag = '[RED]';

      if (cell.dbz >= 55) {
        fillColor = '#dc2626';
        strokeColor = '#991b1b';
        statusTag = '[RED]';
      } else if (cell.dbz >= 45) {
        fillColor = '#f97316';
        strokeColor = '#ea580c';
        statusTag = '[ALERT]';
      } else if (cell.dbz >= 35) {
        fillColor = '#eab308';
        strokeColor = '#ca8a04';
        statusTag = '[WATCH]';
      } else {
        fillColor = '#059669';
        strokeColor = '#047857';
        statusTag = '[NORMAL]';
      }

      // Outer convective polygon
      const radiusKm = idx === 0 ? 25 : idx === 1 ? 18 : 12;
      const points: [number, number][] = [];
      const numPts = 6;
      for (let i = 0; i < numPts; i++) {
        const angle = (i * 2 * Math.PI) / numPts + (idx * 0.4);
        const rJitter = radiusKm * (0.8 + Math.sin(i * 1.5) * 0.25);
        points.push([
          projectedLat + (rJitter * Math.cos(angle)) / kmPerDegreeLat,
          projectedLng + (rJitter * Math.sin(angle)) / kmPerDegreeLng,
        ]);
      }

      const poly = L.polygon(points, {
        color: strokeColor,
        weight: 1.5,
        fillColor,
        fillOpacity: 0.65,
      });
      group.addLayer(poly);

      // Core intense polygon if severe
      if (cell.dbz >= 45) {
        const corePoints = points.map(([pLat, pLng]) => [
          projectedLat + (pLat - projectedLat) * 0.5,
          projectedLng + (pLng - projectedLng) * 0.5,
        ] as [number, number]);
        const corePoly = L.polygon(corePoints, {
          color: '#7f1d1d',
          weight: 1,
          fillColor: '#dc2626',
          fillOpacity: 0.9,
        });
        group.addLayer(corePoly);
      }

      // Velocity track vector
      const headingRad = (cell.heading * Math.PI) / 180;
      const vectorLengthKm = cell.speedKmH * 0.6;
      const endLat = projectedLat + (vectorLengthKm * Math.cos(headingRad)) / kmPerDegreeLat;
      const endLng = projectedLng + (vectorLengthKm * Math.sin(headingRad)) / kmPerDegreeLng;

      const track = L.polyline([[projectedLat, projectedLng], [endLat, endLng]], {
        color: '#0f172a',
        weight: 2,
      });
      group.addLayer(track);

      // Label Box
      const cellLabelIcon = L.divIcon({
        className: 'storm-cell-flag',
        html: `
          <div style="background: #ffffff; border: 1.5px solid ${strokeColor}; padding: 2px 5px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: bold; color: #0f172a; white-space: nowrap;">
            ${cell.name}: ${cell.dbz.toFixed(0)}dBZ ${statusTag}
          </div>
        `,
        iconSize: [120, 18],
        iconAnchor: [10, 22],
      });
      group.addLayer(L.marker([projectedLat, projectedLng], { icon: cellLabelIcon }));
    });
  }, [stormCells, activeStep, showCells, station]);

  // Redraw Lightning Strikes
  useEffect(() => {
    const group = lightningLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showLightning) return;

    const kmPerDegreeLat = 111.0;
    const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);
    const { dx, dy } = activeStep.stormCenterOffsetKm;
    const dLat = dy / kmPerDegreeLat;
    const dLng = dx / kmPerDegreeLng;

    lightningStrikes.forEach((strike) => {
      const pLat = strike.lat + dLat;
      const pLng = strike.lng + dLng;

      const isSevereCG = strike.type === 'CG' && Math.abs(strike.currentKA) > 35;
      const color = isSevereCG ? '#dc2626' : '#ea580c';

      const strikeIcon = L.divIcon({
        className: 'lightning-strike-marker',
        html: `
          <div style="position: relative; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;">
            <svg width="14" height="14" viewBox="-7 -7 14 14">
              <path d="M-5,0 L5,0 M0,-5 L0,5 M-3.5,-3.5 L3.5,3.5 M-3.5,3.5 L3.5,-3.5" stroke="${color}" stroke-width="2" />
              <circle cx="0" cy="0" r="5" fill="none" stroke="${color}" stroke-width="0.8" stroke-dasharray="2,2" />
            </svg>
            <div style="position: absolute; left: 16px; top: -3px; font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: bold; color: ${color}; white-space: nowrap;">
              ${strike.currentKA > 0 ? '+' : ''}${strike.currentKA}kA ${strike.type}
            </div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      group.addLayer(L.marker([pLat, pLng], { icon: strikeIcon }));
    });

    // Also plot AI Estimated Lightning Risk Zone
    const riskLat = station.lat + 0.22 + dLat;
    const riskLng = station.lng + 0.35 + dLng;
    const aiRiskIcon = L.divIcon({
      className: 'ai-lightning-risk-marker',
      html: `
        <div style="display: flex; align-items: center; gap: 4px; background: rgba(14, 165, 233, 0.2); border: 1.5px dashed #0284c7; padding: 3px 6px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #0284c7; backdrop-filter: blur(4px); white-space: nowrap;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #0284c7;"></span>
          AI ESTIMATED LIGHTNING RISK: ${Math.round(current.cape > 1500 ? 85 : 45)}%
        </div>
      `,
      iconSize: [210, 22],
      iconAnchor: [105, 11],
    });
    group.addLayer(L.marker([riskLat, riskLng], { icon: aiRiskIcon }));
  }, [lightningStrikes, activeStep, showLightning, station, current.cape]);

  // Phase 9 Layer 1: Weather Observation Layer (Surface AWS Telemetry Pins)
  useEffect(() => {
    const group = weatherObsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showWeatherObs) return;

    const weatherPinIcon = L.divIcon({
      className: 'weather-obs-marker',
      html: `
        <div style="background: rgba(255,255,255,0.95); border: 2px solid #059669; border-radius: 8px; padding: 4px 6px; font-family: 'JetBrains Mono', monospace; font-size: 9px; font-weight: 800; color: #065f46; box-shadow: 0 4px 12px rgba(0,0,0,0.25); white-space: nowrap;">
          <div style="font-size: 10px; color: #047857; border-bottom: 1px solid #d1fae5; padding-bottom: 2px; margin-bottom: 2px;">
            [OBS] ${station.name.substring(0, 14)}
          </div>
          <div>TEMP: ${current.temperature}°C | RH: ${current.relativeHumidity}%</div>
          <div>RAIN: ${current.rainRate} mm/h | P: ${Math.round(current.surfacePressure)} hPa</div>
        </div>
      `,
      iconSize: [160, 48],
      iconAnchor: [80, 52],
    });

    group.addLayer(L.marker([station.lat, station.lng], { icon: weatherPinIcon }));
  }, [station, current, showWeatherObs]);

  // Phase 9 Layer 2: Satellite Observation Layer (Thermal IR Cloud Boundaries)
  useEffect(() => {
    const group = satelliteLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showSatelliteLayer) return;

    // Draw thermal IR cloud boundary polygon
    const satCloudPoints: [number, number][] = [
      [station.lat + 0.9, station.lng - 0.7],
      [station.lat + 1.2, station.lng + 0.8],
      [station.lat + 0.3, station.lng + 1.4],
      [station.lat - 0.6, station.lng + 0.9],
      [station.lat - 0.7, station.lng - 0.5],
      [station.lat + 0.2, station.lng - 1.1],
    ];

    const satCloudPoly = L.polygon(satCloudPoints, {
      color: '#0284c7',
      weight: 1.5,
      dashArray: '6, 4',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
    });

    group.addLayer(satCloudPoly);

    const satLabel = L.divIcon({
      className: 'satellite-cloud-label',
      html: `
        <div style="background: rgba(14, 165, 233, 0.9); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 800; white-space: nowrap;">
          INSAT-3DR TIR1 CLOUD TOP (&lt;215K)
        </div>
      `,
      iconSize: [150, 16],
      iconAnchor: [75, 8],
    });
    group.addLayer(L.marker([station.lat + 1.15, station.lng + 0.7], { icon: satLabel }));
  }, [station, showSatelliteLayer]);

  // Phase 9 Layer 5: Thunderstorm Risk Layer (Convective Risk Contours)
  useEffect(() => {
    const group = riskLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showThunderstormRisk) return;

    const riskPoints: [number, number][] = [
      [station.lat + 0.5, station.lng + 0.1],
      [station.lat + 0.6, station.lng + 0.7],
      [station.lat + 0.1, station.lng + 0.8],
      [station.lat - 0.3, station.lng + 0.4],
      [station.lat - 0.1, station.lng - 0.1],
    ];

    const riskColor = severity.stageColor === 'red' ? '#ef4444' : severity.stageColor === 'orange' ? '#f97316' : '#eab308';

    const riskPolygon = L.polygon(riskPoints, {
      color: riskColor,
      weight: 2,
      dashArray: '8, 4',
      fillColor: riskColor,
      fillOpacity: 0.2,
    });
    group.addLayer(riskPolygon);

    const riskLabelIcon = L.divIcon({
      className: 'thunderstorm-risk-label',
      html: `
        <div style="background: ${riskColor}; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 900; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          ⚡ THUNDERSTORM RISK: ${severity.alertTitle.substring(0, 22)}
        </div>
      `,
      iconSize: [180, 18],
      iconAnchor: [90, 9],
    });
    group.addLayer(L.marker([station.lat + 0.55, station.lng + 0.4], { icon: riskLabelIcon }));
  }, [station, severity, showThunderstormRisk]);

  // Phase 9 Layer 6: Predicted Storm Movement (Timeline vector projection +15m, +30m, +45m, +60m)
  useEffect(() => {
    const group = movementLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showStormMovement) return;

    const steerHeading = (current.windDirection + 15) % 360;
    const steerSpeed = Math.round(Math.max(20, current.windSpeed * 1.3));
    const rad = ((steerHeading - 90) * Math.PI) / 180;
    const kmPerDegreeLat = 111.0;
    const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);

    const startLat = station.lat + 0.25;
    const startLng = station.lng + 0.3;

    const timeline = [
      { label: '+15m', minutes: 15 },
      { label: '+30m', minutes: 30 },
      { label: '+45m', minutes: 45 },
      { label: '+60m', minutes: 60 },
    ];

    const polyPoints: [number, number][] = [[startLat, startLng]];

    timeline.forEach((step) => {
      const distKm = (steerSpeed * step.minutes) / 60;
      const ptLat = startLat + (distKm * Math.cos(rad)) / kmPerDegreeLat;
      const ptLng = startLng + (distKm * Math.sin(rad)) / kmPerDegreeLng;
      polyPoints.push([ptLat, ptLng]);

      const ptIcon = L.divIcon({
        className: 'storm-movement-step-marker',
        html: `
          <div style="background: #1e293b; border: 1.5px solid #38bdf8; color: #38bdf8; border-radius: 4px; padding: 1px 4px; font-family: 'JetBrains Mono', monospace; font-size: 8px; font-weight: 800; white-space: nowrap;">
            ${step.label}
          </div>
        `,
        iconSize: [36, 16],
        iconAnchor: [18, 8],
      });
      group.addLayer(L.marker([ptLat, ptLng], { icon: ptIcon }));
    });

    const movementTrack = L.polyline(polyPoints, {
      color: '#0284c7',
      weight: 2.5,
      dashArray: '5, 5',
    });
    group.addLayer(movementTrack);
  }, [station, current.windDirection, current.windSpeed, showStormMovement]);

  return (
    <div className={`${
      isFullscreen
        ? 'fixed inset-0 z-[2500] w-screen h-screen rounded-none max-w-none shadow-2xl'
        : 'relative flex-1 min-h-[480px] lg:min-h-[540px] rounded-2xl shadow-xl'
    } overflow-hidden border ${
      isCleanLight
        ? 'bg-[#E5F5E0] border-[#C7E9C0] radar-grid-light'
        : 'bg-[#00441B] border-[#238B45]/40 radar-grid'
    }`}>
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Floating Exit Button in Fullscreen Mode */}
      {isFullscreen && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] select-none pointer-events-auto">
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Exit Fullscreen View (Esc)"
            className="px-4 py-2 rounded-full bg-black/85 hover:bg-black text-white border border-white/20 shadow-2xl backdrop-blur-xl text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Exit Fullscreen Map (Esc)</span>
          </button>
        </div>
      )}

      {/* Left Slide Pull-Tab (visible when slid away, sits on the left edge) */}
      <button
        type="button"
        onClick={() => setIsLeftSlid(false)}
        title="Slide Radar Controls In (▶)"
        className={`absolute top-3 left-0 z-[1000] px-2.5 py-2 rounded-r-xl shadow-2xl border-y border-r flex items-center space-x-1.5 font-mono text-xs font-bold transition-all duration-300 cursor-pointer pointer-events-auto ${
          isLeftSlid ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
        } ${
          isCleanLight
            ? 'bg-[#E5F5E0]/95 border-[#74C476] text-[#00441B] hover:bg-[#C7E9C0]'
            : 'bg-[#00441B]/95 border-[#41AB5D] text-[#F7FCF5] hover:bg-[#238B45]'
        }`}
      >
        <ChevronRight className="w-4 h-4 text-[#41AB5D] animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">Controls</span>
      </button>

      {/* Top-Left Overlay: Console Layer & Basemap Control Box */}
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`absolute top-3 left-3 z-[1000] select-none backdrop-blur-xl shadow-2xl transition-all duration-300 pointer-events-auto rounded-xl border ${
          isLeftSlid ? '-translate-x-[calc(100%+24px)] pointer-events-none opacity-0' : 'translate-x-0 opacity-100'
        } ${
          isControlsCollapsed
            ? 'p-1.5 sm:p-2 w-auto'
            : 'p-3 w-64 max-w-[calc(100vw-5rem)] sm:max-w-xs max-h-[calc(100%-4rem)] overflow-y-auto overscroll-contain custom-scrollbar'
        } ${
          isCleanLight
            ? 'bg-[#E5F5E0]/95 border-[#C7E9C0] text-[#00441B]'
            : 'bg-[#00441B]/90 border-[#238B45]/50 text-[#F7FCF5]'
        }`}
      >
        {isControlsCollapsed ? (
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsControlsCollapsed(false)}
              title="Expand Radar Controls"
              className="flex items-center space-x-2 px-2.5 py-1 sm:py-1.5 rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all text-xs font-mono font-bold"
            >
              <Layers className="w-3.5 h-3.5 text-[#41AB5D]" />
              <span className={`text-[11px] font-mono font-extrabold uppercase tracking-wider ${
                isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
              }`}>
                Controls
              </span>
              <span className="w-2 h-2 bg-[#41AB5D] shadow-[0_0_8px_rgba(65,171,93,1)] rounded-full inline-block animate-pulse"></span>
              <ChevronDown className="w-3.5 h-3.5 opacity-75" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLeftSlid(true);
              }}
              title="Slide Controls Off-Screen (◀ Slide to edge)"
              className="p-1 sm:p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer text-[#41AB5D]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div>
            <div
              onClick={() => setIsControlsCollapsed(true)}
              className={`flex items-center justify-between border-b pb-1.5 mb-2.5 cursor-pointer hover:opacity-90 transition-opacity ${
                isCleanLight ? 'border-[#C7E9C0]' : 'border-[#238B45]/30'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-[#41AB5D]" />
                <span className={`text-[11px] font-mono font-extrabold uppercase tracking-wider ${
                  isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
                }`}>
                  RADAR CONTROLS
                </span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-mono text-[#41AB5D] font-extrabold uppercase flex items-center space-x-1.5 mr-0.5">
                  <span className="w-2 h-2 bg-[#41AB5D] shadow-[0_0_8px_rgba(65,171,93,1)] rounded-full inline-block animate-pulse"></span>
                  <span>LIVE</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsControlsCollapsed(true);
                  }}
                  title="Minimize Controls"
                  className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLeftSlid(true);
                  }}
                  title="Slide Controls Off Map (◀ Slide Out)"
                  className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer flex items-center text-[10px] text-[#41AB5D]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline font-bold">Slide</span>
                </button>
              </div>
            </div>

            <div>
              <div className={`space-y-1.5 text-xs font-mono ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>
                {/* Phase 9 Layer 1: Weather Observation */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors">
                  <input
                    type="checkbox"
                    checked={showWeatherObs}
                    onChange={(e) => setShowWeatherObs(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[11px] font-semibold">1. Weather Observations</span>
                </label>

                {/* Phase 9 Layer 2: Satellite Observation */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors">
                  <input
                    type="checkbox"
                    checked={showSatelliteLayer}
                    onChange={(e) => setShowSatelliteLayer(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[11px] font-semibold">2. Satellite IR (INSAT-3D)</span>
                </label>

                {/* Phase 9 Layer 3: Radar Layer */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors">
                  <input
                    type="checkbox"
                    checked={showRadarTiles}
                    onChange={(e) => setShowRadarTiles(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[11px] font-semibold">3. Radar Echoes (DWR Tiles)</span>
                </label>

                {/* Phase 9 Layer 4: Lightning Layer */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors">
                  <input
                    type="checkbox"
                    checked={showLightning}
                    onChange={(e) => setShowLightning(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[11px] font-semibold">4. Lightning (Obs / AI Risk)</span>
                </label>

                {/* Phase 9 Layer 5: Thunderstorm Risk */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors">
                  <input
                    type="checkbox"
                    checked={showThunderstormRisk}
                    onChange={(e) => setShowThunderstormRisk(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[11px] font-semibold">5. Thunderstorm Risk Polygons</span>
                </label>

                {/* Phase 9 Layer 6: Predicted Storm Movement */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors">
                  <input
                    type="checkbox"
                    checked={showStormMovement}
                    onChange={(e) => setShowStormMovement(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[11px] font-semibold">6. Predicted Storm Movement</span>
                </label>

                {/* Radar Structural Rings */}
                <label className="flex items-center space-x-2.5 py-0.5 px-1 rounded-md cursor-pointer hover:text-[#41AB5D] transition-colors opacity-85">
                  <input
                    type="checkbox"
                    checked={showRings}
                    onChange={(e) => setShowRings(e.target.checked)}
                    className={`w-3.5 h-3.5 rounded-sm ${
                      isCleanLight
                        ? 'border-[#74C476] bg-[#F7FCF5] text-[#238B45] accent-[#238B45]'
                        : 'border-[#41AB5D] bg-[#006D2C] text-[#41AB5D] accent-[#41AB5D]'
                    } focus:ring-0`}
                  />
                  <span className="text-[10px]">Radar Range Rings (50-250km)</span>
                </label>
              </div>

              {/* Phase 9 Mandatory Map Legend */}
              <div className={`mt-3 pt-2.5 border-t ${isCleanLight ? 'border-[#C7E9C0]' : 'border-[#238B45]/30'}`}>
                <div className={`text-[10px] font-mono font-extrabold uppercase mb-1.5 ${
                  isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
                }`}>
                  MAP LAYERS LEGEND
                </div>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full inline-block shrink-0"></span>
                    <span className="truncate">Observed Lightning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 border-2 border-dashed border-sky-400 rounded-full inline-block shrink-0"></span>
                    <span className="truncate">AI Estimated Lightning Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-orange-500/60 border border-orange-500 rounded-sm inline-block shrink-0"></span>
                    <span className="truncate">Thunderstorm Risk</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-sky-400 border-b border-dashed inline-block shrink-0"></span>
                    <span className="truncate">Storm Movement</span>
                  </div>
                </div>
              </div>

              {/* CARTO Basemap Engine Selector */}
              <div className={`mt-3 pt-2.5 border-t ${isCleanLight ? 'border-[#C7E9C0]' : 'border-[#238B45]/30'}`}>
                <div className={`flex items-center justify-between text-[10px] font-mono mb-1.5 font-bold uppercase ${
                  isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
                }`}>
                  <span>CARTO Basemap:</span>
                  <span className={`text-[9px] font-bold ${
                    cartoKey ? 'text-[#41AB5D]' : isCleanLight ? 'text-[#238B45]' : 'text-[#A1D99B]'
                  }`}>
                    {cartoKey ? 'AUTH: KEYED' : 'PUBLIC TILESET'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                  <button
                    type="button"
                    onClick={() => setBasemapMode('positron')}
                    className={`py-1.5 px-2 text-center rounded-lg border uppercase font-extrabold cursor-pointer transition-all active:scale-95 ${
                      basemapMode === 'positron'
                        ? 'bg-[#238B45] text-[#F7FCF5] border-[#74C476] shadow-md'
                        : isCleanLight
                        ? 'bg-[#C7E9C0]/50 text-[#00441B] border-[#74C476] hover:bg-[#C7E9C0]'
                        : 'bg-[#006D2C] text-[#F7FCF5] border-[#238B45]/60 hover:bg-[#238B45]'
                    }`}
                  >
                    Positron (Light)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBasemapMode('darkmatter')}
                    className={`py-1.5 px-2 text-center rounded-lg border uppercase font-extrabold cursor-pointer transition-all active:scale-95 ${
                      basemapMode === 'darkmatter'
                        ? 'bg-[#238B45] text-[#F7FCF5] border-[#74C476] shadow-md'
                        : isCleanLight
                        ? 'bg-[#C7E9C0]/50 text-[#00441B] border-[#74C476] hover:bg-[#C7E9C0]'
                        : 'bg-[#006D2C] text-[#F7FCF5] border-[#238B45]/60 hover:bg-[#238B45]'
                    }`}
                  >
                    Dark Matter
                  </button>
                </div>
              </div>

              {/* Beam & Gain Telemetry */}
              <div className={`mt-3 pt-2.5 border-t grid grid-cols-2 gap-1 text-[10px] font-mono ${
                isCleanLight ? 'border-[#C7E9C0] text-[#238B45]' : 'border-[#238B45]/30 text-[#A1D99B]'
              }`}>
                <div>
                  ELEV: <span className={`font-bold ${isCleanLight ? 'text-[#00441B]' : 'text-white'}`}>{weatherData.radarScanMeta.elevation}</span>
                </div>
                <div>
                  FREQ: <span className={`font-bold ${isCleanLight ? 'text-[#00441B]' : 'text-white'}`}>{weatherData.radarScanMeta.freq}</span>
                </div>
                <div>
                  PRF: <span className={`font-bold ${isCleanLight ? 'text-[#00441B]' : 'text-white'}`}>{weatherData.radarScanMeta.prf}</span>
                </div>
                <div>
                  PULSE: <span className={`font-bold ${isCleanLight ? 'text-[#00441B]' : 'text-white'}`}>{weatherData.radarScanMeta.pulse}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Slide Pull-Tab (visible when slid away, sits on the right edge) */}
      <button
        type="button"
        onClick={() => setIsRightSlid(false)}
        title="Slide Scale & Doppler Feed Back In (◀)"
        className={`absolute top-3 right-0 z-[1000] px-2.5 py-2 rounded-l-xl shadow-2xl border-y border-l flex items-center space-x-1.5 font-mono text-xs font-bold transition-all duration-300 cursor-pointer pointer-events-auto ${
          isRightSlid ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        } ${
          isCleanLight
            ? 'bg-[#E5F5E0]/95 border-[#74C476] text-[#00441B] hover:bg-[#C7E9C0]'
            : 'bg-[#00441B]/95 border-[#41AB5D] text-[#F7FCF5] hover:bg-[#238B45]'
        }`}
      >
        <span className="text-[10px] uppercase tracking-wider font-extrabold">Scale & Feed</span>
        <ChevronLeft className="w-4 h-4 text-[#41AB5D] animate-pulse" />
      </button>

      {/* Top-Right Overlay: Reflectivity (dBZ) Scale Bar & Live Radar Swath Feed */}
      <div className={`absolute top-3 right-3 flex flex-col items-end space-y-2 z-[1000] font-mono text-[10px] select-none transition-transform duration-300 pointer-events-auto ${
        isRightSlid ? 'translate-x-[calc(100%+24px)] pointer-events-none opacity-0' : 'translate-x-0 opacity-100'
      }`}>
        {/* CSS Selector 2: Reflectivity (dBZ) Scale Bar */}
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className={`rounded-xl text-right backdrop-blur-xl shadow-2xl border transition-all duration-300 pointer-events-auto ${
            isScaleCollapsed ? 'p-1.5 sm:p-2' : 'p-3'
          } ${
            isCleanLight
              ? 'bg-[#E5F5E0]/95 border-[#C7E9C0] text-[#00441B]'
              : 'bg-[#00441B]/95 border-[#238B45]/60 text-[#F7FCF5]'
          }`}
        >
          {isScaleCollapsed ? (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setIsScaleCollapsed(false)}
                title="Expand Reflectivity Scale"
                className="flex items-center space-x-1.5 px-2 py-1 rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all text-xs font-mono font-bold"
              >
                <span className="w-3.5 h-2 rounded-xs bg-gradient-to-r from-[#41AB5D] via-yellow-400 to-red-600 border border-white/60 inline-block shadow-xs"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-wide">dBZ Scale</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-75" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRightSlid(true);
                }}
                title="Slide Scale Off-Screen (▶ Slide to edge)"
                className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer text-[#41AB5D]"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <div
                onClick={() => setIsScaleCollapsed(true)}
                className={`font-extrabold flex items-center justify-between cursor-pointer border-b pb-1 mb-2 uppercase text-left text-[11px] hover:opacity-90 transition-opacity ${
                  isCleanLight ? 'border-[#C7E9C0] text-[#00441B]' : 'border-[#238B45]/40 text-[#A1D99B]'
                }`}
              >
                <span className="truncate">Reflectivity</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsScaleCollapsed(true);
                    }}
                    title="Minimize Scale"
                    className="p-1 ml-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsRightSlid(true);
                    }}
                    title="Slide Scale Off Map (▶ Slide Out)"
                    className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer flex items-center text-[10px] text-[#41AB5D]"
                  >
                    <span className="hidden sm:inline font-bold">Slide</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <div className="flex items-center space-x-2.5 justify-end">
                  <span className={`font-extrabold text-[11px] ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>&gt; 55 dBZ</span>
                  <span className="w-5 h-3.5 bg-red-600 border border-white inline-block shadow-xs"></span>
                </div>
                <div className="flex items-center space-x-2.5 justify-end">
                  <span className={`font-extrabold text-[11px] ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>45 - 55 dBZ</span>
                  <span className="w-5 h-3.5 bg-orange-500 border border-white inline-block shadow-xs"></span>
                </div>
                <div className="flex items-center space-x-2.5 justify-end">
                  <span className={`font-extrabold text-[11px] ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>35 - 45 dBZ</span>
                  <span className="w-5 h-3.5 bg-yellow-400 border border-white inline-block shadow-xs"></span>
                </div>
                <div className="flex items-center space-x-2.5 justify-end">
                  <span className={`font-extrabold text-[11px] ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>15 - 35 dBZ</span>
                  <span className="w-5 h-3.5 bg-[#41AB5D] border border-white inline-block shadow-xs"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CSS Selector 3: Live Doppler Radar Tile Swath Overlay */}
        {showRadarTiles && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={`rounded-xl backdrop-blur-xl shadow-2xl border transition-all duration-300 pointer-events-auto ${
              isFeedCollapsed ? 'p-1.5 sm:p-2' : 'p-2.5'
            } ${
              isCleanLight
                ? 'bg-[#E5F5E0]/95 border-[#C7E9C0]'
                : 'bg-[#00441B]/95 border-[#238B45]/60'
            }`}
          >
            {isFeedCollapsed ? (
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setIsFeedCollapsed(false)}
                  title="Expand Doppler Radar Feed"
                  className="flex items-center space-x-1.5 px-2 py-1 rounded-lg cursor-pointer hover:opacity-90 active:scale-95 transition-all text-xs font-mono font-bold"
                >
                  <span className="w-2 h-2 rounded-full bg-[#41AB5D] shadow-[0_0_6px_rgba(65,171,93,1)] animate-pulse"></span>
                  <span className={`text-[10px] font-extrabold uppercase tracking-wide ${
                    isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
                  }`}>
                    Doppler Feed
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-75" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRightSlid(true);
                  }}
                  title="Slide Feed Off-Screen (▶ Slide to edge)"
                  className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer text-[#41AB5D]"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>
                <div
                  onClick={() => setIsFeedCollapsed(true)}
                  className={`flex items-center justify-between text-[9px] font-extrabold uppercase cursor-pointer border-b pb-1 mb-1.5 hover:opacity-90 transition-opacity ${
                    isCleanLight ? 'border-[#C7E9C0] text-[#00441B]' : 'border-[#238B45]/40 text-[#A1D99B]'
                  }`}
                >
                  <span>DOPPLER FEED</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[#41AB5D] font-extrabold">LIVE</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsFeedCollapsed(true);
                      }}
                      title="Minimize Feed"
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRightSlid(true);
                      }}
                      title="Slide Feed Off Map (▶ Slide Out)"
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 active:scale-90 transition-transform cursor-pointer flex items-center text-[10px] text-[#41AB5D]"
                    >
                      <span className="hidden sm:inline font-bold">Slide</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className={`relative w-24 h-24 sm:w-28 sm:h-28 border overflow-hidden rounded-lg ${
                  isCleanLight ? 'bg-[#F7FCF5] border-[#74C476]' : 'bg-[#002b11] border-[#238B45]'
                }`}>
                  <svg className="w-full h-full" viewBox="0 0 512 512">
                    <image
                      href={`https://tilecache.rainviewer.com/v2/radar/${
                        radarTiles?.latestPath ? radarTiles.latestPath.replace('/v2/radar/', '') : radarTiles?.latestTimestamp || 'latest'
                      }/512/4/11/7/2/1_1.png`}
                      x="0"
                      y="0"
                      width="512"
                      height="512"
                      preserveAspectRatio="xMidYMid slice"
                      className="opacity-95"
                    />
                    {/* Surveillance reticle in emerald green */}
                    <circle cx="256" cy="256" r="230" fill="none" stroke="#74C476" strokeWidth="2" strokeDasharray="6,4" opacity="0.9" />
                    <circle cx="256" cy="256" r="150" fill="none" stroke="#41AB5D" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.8" />
                    <circle cx="256" cy="256" r="75" fill="none" stroke="#41AB5D" strokeWidth="1.5" opacity="0.7" />
                    <line x1="256" y1="0" x2="256" y2="512" stroke="#74C476" strokeWidth="1.2" opacity="0.7" />
                    <line x1="0" y1="256" x2="512" y2="256" stroke="#74C476" strokeWidth="1.2" opacity="0.7" />
                    <circle cx="256" cy="256" r="5" fill="#ef4444" />
                  </svg>
                  <div className="absolute bottom-0.5 right-0.5 bg-[#00441B]/90 text-[#A1D99B] font-bold px-1.5 py-0.5 text-[8px] font-mono rounded">
                    {radarTiles?.latestTimestamp ? new Date(radarTiles.latestTimestamp * 1000).toISOString().substring(11, 16) + 'Z' : 'LIVE'}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom-Left Map Coordinate HUD */}
      <div className={`absolute bottom-2.5 left-3 px-3.5 py-2 text-[10px] font-mono flex items-center space-x-3 z-[1000] rounded-xl backdrop-blur-xl shadow-2xl border ${
        isCleanLight
          ? 'bg-[#E5F5E0]/90 border-[#C7E9C0] text-[#00441B]'
          : 'bg-[#00441B]/90 border-[#238B45]/50 text-[#F7FCF5]'
      }`}>
        <span>
          CENTER: <strong className={`font-extrabold ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>{station.lat.toFixed(4)}N</strong>, <strong className={`font-extrabold ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>{station.lng.toFixed(4)}E</strong>
        </span>
        <span className={isCleanLight ? 'text-[#74C476]' : 'text-[#41AB5D]'}>|</span>
        <span>
          CURSOR: <strong className={`font-extrabold ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>{cursorPos.lat.toFixed(4)}N</strong>, <strong className={`font-extrabold ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>{cursorPos.lng.toFixed(4)}E</strong>
        </span>
        <span className={isCleanLight ? 'text-[#74C476]' : 'text-[#41AB5D]'}>|</span>
        <span className={isCleanLight ? 'text-[#238B45] font-extrabold' : 'text-[#74C476] font-extrabold'}>
          POINT REFLECTIVITY: {cursorDbz.toFixed(1)} dBZ
        </span>
        <span className={isCleanLight ? 'text-[#74C476]' : 'text-[#41AB5D]'}>|</span>
        <button
          type="button"
          onClick={() => {
            const shouldSlide = !isLeftSlid || !isRightSlid;
            setIsLeftSlid(shouldSlide);
            setIsRightSlid(shouldSlide);
          }}
          title="Toggle sliding all overlay panels away for clean unobstructed view"
          className={`px-2 py-0.5 rounded-md border text-[9px] font-bold flex items-center space-x-1 cursor-pointer transition-colors ${
            isLeftSlid && isRightSlid
              ? 'bg-[#41AB5D] text-white border-[#74C476]'
              : isCleanLight
              ? 'bg-[#C7E9C0]/60 text-[#00441B] border-[#74C476] hover:bg-[#C7E9C0]'
              : 'bg-[#006D2C]/60 text-[#F7FCF5] border-[#238B45] hover:bg-[#006D2C]'
          }`}
        >
          {isLeftSlid && isRightSlid ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>{isLeftSlid && isRightSlid ? 'Show Panels' : 'Clean Map'}</span>
        </button>
      </div>

      {/* Bottom-Right Custom Leaflet Zoom, Center & Expand Map Controls */}
      <div className="absolute bottom-2.5 right-3 z-[1000] flex items-center select-none font-mono">
        <div className={`p-1.5 flex items-center space-x-1.5 rounded-xl backdrop-blur-xl shadow-2xl text-xs border ${
          isCleanLight
            ? 'bg-[#E5F5E0]/90 border-[#C7E9C0] text-[#00441B]'
            : 'bg-[#00441B]/90 border-[#238B45]/50 text-[#F7FCF5]'
        }`}>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={currentZoom >= MAP_MAX_ZOOM}
            title={`Zoom In (+) [Max: ${MAP_MAX_ZOOM}]`}
            className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border font-extrabold cursor-pointer transition-colors shadow-xs text-sm disabled:opacity-30 disabled:cursor-not-allowed ${
              isCleanLight
                ? 'bg-[#C7E9C0]/50 hover:bg-[#41AB5D] hover:text-white border-[#74C476] text-[#00441B]'
                : 'bg-[#006D2C] hover:bg-[#41AB5D] hover:text-white border-[#238B45] text-[#F7FCF5]'
            }`}
          >
            +
          </button>
          <div className={`px-2.5 text-[10px] font-extrabold border rounded-lg h-7.5 flex items-center justify-center min-w-[50px] tabular-nums ${
            isCleanLight
              ? 'text-[#00441B] bg-[#C7E9C0] border-[#74C476]'
              : 'text-[#F7FCF5] bg-[#002f13] border-[#238B45]'
          }`}>
            Z:{String(currentZoom).padStart(2, '0')}
          </div>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={currentZoom <= MAP_MIN_ZOOM}
            title={`Zoom Out (-) [Min: ${MAP_MIN_ZOOM}]`}
            className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center border font-extrabold cursor-pointer transition-colors shadow-xs text-sm disabled:opacity-30 disabled:cursor-not-allowed ${
              isCleanLight
                ? 'bg-[#C7E9C0]/50 hover:bg-[#41AB5D] hover:text-white border-[#74C476] text-[#00441B]'
                : 'bg-[#006D2C] hover:bg-[#41AB5D] hover:text-white border-[#238B45] text-[#F7FCF5]'
            }`}
          >
            &minus;
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Center Radar HQ (250km View)"
            className="px-2.5 h-7.5 rounded-lg flex items-center justify-center bg-[#41AB5D] hover:bg-[#74C476] text-[#F7FCF5] text-[10px] font-extrabold uppercase tracking-wider cursor-pointer border border-[#74C476] shadow-md transition-colors"
          >
            HQ
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen Map (Esc)' : 'Expand Map for Fullscreen View'}
            className={`px-2.5 h-7.5 rounded-lg flex items-center justify-center font-extrabold cursor-pointer transition-all shadow-md text-[10px] uppercase tracking-wider border ${
              isFullscreen
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300'
                : isCleanLight
                ? 'bg-[#41AB5D] hover:bg-[#74C476] text-[#F7FCF5] border-[#74C476]'
                : 'bg-[#006D2C] hover:bg-[#41AB5D] text-[#F7FCF5] border-[#238B45]'
            }`}
          >
            {isFullscreen ? (
              <div className="flex items-center space-x-1">
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expand</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
