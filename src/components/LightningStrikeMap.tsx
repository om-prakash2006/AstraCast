/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — LightningStrikeMap Component
 *
 * Overlays real-time lightning strike coordinates onto the existing radar map,
 * utilizing real-time events and telemetry from the mock lightning detection service.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  Zap,
  Radio,
  Clock,
  Layers,
  Volume2,
  VolumeX,
  Crosshair,
  Sliders,
  ChevronDown,
  ChevronUp,
  Flame,
  Activity,
  Filter,
  RefreshCw,
  Compass,
  Globe,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { CityWeatherData, NowcastStep, RadarTileResponse } from '../types/weather';
import {
  mockLightningDetectionService,
  RealTimeLightningStrike,
  LightningActivityLevel,
  LightningDetectionStats,
} from '../services/lightning/mockLightningDetectionService';

export interface LightningStrikeMapProps {
  weatherData: CityWeatherData;
  activeStep?: NowcastStep;
  radarTiles?: RadarTileResponse | null;
  activeTab?: string;
  isCleanLight?: boolean;
  className?: string;
  onSelectStrike?: (strike: RealTimeLightningStrike) => void;
}

export const LightningStrikeMap: React.FC<LightningStrikeMapProps> = ({
  weatherData,
  activeStep,
  radarTiles,
  activeTab = 'OVERVIEW',
  isCleanLight = false,
  className = '',
  onSelectStrike,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const radarTileLayerRef = useRef<L.TileLayer | null>(null);
  const ringsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const cellsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const lightningLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const flashOverlayRef = useRef<HTMLDivElement | null>(null);

  // State from mock lightning detection service
  const [strikes, setStrikes] = useState<RealTimeLightningStrike[]>(() =>
    mockLightningDetectionService.getStrikes(30)
  );
  const [stats, setStats] = useState<LightningDetectionStats>(() =>
    mockLightningDetectionService.getStats()
  );
  const [selectedStrike, setSelectedStrike] = useState<RealTimeLightningStrike | null>(null);
  const [recentFlashId, setRecentFlashId] = useState<string | null>(null);

  // Filter & Control States
  const [strikeTypeFilter, setStrikeTypeFilter] = useState<'ALL' | 'CG' | 'IC'>('ALL');
  const [timeWindowMin, setTimeWindowMin] = useState<number>(15);
  const [activityLevel, setActivityLevel] = useState<LightningActivityLevel>('SEVERE');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);
  const [showRadarLayer, setShowRadarLayer] = useState<boolean>(true);
  const [showRingsLayer, setShowRingsLayer] = useState<boolean>(true);
  const [showStormCells, setShowStormCells] = useState<boolean>(true);
  const [showLogDrawer, setShowLogDrawer] = useState<boolean>(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [isPanelSlid, setIsPanelSlid] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

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

  // CARTO Basemap Key (checks CARTO env, then lightning env if user entered it there)
  const [cartoKey, setCartoKey] = useState<string>(() => {
    const directKey = (import.meta.env.VITE_CARTO_API_KEY as string | undefined) || '';
    const ltgKey = (import.meta.env.VITE_LIGHTNING_API_KEY as string | undefined) || '';
    if (directKey && directKey !== 'MY_CARTO_API_KEY') return directKey.trim();
    if (ltgKey && (ltgKey.startsWith('cb1_') || ltgKey.length >= 25)) return ltgKey.trim();
    return '';
  });

  const [basemapStyle, setBasemapStyle] = useState<'darkmatter' | 'positron' | 'voyager'>(
    isCleanLight ? 'positron' : 'darkmatter'
  );

  // Sync CARTO key from server runtime
  useEffect(() => {
    fetch('/api/config/carto')
      .then((res) => res.json())
      .then((data) => {
        if (data?.cartoApiKey && data.cartoApiKey !== 'MY_CARTO_API_KEY') {
          setCartoKey(data.cartoApiKey.trim());
        }
      })
      .catch(() => {});
  }, []);

  // Audio Context ref for synthetic thunder / electrical pulse
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Map coordinate tracker
  const [cursorPos, setCursorPos] = useState<{ lat: number; lng: number }>({
    lat: weatherData.station.lat,
    lng: weatherData.station.lng,
  });
  const [currentZoom, setCurrentZoom] = useState<number>(8);

  const { station, stormCells } = weatherData;

  // Sound generator using Web Audio API
  const playThunderSound = (isCG: boolean) => {
    if (!isAudioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = isCG ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isCG ? 120 : 80, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Audio not permitted or failed; ignore safely
    }
  };

  // Sync station with mock service
  useEffect(() => {
    mockLightningDetectionService.setStationCoordinates(
      station.lat,
      station.lng,
      station.radarStationCode || 'RADAR-HQ'
    );
  }, [station.lat, station.lng, station.radarStationCode]);

  // Subscribe to real-time lightning strike events from mock service
  useEffect(() => {
    const unsubscribe = mockLightningDetectionService.subscribe((newStrike) => {
      setStrikes((prev) => [newStrike, ...prev.slice(0, 99)]);
      setStats(mockLightningDetectionService.getStats());
      setRecentFlashId(newStrike.id);

      // Flash trigger
      if (flashOverlayRef.current) {
        flashOverlayRef.current.style.opacity = '0.35';
        setTimeout(() => {
          if (flashOverlayRef.current) {
            flashOverlayRef.current.style.opacity = '0';
          }
        }, 180);
      }

      playThunderSound(newStrike.strikeType === 'CG');
    });

    return () => {
      unsubscribe();
    };
  }, [isAudioEnabled]);

  // Periodic stats refresh
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(mockLightningDetectionService.getStats());
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Filtered strikes based on type and time window
  const filteredStrikes = useMemo(() => {
    const cutoff = Date.now() - timeWindowMin * 60 * 1000;
    return strikes.filter((s) => {
      if (s.receivedAt < cutoff) return false;
      if (strikeTypeFilter === 'CG') return s.strikeType === 'CG';
      if (strikeTypeFilter === 'IC') return s.strikeType === 'IC';
      return true;
    });
  }, [strikes, strikeTypeFilter, timeWindowMin]);

  // CARTO Basemaps URL generator (supports authenticated key and public fallback)
  const getCartoTileUrl = (mode: 'darkmatter' | 'positron' | 'voyager', key: string) => {
    const cleanKey = key.trim();
    let style = 'dark_all';
    if (mode === 'positron') style = 'light_all';
    else if (mode === 'voyager') style = 'rastertiles/voyager';

    if (cleanKey && cleanKey !== 'MY_CARTO_API_KEY') {
      // CARTO Basemaps API strictly requires `key=YOUR_KEY`
      // Providing both `key` and `api_key` guarantees full compatibility across CDNs
      return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cleanKey)}&api_key=${encodeURIComponent(cleanKey)}`;
    }
    return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [station.lat, station.lng],
        zoom: 8,
        minZoom: 5,
        maxZoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      map.on('zoomend', () => {
        setCurrentZoom(map.getZoom());
      });

      // Enterprise CARTO Basemap with explicit subdomains and zoom constraints
      const baseLayer = L.tileLayer(getCartoTileUrl(basemapStyle, cartoKey), {
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution:
          '&copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);

      baseTileLayerRef.current = baseLayer;

      // Layer groups
      ringsLayerGroupRef.current = L.layerGroup().addTo(map);
      cellsLayerGroupRef.current = L.layerGroup().addTo(map);
      lightningLayerGroupRef.current = L.layerGroup().addTo(map);

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        setCursorPos({
          lat: Math.round(e.latlng.lat * 10000) / 10000,
          lng: Math.round(e.latlng.lng * 10000) / 10000,
        });
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

  // Update basemap on theme, style mode, or cartoKey change
  useEffect(() => {
    if (baseTileLayerRef.current) {
      baseTileLayerRef.current.setUrl(getCartoTileUrl(basemapStyle, cartoKey));
    }
  }, [basemapStyle, cartoKey]);

  useEffect(() => {
    setBasemapStyle(isCleanLight ? 'positron' : 'darkmatter');
  }, [isCleanLight]);

  // Invalidate size on tab change or window resize
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.invalidateSize();
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Update center on station change
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([station.lat, station.lng], 8);
      mapInstanceRef.current.invalidateSize();
    }
  }, [station.lat, station.lng]);

  // RainViewer Radar Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (radarTileLayerRef.current) {
      map.removeLayer(radarTileLayerRef.current);
      radarTileLayerRef.current = null;
    }

    if (showRadarLayer && radarTiles && radarTiles.host && radarTiles.latestPath) {
      const tileUrl = `${radarTiles.host}${radarTiles.latestPath}/256/{z}/{x}/{y}/2/1_1.png`;
      const radarLayer = L.tileLayer(tileUrl, {
        opacity: 0.7,
        zIndex: 5,
        minZoom: 0,
        maxZoom: 18,
        maxNativeZoom: 7,
      }).addTo(map);
      radarTileLayerRef.current = radarLayer;
    }
  }, [radarTiles, showRadarLayer]);

  // Redraw Range Rings & Station HQ
  useEffect(() => {
    const group = ringsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showRingsLayer) return;

    const center: [number, number] = [station.lat, station.lng];
    const ringRadiiKm = [50, 100, 150, 200];
    const ringColor = isCleanLight ? '#059669' : '#10b981';

    ringRadiiKm.forEach((km, idx) => {
      const circle = L.circle(center, {
        radius: km * 1000,
        color: ringColor,
        weight: idx === 3 ? 1.6 : 1,
        dashArray: '4, 4',
        fill: false,
        opacity: 0.5,
      });
      group.addLayer(circle);

      // East distance label
      const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);
      const labelLng = station.lng + km / kmPerDegreeLng;
      const textIcon = L.divIcon({
        className: 'radar-dist-label',
        html: `<div style="font-family: monospace; font-size: 9px; font-weight: 700; color: ${ringColor}; background: ${
          isCleanLight ? 'rgba(255,255,255,0.85)' : 'rgba(6,24,14,0.85)'
        }; padding: 1px 4px; border: 1px solid ${ringColor}; border-radius: 3px;">${km}KM</div>`,
        iconSize: [45, 14],
        iconAnchor: [0, 7],
      });
      group.addLayer(L.marker([station.lat, labelLng], { icon: textIcon, interactive: false }));
    });

    // Radar Center Station HQ Marker
    const hqIcon = L.divIcon({
      className: 'radar-hq-marker',
      html: `
        <div style="display: flex; align-items: center; gap: 4px; background: ${
          isCleanLight ? '#ffffff' : '#0f172a'
        }; border: 1.5px solid #059669; border-radius: 6px; padding: 2px 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); white-space: nowrap;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #059669; box-shadow: 0 0 6px #10b981;"></div>
          <span style="font-family: monospace; font-size: 10px; font-weight: 800; color: ${
            isCleanLight ? '#065f46' : '#6ee7b7'
          };">${station.radarStationCode || 'RADAR-HQ'}</span>
        </div>
      `,
      iconSize: [120, 20],
      iconAnchor: [60, 10],
    });
    group.addLayer(L.marker(center, { icon: hqIcon }));
  }, [station, showRingsLayer, isCleanLight]);

  // Redraw Storm Cells
  useEffect(() => {
    const group = cellsLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showStormCells) return;

    const kmPerDegreeLat = 111.0;
    const kmPerDegreeLng = 111.0 * Math.cos((station.lat * Math.PI) / 180);

    const dLat = (activeStep?.stormCenterOffsetKm?.dy || 0) / kmPerDegreeLat;
    const dLng = (activeStep?.stormCenterOffsetKm?.dx || 0) / kmPerDegreeLng;

    stormCells.forEach((cell) => {
      const pLat = cell.lat + dLat;
      const pLng = cell.lng + dLng;

      // Convective polygon
      const radiusKm = 18;
      const points: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6;
        points.push([
          pLat + (radiusKm * Math.cos(angle)) / kmPerDegreeLat,
          pLng + (radiusKm * Math.sin(angle)) / kmPerDegreeLng,
        ]);
      }

      const poly = L.polygon(points, {
        color: '#dc2626',
        weight: 1.2,
        fillColor: '#ef4444',
        fillOpacity: 0.25,
      });
      group.addLayer(poly);

      const cellIcon = L.divIcon({
        className: 'convective-cell-label',
        html: `
          <div style="background: rgba(15,23,42,0.85); border: 1px solid #ef4444; border-radius: 4px; padding: 2px 5px; font-family: monospace; font-size: 9px; font-weight: 700; color: #fca5a5; white-space: nowrap;">
            ${cell.name} (${cell.dbz.toFixed(0)} dBZ)
          </div>
        `,
        iconSize: [110, 16],
        iconAnchor: [55, 20],
      });
      group.addLayer(L.marker([pLat, pLng], { icon: cellIcon }));
    });
  }, [stormCells, activeStep, showStormCells, station]);

  // Redraw Real-Time Lightning Strike Coordinates Overlay
  useEffect(() => {
    const group = lightningLayerGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const now = Date.now();

    filteredStrikes.forEach((strike) => {
      const ageSec = Math.max(0, (now - strike.receivedAt) / 1000);
      const isFresh = ageSec < 15;
      const isRecent = ageSec >= 15 && ageSec < 60;
      const isAging = ageSec >= 60 && ageSec < 300;

      // Color based on age
      let strokeColor = '#ef4444'; // Older (>5m)
      let glowColor = 'rgba(239, 68, 68, 0.4)';
      if (isFresh) {
        strokeColor = '#00f0ff'; // Intense Electric Cyan
        glowColor = 'rgba(0, 240, 255, 0.8)';
      } else if (isRecent) {
        strokeColor = '#f59e0b'; // Vivid Amber
        glowColor = 'rgba(245, 158, 11, 0.6)';
      } else if (isAging) {
        strokeColor = '#ea580c'; // Orange
        glowColor = 'rgba(234, 88, 12, 0.5)';
      }

      const isCG = strike.strikeType === 'CG';
      const isSelected = selectedStrike?.id === strike.id;
      const markerSize = isFresh ? 30 : isSelected ? 26 : 22;

      // SVG Icon with pulse shockwave ring for fresh strikes
      const strikeHtml = `
        <div class="lightning-strike-pin group" style="position: relative; width: ${markerSize}px; height: ${markerSize}px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            isFresh
              ? `<div style="position: absolute; inset: -8px; border-radius: 50%; border: 1.5px solid ${strokeColor}; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite; opacity: 0.75;"></div>`
              : ''
          }
          <div style="position: absolute; inset: 0; border-radius: 50%; background: ${
            isCG ? strokeColor : 'transparent'
          }; opacity: ${isCG ? '0.2' : '0.1'}; box-shadow: 0 0 12px ${glowColor};"></div>
          
          <svg width="${markerSize}" height="${markerSize}" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 4px ${glowColor});">
            ${
              isCG
                ? `
                <!-- Cloud-to-Ground Crosshair & Bolt -->
                <circle cx="12" cy="12" r="9" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.8" />
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="${strokeColor}" fill-opacity="0.85" />
              `
                : `
                <!-- Intra-Cloud Arc & Glow -->
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" stroke="${strokeColor}" stroke-width="1.6" fill="${strokeColor}" fill-opacity="0.25" />
                <path d="M13 10l-3 4h4l-2 4" stroke="#ffffff" stroke-width="1.8" />
              `
            }
          </svg>

          <!-- Coordinate & Current Tooltip on Hover / Fresh -->
          <div style="position: absolute; top: -24px; left: 50%; transform: translateX(-50%); background: #090d16; border: 1px solid ${strokeColor}; padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 8px; font-weight: 800; color: ${strokeColor}; white-space: nowrap; pointer-events: none; opacity: ${
        isFresh || isSelected ? '1' : '0'
      }; transition: opacity 0.2s;" class="group-hover:!opacity-100 shadow-xl z-20">
            ${strike.peakCurrentKA > 0 ? '+' : ''}${strike.peakCurrentKA}kA (${strike.strikeType})
          </div>
        </div>
      `;

      const strikeIcon = L.divIcon({
        className: 'custom-lightning-node',
        html: strikeHtml,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([strike.latitude, strike.longitude], {
        icon: strikeIcon,
        zIndexOffset: isFresh ? 1000 : 500,
      });

      // Bind detailed coordinate popup
      const popupHtml = `
        <div style="font-family: monospace; font-size: 11px; color: #f8fafc; padding: 4px; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 4px; margin-bottom: 6px;">
            <strong style="color: ${strokeColor}; display: flex; align-items: center; gap: 4px;">
              ⚡ ${strike.strikeType === 'CG' ? 'CLOUD-TO-GROUND' : 'INTRA-CLOUD'}
            </strong>
            <span style="font-size: 9px; color: #94a3b8;">${Math.round(ageSec)}s ago</span>
          </div>
          <div style="line-height: 1.5;">
            <div><strong>COORDINATES:</strong> ${strike.latitude.toFixed(4)}°N, ${strike.longitude.toFixed(4)}°E</div>
            <div><strong>PEAK CURRENT:</strong> <span style="color: #38bdf8; font-weight: 700;">${
              strike.peakCurrentKA > 0 ? '+' : ''
            }${strike.peakCurrentKA} kA</span> (${strike.polarity})</div>
            <div><strong>RANGE:</strong> ${strike.distanceKm} km @ ${String(strike.bearingDeg).padStart(3, '0')}°</div>
            <div><strong>CONFIDENCE:</strong> ${strike.confidence}%</div>
            <div><strong>STROKES:</strong> ${strike.multiplicity} in flash</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 4px;">${strike.sensorNetwork}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'lightning-popup-dark',
      });

      marker.on('click', () => {
        setSelectedStrike(strike);
        if (onSelectStrike) onSelectStrike(strike);
      });

      group.addLayer(marker);
    });
  }, [filteredStrikes, selectedStrike, isCleanLight, onSelectStrike]);

  // Pan to selected strike
  const handleSelectAndPan = (strike: RealTimeLightningStrike) => {
    setSelectedStrike(strike);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo([strike.latitude, strike.longitude], {
        animate: true,
        duration: 0.5,
      });
    }
    if (onSelectStrike) onSelectStrike(strike);
  };

  // Zoom controls
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([station.lat, station.lng], 8);
    }
  };

  // Trigger manual strike for SIH demonstration
  const handleTriggerManualStrike = () => {
    // Generate near active cell or cursor
    const targetLat = cursorPos.lat || station.lat + 0.12;
    const targetLng = cursorPos.lng || station.lng + 0.18;
    const newStrike = mockLightningDetectionService.generateRandomStrike(targetLat, targetLng);
    handleSelectAndPan(newStrike);
  };

  // Handle activity change
  const handleActivityChange = (lvl: LightningActivityLevel) => {
    setActivityLevel(lvl);
    mockLightningDetectionService.setActivityLevel(lvl);
  };

  return (
    <div
      className={`${
        isFullscreen
          ? 'fixed inset-0 z-[2500] w-screen h-screen rounded-none max-w-none shadow-2xl'
          : 'relative w-full h-[580px] sm:h-[640px] rounded-2xl shadow-2xl'
      } overflow-hidden border transition-all select-none ${
        isCleanLight
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-[#060b14] border-cyan-950/60 text-slate-100'
      } ${className}`}
    >
      {/* Visual Flash Overlay for real-time strikes */}
      <div
        ref={flashOverlayRef}
        className="pointer-events-none absolute inset-0 z-[1200] bg-cyan-200/40 opacity-0 transition-opacity duration-150"
      />

      {/* Top Floating Exit Button in Fullscreen Mode */}
      {isFullscreen && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] select-none pointer-events-auto">
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Exit Fullscreen View (Esc)"
            className="px-4 py-2 rounded-full bg-black/85 hover:bg-black text-white border border-white/20 shadow-2xl backdrop-blur-xl text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exit Fullscreen Map (Esc)</span>
          </button>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Left Slide Pull-Tab (visible when slid away, sits on the left edge) */}
      <button
        type="button"
        onClick={() => setIsPanelSlid(false)}
        title="Slide Filters In (▶)"
        className={`absolute top-16 left-0 z-[1000] px-2.5 py-2 rounded-r-xl shadow-2xl border-y border-r flex items-center space-x-1.5 font-mono text-xs font-bold transition-all duration-300 cursor-pointer pointer-events-auto ${
          isPanelSlid ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 pointer-events-none'
        } ${
          isCleanLight
            ? 'bg-white/95 border-emerald-400 text-slate-800'
            : 'bg-[#080e1a]/95 border-cyan-500/60 text-cyan-300'
        }`}
      >
        <ChevronRight className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold">Filters</span>
      </button>

      {/* Top Header Bar: Telemetry & Live LDS Feed Indicator */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Stream Status & Coordinates Tag */}
        <div
          className={`pointer-events-auto px-3.5 py-2 rounded-xl backdrop-blur-xl border shadow-xl flex items-center space-x-3 text-xs font-mono ${
            isCleanLight
              ? 'bg-white/95 border-emerald-300 text-slate-800'
              : 'bg-[#080e1a]/90 border-cyan-500/40 text-cyan-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span className="font-extrabold tracking-wider text-[11px]">
              MOCK LDS: REAL-TIME STREAM
            </span>
          </div>
          <span className="opacity-40">|</span>
          <div className="hidden sm:flex items-center space-x-1.5 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-semibold text-slate-300">
              {stats.totalStrikes15m} STRIKES / 15M
            </span>
          </div>
          <span className="hidden sm:inline opacity-40">|</span>
          <div className="hidden md:flex items-center space-x-1 text-[11px] text-amber-400">
            <Flame className="w-3.5 h-3.5" />
            <span>MAX: {stats.maxCurrentKA} kA</span>
          </div>
        </div>

        {/* Right: Sound, CARTO Status & Action Controls */}
        <div className="pointer-events-auto flex items-center space-x-2">
          {/* CARTO Basemap Badge */}
          <div
            className={`px-2.5 py-1.5 rounded-xl border backdrop-blur-xl text-xs font-mono flex items-center space-x-1.5 shadow-md ${
              cartoKey
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                : isCleanLight
                ? 'bg-white/90 border-slate-300 text-slate-700'
                : 'bg-[#080e1a]/90 border-slate-700 text-slate-300'
            }`}
            title={cartoKey ? 'CARTO.com Basemap API (Authenticated Key Active)' : 'CARTO.com Basemap'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold">
              CARTO: {cartoKey ? 'KEYED ✓' : 'ACTIVE'}
            </span>
          </div>

          {/* Audio toggle button */}
          <button
            type="button"
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            title={isAudioEnabled ? 'Disable Strike Audio' : 'Enable Thunder / Audio Pulse'}
            className={`px-2.5 py-1.5 rounded-xl border backdrop-blur-xl text-xs font-mono flex items-center space-x-1.5 transition-all shadow-md cursor-pointer ${
              isAudioEnabled
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 font-bold'
                : isCleanLight
                ? 'bg-white/90 text-slate-600 border-slate-300 hover:text-slate-900'
                : 'bg-[#080e1a]/90 text-slate-400 border-slate-700 hover:text-cyan-300'
            }`}
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden xs:inline">{isAudioEnabled ? 'AUDIO ON' : 'AUDIO'}</span>
          </button>

          {/* Simulate Strike Button for SIH Demo */}
          <button
            type="button"
            onClick={handleTriggerManualStrike}
            title="Simulate immediate lightning discharge at cursor"
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono text-xs font-extrabold flex items-center space-x-1.5 shadow-lg border border-cyan-300/60 cursor-pointer active:scale-95 transition-transform"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="text-[11px] uppercase tracking-wider">Simulate Strike</span>
          </button>

          {/* Log Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowLogDrawer(!showLogDrawer)}
            title="Toggle Strike Telemetry Drawer"
            className={`px-2.5 py-1.5 rounded-xl border backdrop-blur-xl text-xs font-mono flex items-center space-x-1.5 shadow-md cursor-pointer transition-all ${
              showLogDrawer
                ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200'
                : isCleanLight
                ? 'bg-white/90 border-slate-300 text-slate-700'
                : 'bg-[#080e1a]/90 border-slate-700 text-slate-300 hover:border-cyan-500'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden sm:inline">LOGS ({filteredStrikes.length})</span>
          </button>
        </div>
      </div>

      {/* Floating Left Control Panel: Filters, Activity & Layers */}
      <div
        className={`absolute top-16 left-3 z-[1000] rounded-2xl backdrop-blur-2xl border shadow-2xl transition-all duration-300 ${
          isPanelSlid ? '-translate-x-[calc(100%+24px)] pointer-events-none opacity-0' : 'translate-x-0 opacity-100'
        } ${
          isCleanLight
            ? 'bg-white/95 border-slate-300 text-slate-800'
            : 'bg-[#080e1a]/95 border-cyan-900/60 text-slate-200'
        } ${isControlsCollapsed ? 'p-2' : 'p-3.5 w-64'}`}
      >
        <div className="flex items-center justify-between border-b pb-2 mb-2 border-slate-700/40">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            {!isControlsCollapsed && (
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Overlay Filters
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
              className="p-1 rounded-lg hover:bg-slate-700/30 text-slate-400 hover:text-slate-100 transition-colors cursor-pointer"
            >
              {isControlsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsPanelSlid(true)}
              title="Slide Filter Panel Off-Screen (◀)"
              className="p-1 rounded-lg hover:bg-slate-700/30 text-cyan-400 hover:text-cyan-200 transition-colors flex items-center text-[10px] font-bold cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Slide</span>
            </button>
          </div>
        </div>

        {!isControlsCollapsed && (
          <div className="space-y-3 font-mono text-[11px]">
            {/* Strike Type Selector */}
            <div>
              <div className="text-[9px] text-slate-400 uppercase mb-1 font-semibold">Strike Type</div>
              <div className="grid grid-cols-3 gap-1">
                {(['ALL', 'CG', 'IC'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setStrikeTypeFilter(type)}
                    className={`py-1 px-1.5 rounded-lg border text-center text-[10px] font-bold transition-all cursor-pointer ${
                      strikeTypeFilter === type
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm'
                        : isCleanLight
                        ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {type === 'ALL' ? 'ALL' : type === 'CG' ? 'CG (GND)' : 'IC (CLD)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window Selector */}
            <div>
              <div className="text-[9px] text-slate-400 uppercase mb-1 font-semibold">Time Window</div>
              <div className="grid grid-cols-4 gap-1">
                {[5, 15, 30, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setTimeWindowMin(mins)}
                    className={`py-1 rounded-lg border text-center text-[10px] font-bold transition-all cursor-pointer ${
                      timeWindowMin === mins
                        ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-sm'
                        : isCleanLight
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {mins}M
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Rate Selector */}
            <div>
              <div className="text-[9px] text-slate-400 uppercase mb-1 font-semibold">Simulation Rate</div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                {(['LOW', 'MODERATE', 'SEVERE', 'BURST'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => handleActivityChange(lvl)}
                    className={`py-1 px-2 rounded-lg border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                      activityLevel === lvl
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : isCleanLight
                        ? 'bg-slate-100 text-slate-600 border-slate-200'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span>{lvl}</span>
                    {activityLevel === lvl && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* CARTO.com Basemap Selector */}
            <div>
              <div className="text-[9px] text-slate-400 uppercase mb-1 font-semibold flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <Globe className="w-3 h-3 text-emerald-400" />
                  <span>CARTO Basemap</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-400">
                  {cartoKey ? 'KEYED ✓' : 'PUBLIC'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {(['darkmatter', 'positron', 'voyager'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBasemapStyle(mode)}
                    className={`py-1 px-1.5 rounded-lg border text-center text-[10px] font-bold transition-all cursor-pointer ${
                      basemapStyle === mode
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-xs'
                        : isCleanLight
                        ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {mode === 'darkmatter' ? 'Dark' : mode === 'positron' ? 'Light' : 'Voyager'}
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Toggles */}
            <div className="border-t border-slate-700/40 pt-2 space-y-1.5">
              <label className="flex items-center justify-between cursor-pointer text-slate-300 text-[10px]">
                <span>Radar Echo Overlay</span>
                <input
                  type="checkbox"
                  checked={showRadarLayer}
                  onChange={(e) => setShowRadarLayer(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer text-slate-300 text-[10px]">
                <span>Storm Cells (Doppler)</span>
                <input
                  type="checkbox"
                  checked={showStormCells}
                  onChange={(e) => setShowStormCells(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer text-slate-300 text-[10px]">
                <span>Distance Range Rings</span>
                <input
                  type="checkbox"
                  checked={showRingsLayer}
                  onChange={(e) => setShowRingsLayer(e.target.checked)}
                  className="rounded text-cyan-500 focus:ring-0 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Right Drawer: Live Real-Time Coordinates Stream Feed */}
      {showLogDrawer && (
        <div
          className={`absolute top-16 right-3 bottom-14 w-72 sm:w-80 z-[1000] rounded-2xl backdrop-blur-2xl border shadow-2xl flex flex-col overflow-hidden transition-all ${
            isCleanLight
              ? 'bg-white/95 border-slate-300 text-slate-800'
              : 'bg-[#080e1a]/95 border-cyan-900/60 text-slate-200'
          }`}
        >
          {/* Drawer Header */}
          <div className="p-3 border-b border-slate-700/40 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs font-bold text-cyan-400">
                LIVE STRIKE TELEMETRY
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowLogDrawer(false)}
              className="text-slate-400 hover:text-slate-100 text-xs font-mono"
            >
              [✕]
            </button>
          </div>

          {/* Strikes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 overscroll-contain">
            {filteredStrikes.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                No strikes recorded in current filter window.
              </div>
            ) : (
              filteredStrikes.map((s) => {
                const ageSec = Math.round((Date.now() - s.receivedAt) / 1000);
                const isSelected = selectedStrike?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectAndPan(s)}
                    className={`p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer flex flex-col space-y-1 ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-md'
                        : isCleanLight
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        : 'bg-[#0f172a]/70 border-slate-800 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center space-x-1">
                        <span className={s.strikeType === 'CG' ? 'text-cyan-400' : 'text-amber-400'}>
                          ⚡ {s.strikeType}
                        </span>
                        <span className="text-[10px] text-slate-400">({ageSec}s ago)</span>
                      </span>
                      <span
                        className={`font-extrabold ${
                          Math.abs(s.peakCurrentKA) > 40 ? 'text-red-400' : 'text-amber-300'
                        }`}
                      >
                        {s.peakCurrentKA > 0 ? '+' : ''}
                        {s.peakCurrentKA} kA
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>
                        {s.latitude.toFixed(4)}°N, {s.longitude.toFixed(4)}°E
                      </span>
                      <span>
                        {s.distanceKm}km @ {String(s.bearingDeg).padStart(3, '0')}°
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-2 border-t border-slate-700/40 text-[10px] font-mono text-center text-slate-400 flex items-center justify-between">
            <span>CG: {stats.cgCount} | IC: {stats.icCount}</span>
            <button
              type="button"
              onClick={() => {
                mockLightningDetectionService.clear();
                setStrikes([]);
              }}
              className="text-red-400 hover:underline cursor-pointer"
            >
              Clear Buffer
            </button>
          </div>
        </div>
      )}

      {/* Bottom-Left Coordinate & Cursor HUD */}
      <div
        className={`absolute bottom-3 left-3 z-[1000] px-3.5 py-2 text-[10px] font-mono flex items-center space-x-3 rounded-xl backdrop-blur-xl border shadow-xl ${
          isCleanLight
            ? 'bg-white/90 border-slate-300 text-slate-800'
            : 'bg-[#080e1a]/90 border-cyan-900/60 text-slate-300'
        }`}
      >
        <span>
          RADAR HQ: <strong className="text-emerald-400 font-extrabold">{station.lat.toFixed(4)}°N</strong>,{' '}
          <strong className="text-emerald-400 font-extrabold">{station.lng.toFixed(4)}°E</strong>
        </span>
        <span className="opacity-40">|</span>
        <span>
          CURSOR: <strong className="text-cyan-300 font-extrabold">{cursorPos.lat.toFixed(4)}°N</strong>,{' '}
          <strong className="text-cyan-300 font-extrabold">{cursorPos.lng.toFixed(4)}°E</strong>
        </span>
        <span className="hidden sm:inline opacity-40">|</span>
        <span className="hidden sm:inline text-amber-300 font-bold">
          {filteredStrikes.length} STRIKES PLOTTED
        </span>
      </div>

      {/* Bottom-Right Zoom & Navigation Controls */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center select-none font-mono">
        <div
          className={`p-1.5 flex items-center space-x-1.5 rounded-xl backdrop-blur-xl text-xs border shadow-2xl ${
            isCleanLight
              ? 'bg-white/90 border-slate-300 text-slate-800'
              : 'bg-[#080e1a]/90 border-cyan-900/60 text-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={currentZoom >= 14}
            title="Zoom In (+)"
            className="w-7 h-7 rounded-lg flex items-center justify-center border font-extrabold cursor-pointer transition-colors shadow-xs text-sm bg-cyan-600/30 hover:bg-cyan-500 hover:text-slate-950 border-cyan-500/40 text-cyan-200 disabled:opacity-30"
          >
            +
          </button>
          <div className="px-2 text-[10px] font-extrabold rounded-lg h-7 flex items-center justify-center min-w-[44px] tabular-nums bg-slate-800/60 border border-slate-700 text-cyan-300">
            Z:{String(currentZoom).padStart(2, '0')}
          </div>
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={currentZoom <= 5}
            title="Zoom Out (-)"
            className="w-7 h-7 rounded-lg flex items-center justify-center border font-extrabold cursor-pointer transition-colors shadow-xs text-sm bg-cyan-600/30 hover:bg-cyan-500 hover:text-slate-950 border-cyan-500/40 text-cyan-200 disabled:opacity-30"
          >
            &minus;
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Center Radar HQ"
            className="px-2.5 h-7 rounded-lg flex items-center justify-center bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider cursor-pointer border border-cyan-300 shadow-md transition-colors"
          >
            HQ
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen Map (Esc)' : 'Expand Map for Fullscreen View'}
            className="px-2.5 h-7 rounded-lg flex items-center justify-center font-extrabold cursor-pointer transition-all shadow-md text-[10px] uppercase tracking-wider border bg-cyan-600/30 hover:bg-cyan-500 hover:text-slate-950 border-cyan-400/50 text-cyan-200"
          >
            {isFullscreen ? (
              <div className="flex items-center space-x-1">
                <Minimize2 className="w-3 h-3" />
                <span>Exit</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <Maximize2 className="w-3 h-3" />
                <span>Expand</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
