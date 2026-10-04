/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { INDIAN_MET_STATIONS } from './data/stations';
import {
  AIBulletinResponse,
  CityWeatherData,
  NowcastStep,
  RadarTileResponse,
  StationInfo,
} from './types/weather';
import {
  MAJOR_IMD_STATIONS,
  fetchLiveStationWeatherData,
  fetchRainViewerLiveTimestamp,
} from './services/liveApi';
import { AtmosphericBackdrop } from './components/AtmosphericBackdrop';
import { WeatherHeroHeader } from './components/WeatherHeroHeader';
import { HourlyForecastStrip } from './components/HourlyForecastStrip';
import { TenDayForecastCard } from './components/TenDayForecastCard';
import { BentoTelemetryGrid } from './components/BentoTelemetryGrid';
import { RadarMap } from './components/RadarMap';
import { LightningStrikeMap } from './components/LightningStrikeMap';
import { ThreatIndexCard } from './components/ThreatIndexCard';
import { SurfaceTelemetryGrid } from './components/SurfaceTelemetryGrid';
import { AIBulletinTeletype } from './components/AIBulletinTeletype';
import { NowcastScrubber } from './components/NowcastScrubber';
import { RadarMosaicView } from './components/RadarMosaicView';
import { SatelliteView } from './components/SatelliteView';
import { BulletinsArchiveView } from './components/BulletinsArchiveView';
import { DataSourceDashboard } from './components/DataSourceDashboard';
import { NowcastingHorizonView } from './components/NowcastingHorizonView';
import { ApiDataSourceConfig } from './components/ApiDataSourceConfig';
import { UserAuthModal } from './components/UserAuthModal';
import { authService } from './services/auth/authService';
import { AppUser } from './types/user';
import { DataSourceRegistry, DataRegistryStatus } from './services/weather/dataSourceRegistry';
import { IngestedMultiSourceBundle } from './types/nowcast';
import { DataSourceStatus } from './types/dataSource';
import { exportNowcastBulletinPdf } from './utils/exportPdf';
import {
  FileDown,
  RefreshCw,
  Search,
  CloudRain,
  Sun,
  Moon,
  Radar,
  Layers,
  FileText,
  Calendar,
  Database,
  KeyRound,
  CheckCircle2,
  Settings,
  X,
  Zap,
  User,
} from 'lucide-react';

type NavTab = 'OVERVIEW' | 'LIGHTNING_MAP' | 'TEN_DAY' | 'RADAR_MOSAIC' | 'SATELLITE' | 'AI_BULLETINS' | 'DATA_SOURCES' | 'CONFIG';
type ThemeMode = 'SAGE_EARTH' | 'MIDNIGHT_GLASS' | 'CLARA_CLEAN';

export default function App() {
  // Sage Earth is set as the active demonstrated theme featuring #59705B, #BBBB9A, #9AAEA3, #E2E2DB
  const [themeMode, setThemeMode] = useState<ThemeMode>('SAGE_EARTH');
  const isSage = themeMode === 'SAGE_EARTH';
  const isCleanLight = themeMode === 'CLARA_CLEAN';

  const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
  const [rainFxEnabled, setRainFxEnabled] = useState<boolean>(true);
  const [showDevPortal, setShowDevPortal] = useState<boolean>(false);
  const [radarMapMode, setRadarMapMode] = useState<'RADAR' | 'LIGHTNING'>('RADAR');

  const [selectedStation, setSelectedStation] = useState<StationInfo>(MAJOR_IMD_STATIONS[0]); // Kolkata DWR default
  const [activeTab, setActiveTab] = useState<NavTab>('OVERVIEW');
  const [weatherData, setWeatherData] = useState<CityWeatherData | null>(null);
  const [radarTiles, setRadarTiles] = useState<RadarTileResponse | null>(null);
  const [bulletin, setBulletin] = useState<AIBulletinResponse | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // SIH26072 Data Ingestion Architecture States
  const dataSourceRegistryRef = React.useRef<DataSourceRegistry>(new DataSourceRegistry());
  const [ingestionMode, setIngestionMode] = useState<'REAL_DATA' | 'DEMO_DATA'>('REAL_DATA');
  const [multiSourceBundle, setMultiSourceBundle] = useState<IngestedMultiSourceBundle | null>(null);
  const [dataRegistryStatuses, setDataRegistryStatuses] = useState<DataRegistryStatus[]>([]);
  const [sourceStatuses, setSourceStatuses] = useState<DataSourceStatus[]>([]);

  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(true);
  const [isLoadingBulletin, setIsLoadingBulletin] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // UTC Clock
  const [utcTime, setUtcTime] = useState<string>('');
  const [nextSweepSeconds, setNextSweepSeconds] = useState<number>(48);

  // Search input state
  const [stationQuery, setStationQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // PDF Export state
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // User Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => authService.getCurrentUser());
  const [showUserModal, setShowUserModal] = useState<boolean>(false);

  useEffect(() => {
    return authService.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
  }, []);

  const handleExportPdf = useCallback(() => {
    if (weatherData) {
      setIsExportingPdf(true);
      try {
        exportNowcastBulletinPdf(weatherData, bulletin?.bulletinBody || bulletin?.rawText);
        setPdfSuccessMessage(`BULLETIN PDF DOWNLOADED (${selectedStation.radarStationCode})`);
        authService.logActivity({
          activityType: 'PDF_EXPORT',
          activityCategory: 'EXPORT',
          description: `Generated meteorological nowcast bulletin PDF for ${selectedStation.name}`,
          stationCode: selectedStation.radarStationCode,
          latitude: selectedStation.lat,
          longitude: selectedStation.lng,
          metadata: { stationName: selectedStation.name },
        });
        setTimeout(() => setPdfSuccessMessage(null), 4000);
      } catch (err: any) {
        console.error('Failed to export bulletin PDF:', err);
      } finally {
        setIsExportingPdf(false);
      }
    }
    window.print();
  }, [weatherData, bulletin, selectedStation]);

  // Update clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for next radar sweep
  useEffect(() => {
    const timer = setInterval(() => {
      setNextSweepSeconds((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Radar Tiles and live timestamp
  const fetchRadarTiles = useCallback(async () => {
    try {
      const res = await fetch('/api/radar/live-tiles');
      if (res.ok) {
        const data = await res.json();
        setRadarTiles(data);
      } else {
        const rvFallback = await fetchRainViewerLiveTimestamp();
        setRadarTiles({
          host: rvFallback.host,
          latestPath: `/v2/radar/${rvFallback.path}`,
          latestTimestamp: rvFallback.timestamp,
          pastFrames: [{ time: rvFallback.timestamp, path: `/v2/radar/${rvFallback.path}` }],
          nowcastFrames: [],
          tileTemplate: `${rvFallback.host}/v2/radar/${rvFallback.path}/256/{z}/{x}/{y}/2/1_1.png`,
          colorPalette: 2,
        });
      }
    } catch (err) {
      console.warn('Radar tiles endpoint note:', err);
      const rvFallback = await fetchRainViewerLiveTimestamp();
      setRadarTiles({
        host: rvFallback.host,
        latestPath: `/v2/radar/${rvFallback.path}`,
        latestTimestamp: rvFallback.timestamp,
        pastFrames: [{ time: rvFallback.timestamp, path: `/v2/radar/${rvFallback.path}` }],
        nowcastFrames: [],
        tileTemplate: `${rvFallback.host}/v2/radar/${rvFallback.path}/256/{z}/{x}/{y}/2/1_1.png`,
        colorPalette: 2,
      });
    }
  }, []);

  // Fetch AI Bulletin
  const fetchAIBulletin = useCallback(async (currentWeather: CityWeatherData, forceRefresh = false) => {
    setIsLoadingBulletin(true);
    try {
      const res = await fetch('/api/v1/ai/generate-bulletin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weatherData: currentWeather, forceRefresh }),
      });
      if (res.ok) {
        const data = await res.json();
        setBulletin(data);
      }
    } catch (err) {
      console.warn('AI bulletin request note:', err);
    } finally {
      setIsLoadingBulletin(false);
    }
  }, []);

  // Fetch Multi-Source Ingestion & Weather Telemetry
  const fetchWeatherData = useCallback(
    async (st: StationInfo, shouldFetchBulletin = true, overrideMode?: 'REAL_DATA' | 'DEMO_DATA') => {
      setIsLoadingWeather(true);
      setErrorMessage(null);

      const activeMode = overrideMode || ingestionMode;
      const registry = dataSourceRegistryRef.current;
      registry.setMode(activeMode);

      try {
        // 1. Ingest from multi-source architecture pipeline
        const bundle = await registry.ingestAll(st.id, st.lat, st.lng);
        setMultiSourceBundle(bundle);
        const statuses = registry.getStatuses(bundle);
        setDataRegistryStatuses(statuses);
        const srcStatuses = registry.getSourceStatuses(bundle);
        setSourceStatuses(srcStatuses);

        // 2. Fetch or synthesize comprehensive UI station telemetry
        let data: CityWeatherData;
        if (activeMode === 'DEMO_DATA') {
          data = await fetchLiveStationWeatherData(st);
        } else {
          const res = await fetch(`/api/weather/live?stationId=${st.id}&lat=${st.lat}&lng=${st.lng}`);
          if (res.ok) {
            data = await res.json();
          } else {
            data = await fetchLiveStationWeatherData(st);
          }
        }
        setWeatherData(data);
        setActiveStepIndex(0);

        // Phase 8: Formatted strictly using source timestamp in IST (e.g. 28 Sep 2026, 21:55 IST)
        const tsObj = bundle.weather.timestamp ? new Date(bundle.weather.timestamp) : new Date();
        const istFormatted = `${tsObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${tsObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`;
        setLastUpdated(istFormatted);

        if (shouldFetchBulletin) {
          fetchAIBulletin(data, false);
        }
      } catch (err: any) {
        console.warn('Network issue fetching live telemetry, querying Open-Meteo directly:', err);
        try {
          const liveDirect = await fetchLiveStationWeatherData(st);
          setWeatherData(liveDirect);
          setActiveStepIndex(0);
          const tsObj = new Date();
          const istFormatted = `${tsObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${tsObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST`;
          setLastUpdated(istFormatted);
          if (shouldFetchBulletin) {
            fetchAIBulletin(liveDirect, false);
          }
        } catch (directErr: any) {
          console.error('Fatal error fetching live telemetry:', directErr);
          setErrorMessage(directErr?.message || 'Failed to fetch meteorological telemetry');
        }
      } finally {
        setIsLoadingWeather(false);
      }
    },
    [ingestionMode, fetchAIBulletin]
  );

  const handleToggleIngestionMode = useCallback(
    (newMode: 'REAL_DATA' | 'DEMO_DATA') => {
      setIngestionMode(newMode);
      dataSourceRegistryRef.current.setMode(newMode);
      fetchWeatherData(selectedStation, false, newMode);
    },
    [selectedStation, fetchWeatherData]
  );

  const handleRefreshAllSources = useCallback(() => {
    fetchWeatherData(selectedStation, false);
    fetchRadarTiles();
  }, [selectedStation, fetchWeatherData, fetchRadarTiles]);

  // Initial mount
  useEffect(() => {
    fetchRadarTiles();
    fetchWeatherData(selectedStation, true);
  }, []);

  // Auto-refresh every 5 minutes (Phase 8 default requirement)
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      fetchWeatherData(selectedStation, false);
      fetchRadarTiles();
    }, 5 * 60 * 1000);
    return () => clearInterval(autoRefreshInterval);
  }, [selectedStation, fetchWeatherData, fetchRadarTiles]);

  // Station change handler
  const handleSelectStation = (st: StationInfo) => {
    setSelectedStation(st);
    setIsSearching(false);
    setStationQuery('');
    fetchWeatherData(st, true);
    authService.logActivity({
      activityType: 'STATION_VIEW',
      activityCategory: 'NAVIGATION',
      description: `Inspected Doppler radar telemetry for ${st.name}`,
      stationCode: st.radarStationCode,
      latitude: st.lat,
      longitude: st.lng,
      metadata: { stationId: st.id, state: st.state },
    });
  };

  // Filtered station list
  const filteredStations = INDIAN_MET_STATIONS.filter(
    (st) =>
      st.name.toLowerCase().includes(stationQuery.toLowerCase()) ||
      st.state.toLowerCase().includes(stationQuery.toLowerCase()) ||
      st.radarStationCode.toLowerCase().includes(stationQuery.toLowerCase())
  );

  const activeStep: NowcastStep =
    weatherData?.nowcast?.[activeStepIndex] || {
      stepIndex: 0,
      timeOffset: 'T+00m',
      label: 'T+00m (ANALYSIS / CURRENT)',
      forecastRain: weatherData?.current.rainRate || 0,
      lightningProb: 50,
      cape: weatherData?.current.cape || 500,
      windGust: weatherData?.current.windGusts || 30,
      temperature: weatherData?.current.temperature || 30,
      humidity: weatherData?.current.relativeHumidity || 70,
      compositeScore: weatherData?.severity.compositeScore || 50,
      stageAlert: weatherData?.severity.stageAlert || 'STAGE_I_NORMAL',
      stageColor: weatherData?.severity.stageColor || 'emerald',
      stormCenterOffsetKm: { dx: 0, dy: 0 },
    };

  const activeSeverity = activeStepIndex === 0 && weatherData
    ? weatherData.severity
    : {
        compositeScore: activeStep.compositeScore,
        stageAlert: activeStep.stageAlert,
        stageName:
          activeStep.stageColor === 'red'
            ? 'IMD STAGE-IV ALERT'
            : activeStep.stageColor === 'orange'
            ? 'IMD STAGE-III ALERT'
            : activeStep.stageColor === 'yellow'
            ? 'IMD STAGE-II WATCH'
            : 'IMD STAGE-I ADVISORY',
        stageColor: activeStep.stageColor,
        alertTitle:
          activeStep.stageColor === 'red'
            ? 'SEVERE SQUALL WARNING'
            : activeStep.stageColor === 'orange'
            ? 'SQUALL & THUNDERSTORM ALERT'
            : activeStep.stageColor === 'yellow'
            ? 'MODERATE CONVECTIVE WATCH'
            : 'NORMAL WEATHER / NO WARNING',
        windThreat:
          activeStep.windGust >= 65
            ? 'CRITICAL'
            : activeStep.windGust >= 50
            ? 'ALERT'
            : activeStep.windGust >= 35
            ? 'WATCH'
            : 'NORMAL',
        lightningThreat:
          activeStep.lightningProb >= 75
            ? 'CRITICAL'
            : activeStep.lightningProb >= 50
            ? 'HIGH'
            : 'LOW',
        precipThreat:
          activeStep.forecastRain >= 30
            ? 'CRITICAL'
            : activeStep.forecastRain >= 18
            ? 'ALERT'
            : activeStep.forecastRain >= 4
            ? 'WATCH'
            : 'NORMAL',
      } as const;

  return (
    <div
      className={`min-h-screen relative flex flex-col font-sans antialiased selection:bg-[#59705B] selection:text-[#E2E2DB] transition-colors duration-300 ${
        isSage
          ? 'bg-[#E2E2DB] text-[#59705B]'
          : isCleanLight
          ? 'bg-slate-50 text-slate-900'
          : 'bg-[#091528] text-slate-100'
      }`}
    >
      {/* 1. Atmospheric Raindrop Window Condensation Backdrop with SAGE_EARTH support */}
      <AtmosphericBackdrop
        themeMode={themeMode}
        isCleanLight={isCleanLight}
        rainEffectEnabled={rainFxEnabled}
      />

      {/* 2. Top Navigation Bar (Header) - Uses #59705B background in SAGE_EARTH with #E2E2DB and #9AAEA3 */}
      <header
        className={`sticky top-0 z-40 px-4 sm:px-6 py-3.5 backdrop-blur-2xl transition-all border-b ${
          isSage
            ? 'bg-[#59705B] border-[#9AAEA3]/50 text-[#E2E2DB] shadow-md'
            : isCleanLight
            ? 'bg-white/85 border-sky-200/90 shadow-sm text-slate-800'
            : 'bg-[#091528]/85 border-white/10 shadow-lg text-white'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Zone 1: Wordmark & Logo */}
          <div className="flex items-center space-x-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${
                isSage
                  ? 'bg-[#E2E2DB] text-[#59705B]'
                  : 'bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_0_15px_rgba(56,189,248,0.5)]'
              }`}
            >
              <CloudRain className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight font-sans">
                AstraCast{' '}
                <span
                  className={
                    isSage
                      ? 'font-light text-[#BBBB9A]'
                      : 'font-light text-sky-400'
                  }
                >
                  Nowcast
                </span>
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                activeTab === 'OVERVIEW'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isSage
                  ? 'text-[#E2E2DB] hover:bg-[#9AAEA3]/25'
                  : isCleanLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('LIGHTNING_MAP')}
              className={`cursor-pointer px-3 py-1.5 rounded-xl transition-all font-medium flex items-center space-x-1.5 ${
                activeTab === 'LIGHTNING_MAP'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40 shadow-sm'
                  : isSage
                  ? 'text-[#E2E2DB] hover:bg-[#9AAEA3]/25'
                  : isCleanLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400 fill-current" />
              <span>Lightning Map</span>
            </button>
            <button
              onClick={() => setActiveTab('RADAR_MOSAIC')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                activeTab === 'RADAR_MOSAIC'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isSage
                  ? 'text-[#E2E2DB] hover:bg-[#9AAEA3]/25'
                  : isCleanLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Doppler Radar
            </button>
            <button
              onClick={() => setActiveTab('SATELLITE')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                activeTab === 'SATELLITE'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isSage
                  ? 'text-[#E2E2DB] hover:bg-[#9AAEA3]/25'
                  : isCleanLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setActiveTab('AI_BULLETINS')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                activeTab === 'AI_BULLETINS'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isSage
                  ? 'text-[#E2E2DB] hover:bg-[#9AAEA3]/25'
                  : isCleanLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              AI Nowcast
            </button>
            <button
              onClick={() => setActiveTab('TEN_DAY')}
              className={`cursor-pointer px-3.5 py-1.5 rounded-xl transition-all font-medium ${
                activeTab === 'TEN_DAY'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] font-bold shadow-xs'
                    : isCleanLight
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-white/15 text-white shadow-sm'
                  : isSage
                  ? 'text-[#E2E2DB] hover:bg-[#9AAEA3]/25'
                  : isCleanLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              10-Day Outlook
            </button>
          </nav>

          {/* Zone 3: Actions (Search Station, Condensation Toggle, Palette Guide, Theme, Export PDF) */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Station Search Modal Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsSearching(!isSearching)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border ${
                  isSage
                    ? 'bg-[#E2E2DB]/15 border-[#9AAEA3]/60 text-[#E2E2DB] hover:bg-[#E2E2DB]/25'
                    : isCleanLight
                    ? 'bg-sky-50/80 border-sky-300 text-slate-800 hover:bg-sky-100'
                    : 'bg-white/5 border-white/15 text-white hover:bg-white/10'
                }`}
              >
                <Search className={`w-3.5 h-3.5 ${isSage ? 'text-[#BBBB9A]' : 'text-sky-400'}`} />
                <span className="truncate max-w-[90px] sm:max-w-[120px]">
                  {selectedStation.name.replace(' DWR', '').replace(' (Alipore)', '').replace(' (Palam HQ)', '').replace(' (Borjhar)', '').replace(' (Colaba)', '')}
                </span>
              </button>

              {/* Autocomplete Dropdown */}
              {isSearching && (
                <div
                  className={`absolute right-0 top-full mt-2 w-72 sm:w-80 p-2.5 z-[2500] rounded-2xl backdrop-blur-2xl shadow-2xl border ${
                    isSage
                      ? 'bg-[#E2E2DB] border-[#9AAEA3] text-[#59705B]'
                      : isCleanLight
                      ? 'bg-white/95 border-sky-200 text-slate-800'
                      : 'bg-[#0f1f38]/95 border-white/15 text-white'
                  }`}
                >
                  <input
                    type="text"
                    placeholder="Search Indian station..."
                    value={stationQuery}
                    onChange={(e) => setStationQuery(e.target.value)}
                    autoFocus
                    className={`w-full px-3 py-2 mb-2 text-xs rounded-xl outline-none font-medium border ${
                      isSage
                        ? 'bg-white/80 border-[#9AAEA3] text-[#59705B] placeholder:text-[#59705B]/50'
                        : isCleanLight
                        ? 'bg-sky-50/60 border-sky-200 text-slate-800 placeholder:text-slate-400'
                        : 'bg-black/30 border-white/10 text-white placeholder:text-slate-400'
                    }`}
                  />
                  <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                    {filteredStations.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => handleSelectStation(st)}
                        className={`px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors flex items-center justify-between ${
                          st.id === selectedStation.id
                            ? isSage
                              ? 'bg-[#59705B] text-[#E2E2DB] font-bold'
                              : 'bg-sky-500 text-white font-bold'
                            : isSage
                            ? 'hover:bg-[#9AAEA3]/30 text-[#59705B]'
                            : isCleanLight
                            ? 'hover:bg-sky-50 text-slate-700'
                            : 'hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{st.name}</div>
                          <div className="text-[10px] opacity-75 font-mono">
                            {st.state} • {st.radarStationCode}
                          </div>
                        </div>
                        <span className="text-[10px] opacity-60 font-mono">
                          {st.lat.toFixed(1)}°N
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Rain FX Toggle */}
            <button
              onClick={() => setRainFxEnabled(!rainFxEnabled)}
              title={rainFxEnabled ? 'Disable window rain condensation effect' : 'Enable window rain condensation effect'}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                rainFxEnabled
                  ? isSage
                    ? 'bg-[#E2E2DB]/25 border-[#BBBB9A] text-[#E2E2DB]'
                    : isCleanLight
                    ? 'bg-sky-100 border-sky-300 text-sky-700'
                    : 'bg-sky-500/25 border-sky-400 text-sky-300'
                  : isSage
                  ? 'bg-black/10 border-transparent text-[#E2E2DB]/50'
                  : isCleanLight
                  ? 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              <CloudRain className="w-3.5 h-3.5" />
            </button>

            {/* 3-Way Theme Switcher (Sage Mineral -> Midnight Glass -> Clara Clean) */}
            <button
              onClick={() => {
                if (themeMode === 'SAGE_EARTH') setThemeMode('MIDNIGHT_GLASS');
                else if (themeMode === 'MIDNIGHT_GLASS') setThemeMode('CLARA_CLEAN');
                else setThemeMode('SAGE_EARTH');
              }}
              title="Cycle Theme: Sage Mineral (#59705B) -> Midnight Glass -> Clara Clean"
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                isSage
                  ? 'bg-[#E2E2DB] text-[#59705B] border-[#BBBB9A] shadow-xs'
                  : isCleanLight
                  ? 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
                  : 'bg-white/5 border-white/15 text-sky-300 hover:bg-white/10'
              }`}
            >
              {isSage ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#59705B] border border-[#BBBB9A]"></span>
                  <span className="hidden sm:inline">Sage Earth</span>
                </>
              ) : isCleanLight ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Clara Clean</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-300" />
                  <span className="hidden sm:inline">Midnight</span>
                </>
              )}
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              disabled={!weatherData || isExportingPdf}
              title="Export Official IMD Meteorological Nowcast Bulletin PDF"
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 sm:px-3.5 py-1.5 rounded-xl shadow-md cursor-pointer transition-all disabled:opacity-50 ${
                isSage
                  ? 'bg-[#BBBB9A] hover:bg-[#a8a885] text-[#59705B] border border-[#E2E2DB]/50'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white'
              }`}
            >
              <FileDown className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isExportingPdf ? 'Generating...' : 'Export PDF'}</span>
            </button>

            {/* Operator Account & Login Button */}
            <button
              onClick={() => setShowUserModal(true)}
              title={currentUser ? `Operator: ${currentUser.name} (${currentUser.role})` : 'Operator Login / Account'}
              className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border shadow-xs cursor-pointer transition-all ${
                currentUser
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] border-[#BBBB9A]'
                    : isCleanLight
                    ? 'bg-sky-100 text-sky-800 border-sky-300'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : isSage
                  ? 'bg-[#E2E2DB]/15 border-[#9AAEA3]/60 text-[#E2E2DB] hover:bg-[#E2E2DB]/25'
                  : isCleanLight
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-white/5 border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
              </span>
              {currentUser && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Major Stations Fast-Switch Bar */}
      <div
        className={`px-4 sm:px-6 py-2 backdrop-blur-xl border-b transition-all text-xs select-none ${
          isSage
            ? 'bg-[#E2E2DB]/95 border-[#9AAEA3]/50 text-[#59705B]'
            : isCleanLight
            ? 'bg-sky-50/50 border-sky-200/80 text-slate-700'
            : 'bg-[#081324]/60 border-white/5 text-slate-300'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto gap-2">
          <div className="flex items-center space-x-2 shrink-0">
            <span
              className={`font-mono text-[11px] uppercase hidden md:inline font-bold ${
                isSage ? 'text-[#59705B]/70' : 'text-slate-400'
              }`}
            >
              Doppler Hubs:
            </span>
            {MAJOR_IMD_STATIONS.map((station) => {
              const isSelected = selectedStation.id === station.id;
              const shortName = station.name
                .replace(' DWR', '')
                .replace(' (Alipore)', '')
                .replace(' (Palam HQ)', '')
                .replace(' (Borjhar)', '')
                .replace(' (Colaba)', '')
                .replace(' (Meenambakkam)', '');

              return (
                <button
                  key={station.id}
                  onClick={() => handleSelectStation(station)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isSelected
                      ? isSage
                        ? 'bg-[#59705B] text-[#E2E2DB] shadow-xs font-bold border border-[#BBBB9A]'
                        : 'bg-sky-500 text-white shadow-xs font-semibold'
                      : isSage
                      ? 'bg-white/80 hover:bg-[#9AAEA3]/30 text-[#59705B] border border-[#9AAEA3]/60'
                      : isCleanLight
                      ? 'bg-white/80 hover:bg-sky-100 text-slate-700 border border-sky-200/60'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                  }`}
                >
                  {shortName}
                </button>
              );
            })}
          </div>

          {/* Clean Human-Readable Feed Status Badges */}
          <div className="hidden xl:flex items-center space-x-2 text-xs shrink-0">
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Surface: {ingestionMode === 'DEMO_DATA' ? 'Demo' : 'Live'}</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold text-[11px] border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <span>Radar: {ingestionMode === 'DEMO_DATA' ? 'Demo' : 'Live'}</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold text-[11px] border border-purple-500/30">
              <span>Nowcast: Live</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[11px] border border-amber-500/30">
              <span>Lightning: {ingestionMode === 'DEMO_DATA' ? 'Demo' : 'Estimated'}</span>
            </span>
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-500/15 text-slate-500 dark:text-slate-400 font-medium text-[11px] border border-slate-500/20">
              <span>Satellite: {ingestionMode === 'DEMO_DATA' ? 'Demo' : 'Unavailable'}</span>
            </span>
          </div>

          <div
            className={`hidden lg:flex items-center space-x-4 text-xs font-mono shrink-0 ${
              isSage ? 'text-[#59705B]/80' : 'text-slate-400'
            }`}
          >
            <span>{utcTime || '00:00:00 UTC'}</span>
            <span>·</span>
            <button
              onClick={() => fetchWeatherData(selectedStation)}
              className={`flex items-center space-x-1 cursor-pointer font-bold ${
                isSage ? 'text-[#59705B] hover:text-[#59705B]/70' : 'text-sky-400 hover:text-sky-300'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingWeather ? 'animate-spin' : ''}`} />
              <span>Sync {lastUpdated}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PDF Export Banner */}
      {pdfSuccessMessage && (
        <div
          className={`text-xs px-4 py-2 flex items-center justify-between border-b z-30 ${
            isSage
              ? 'bg-[#59705B] text-[#E2E2DB] border-[#BBBB9A]'
              : 'bg-emerald-900/90 text-emerald-100 border-emerald-500'
          }`}
        >
          <span className="font-semibold">{pdfSuccessMessage}</span>
          <button
            onClick={() => setPdfSuccessMessage(null)}
            className="uppercase font-bold text-[10px] cursor-pointer hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6 relative z-10">
        {isLoadingWeather && !weatherData ? (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center space-y-3">
            <div
              className={`w-8 h-8 border-3 rounded-full animate-spin ${
                isSage
                  ? 'border-[#59705B] border-t-transparent'
                  : 'border-sky-400 border-t-transparent'
              }`}
            ></div>
            <div className="text-sm font-semibold tracking-wide">
              Loading Live Weather & Radar for {selectedStation.name}...
            </div>
          </div>
        ) : errorMessage && !weatherData ? (
          <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center space-y-3 text-rose-500">
            <div className="text-base font-bold">Meteorological Feed Unavailable</div>
            <div className="text-xs max-w-md text-center text-slate-500">{errorMessage}</div>
            <button
              onClick={() => fetchWeatherData(selectedStation)}
              className="bg-[#59705B] hover:bg-[#4a5e4c] text-[#E2E2DB] px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : weatherData ? (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'OVERVIEW' && (
              <div className="space-y-6">
                {/* 1. Weather Hero Banner (City, Massive Temp, H/L, RealFeel) */}
                <WeatherHeroHeader
                  station={weatherData.station}
                  current={weatherData.current}
                  todayDaily={weatherData.dailyForecast?.[0]}
                  isCleanLight={isCleanLight}
                  isSage={isSage}
                  tempUnit={tempUnit}
                  onToggleTempUnit={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
                  nextSweepSeconds={nextSweepSeconds}
                />

                {/* 2. Hourly Forecast Carousel */}
                {weatherData.hourlyForecast && weatherData.hourlyForecast.length > 0 && (
                  <HourlyForecastStrip
                    hourly={weatherData.hourlyForecast}
                    isCleanLight={isCleanLight}
                    isSage={isSage}
                    summaryText="Convective shower activity continuing · Squall cells drifting eastward"
                  />
                )}

                {/* 3. Main Split View: Doppler Radar & Convective Outlook (Left) + Threat Index & AI Bulletin (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Interactive Radar Map + 10-Day Outlook */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Live Doppler Radar / Lightning Strike Map Card */}
                    <div className="space-y-2">
                      {/* Mode Switcher Tabs */}
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center space-x-1.5 p-1 rounded-xl backdrop-blur-xl border border-white/10 bg-black/20 text-xs font-mono">
                          <button
                            type="button"
                            onClick={() => setRadarMapMode('RADAR')}
                            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                              radarMapMode === 'RADAR'
                                ? isSage
                                  ? 'bg-[#59705B] text-[#F7FCF5] shadow-xs'
                                  : isCleanLight
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : 'bg-emerald-600 text-white shadow-sm'
                                : isSage
                                ? 'text-[#59705B] hover:bg-[#9AAEA3]/20'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <Radar className="w-3.5 h-3.5" />
                            <span>Doppler Radar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRadarMapMode('LIGHTNING')}
                            className={`px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                              radarMapMode === 'LIGHTNING'
                                ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-md border border-cyan-300'
                                : isSage
                                ? 'text-[#59705B] hover:bg-[#9AAEA3]/20'
                                : 'text-slate-400 hover:text-cyan-300'
                            }`}
                          >
                            <Zap className="w-3.5 h-3.5 fill-current text-cyan-400" />
                            <span>⚡ Real-Time Lightning Map</span>
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                          </button>
                        </div>

                        {radarMapMode === 'LIGHTNING' && (
                          <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-cyan-400">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                            <span>MOCK LDS SENSOR STREAM ACTIVE</span>
                          </div>
                        )}
                      </div>

                      {radarMapMode === 'RADAR' ? (
                        <RadarMap
                          weatherData={weatherData}
                          activeStep={activeStep}
                          radarTiles={radarTiles}
                          activeTab={activeTab}
                          isCleanLight={isCleanLight || isSage}
                        />
                      ) : (
                        <LightningStrikeMap
                          weatherData={weatherData}
                          activeStep={activeStep}
                          radarTiles={radarTiles}
                          activeTab={activeTab}
                          isCleanLight={isCleanLight || isSage}
                        />
                      )}

                      {/* Radar Meta Strip */}
                      <div
                        className={`p-3 rounded-xl flex items-center justify-between text-xs font-mono select-none backdrop-blur-xl border ${
                          isSage
                            ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B]'
                            : isCleanLight
                            ? 'bg-white/80 border-sky-200/80 text-slate-700'
                            : 'bg-[#0f1f38]/60 border-white/10 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3 sm:space-x-5">
                          <span>
                            SCAN:{' '}
                            <strong className={isSage ? 'text-[#59705B]' : isCleanLight ? 'text-slate-900' : 'text-white'}>
                              04m 12s
                            </strong>
                          </span>
                          <span className="hidden sm:inline">
                            INTEGRITY:{' '}
                            <strong className={isSage ? 'text-[#59705B]' : 'text-emerald-500'}>
                              {weatherData.radarScanMeta.dataIntegrity}
                            </strong>
                          </span>
                          <span className="hidden md:inline">
                            RES:{' '}
                            <strong className={isSage ? 'text-[#59705B]' : isCleanLight ? 'text-slate-900' : 'text-white'}>
                              {weatherData.radarScanMeta.azimuthRes}
                            </strong>
                          </span>
                        </div>
                        <div>
                          <span>
                            NEXT SWEEP:{' '}
                            <strong className={isSage ? 'text-[#59705B] font-bold' : 'text-sky-400 font-bold'}>
                              {nextSweepSeconds}s
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 10-Day Convective Outlook with Gradient Range Bars */}
                    {weatherData.dailyForecast && weatherData.dailyForecast.length > 0 && (
                      <TenDayForecastCard
                        daily={weatherData.dailyForecast}
                        currentTemp={Math.round(weatherData.current.temperature)}
                        isCleanLight={isCleanLight}
                        isSage={isSage}
                      />
                    )}
                  </div>

                  {/* Right Column: Threat Index + Surface AWS Obs + AI Bulletin */}
                  <div className="lg:col-span-4 space-y-6">
                    {/* Threat Index Card */}
                    <ThreatIndexCard
                      severity={activeSeverity}
                      isCleanLight={isCleanLight}
                      isSage={isSage}
                    />

                    {/* AI Nowcast Teletype */}
                    <AIBulletinTeletype
                      weatherData={weatherData}
                      bulletin={bulletin}
                      isLoading={isLoadingBulletin}
                      onRegenerate={() => fetchAIBulletin(weatherData, true)}
                      isCleanLight={isCleanLight}
                      isSage={isSage}
                    />

                    {/* Surface AWS Telemetry */}
                    <div className="rounded-2xl overflow-hidden shadow-lg">
                      <SurfaceTelemetryGrid
                        station={weatherData.station}
                        current={weatherData.current}
                        activeStep={activeStep}
                        isCleanLight={isCleanLight}
                        isSage={isSage}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Apple Weather Bento Grid: 12 Detailed Meteorological Cards */}
                <div className="pt-2">
                  <div
                    className={`text-xs uppercase tracking-wider font-extrabold font-mono mb-3 px-1 ${
                      isSage ? 'text-[#59705B]' : 'text-slate-400'
                    }`}
                  >
                    METEOROLOGICAL TELEMETRY & CONDITIONS
                  </div>
                  <BentoTelemetryGrid
                    current={weatherData.current}
                    todayDaily={weatherData.dailyForecast?.[0]}
                    sunMoon={weatherData.sunMoon}
                    airQuality={weatherData.airQuality}
                    isCleanLight={isCleanLight}
                    isSage={isSage}
                  />
                </div>

                {/* 5. 0-3 Hour Scrubber */}
                {weatherData.nowcast && weatherData.nowcast.length > 0 && (
                  <div className="pt-2">
                    <NowcastScrubber
                      nowcastSteps={weatherData.nowcast}
                      activeStepIndex={activeStepIndex}
                      onSelectStep={(idx) => setActiveStepIndex(idx)}
                      isCleanLight={isCleanLight}
                      isSage={isSage}
                    />
                  </div>
                )}

                {/* 5b. Short-Term Nowcasting 15/30/45/60 Min Timeline Horizon */}
                {multiSourceBundle?.nowcast && (
                  <div className="pt-2">
                    <NowcastingHorizonView
                      nowcast={multiSourceBundle.nowcast}
                      isCleanLight={isCleanLight}
                      isSage={isSage}
                    />
                  </div>
                )}

                {/* 6. Phase 13: Data Ingestion Architecture & Provider Matrix */}
                <div className="pt-2">
                  <DataSourceDashboard
                    sourceStatuses={sourceStatuses.length > 0 ? sourceStatuses : dataSourceRegistryRef.current.getSourceStatuses(multiSourceBundle)}
                    mode={ingestionMode}
                    onToggleMode={handleToggleIngestionMode}
                    onRefresh={handleRefreshAllSources}
                    isLoading={isLoadingWeather}
                    lastUpdatedText={lastUpdated || '28 Sep 2026, 21:55 IST'}
                    isSage={isSage}
                    isCleanLight={isCleanLight}
                    onNavigateToConfig={() => setActiveTab('CONFIG')}
                  />
                </div>
              </div>
            )}

            {/* DATA SOURCES TAB (Phase 13 Dedicated Dashboard) */}
            {activeTab === 'DATA_SOURCES' && (
              <div className="space-y-6">
                <DataSourceDashboard
                  sourceStatuses={sourceStatuses.length > 0 ? sourceStatuses : dataSourceRegistryRef.current.getSourceStatuses(multiSourceBundle)}
                  mode={ingestionMode}
                  onToggleMode={handleToggleIngestionMode}
                  onRefresh={handleRefreshAllSources}
                  isLoading={isLoadingWeather}
                  lastUpdatedText={lastUpdated || '28 Sep 2026, 21:55 IST'}
                  isSage={isSage}
                  isCleanLight={isCleanLight}
                  onNavigateToConfig={() => setActiveTab('CONFIG')}
                />

                {/* Additional Architectural Information & Evaluation Guide */}
                <div className={`p-6 rounded-3xl backdrop-blur-2xl border font-mono text-xs ${
                  isSage
                    ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B]'
                    : isCleanLight
                    ? 'bg-white/80 border-sky-200 text-slate-800'
                    : 'bg-[#0f1f38]/60 border-white/10 text-slate-300'
                }`}>
                  <h3 className="text-sm font-extrabold uppercase mb-3 flex items-center space-x-2">
                    <Database className="w-4 h-4 text-emerald-500" />
                    <span>MULTI-SOURCE INGESTION ARCHITECTURE SPECIFICATION</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="font-bold border-b pb-1 opacity-90">DATA QUALITY TIERS & STATUSES</div>
                      <ul className="space-y-1 text-[11px] list-disc list-inside opacity-80">
                        <li><strong className="text-emerald-500">LIVE:</strong> High-resolution telemetry actively validated via live API.</li>
                        <li><strong className="text-sky-500">RECENT:</strong> Observations within valid forecast persistence horizon (&lt;15m).</li>
                        <li><strong className="text-amber-500">DEMO:</strong> Synthetic evaluation datasets for offline verification testing.</li>
                        <li><strong className="text-rose-500">NOT CONFIGURED:</strong> Restricted endpoints requiring institutional credentials.</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold border-b pb-1 opacity-90">BACKEND & STORAGE INTEGRATION</div>
                      <p className="text-[11px] opacity-80">
                        Normalized schemas prepared for PostgreSQL / Supabase storage (7 tables with geo-indexes). Sensitive API credentials safely isolated on backend server routes (`/api/weather/*`, `/api/radar/*`, `/api/data-sources`).
                      </p>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Auto-Refresh: Configured every 5 minutes • Current Station: {selectedStation.name}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* API & DATA SOURCE CONFIGURATION TAB */}
            {activeTab === 'CONFIG' && (
              <div className="space-y-6">
                <ApiDataSourceConfig
                  isSage={isSage}
                  isCleanLight={isCleanLight}
                  onRefreshTelemetry={() => fetchWeatherData(selectedStation, false)}
                />
              </div>
            )}

            {/* 10-DAY EXTENDED OUTLOOK TAB */}
            {activeTab === 'TEN_DAY' && (
              <div className="space-y-6">
                <WeatherHeroHeader
                  station={weatherData.station}
                  current={weatherData.current}
                  todayDaily={weatherData.dailyForecast?.[0]}
                  isCleanLight={isCleanLight}
                  isSage={isSage}
                  tempUnit={tempUnit}
                  onToggleTempUnit={() => setTempUnit(tempUnit === 'C' ? 'F' : 'C')}
                  nextSweepSeconds={nextSweepSeconds}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8">
                    {weatherData.dailyForecast && (
                      <TenDayForecastCard
                        daily={weatherData.dailyForecast}
                        currentTemp={Math.round(weatherData.current.temperature)}
                        isCleanLight={isCleanLight}
                        isSage={isSage}
                      />
                    )}
                  </div>
                  <div className="lg:col-span-4 space-y-6">
                    <ThreatIndexCard
                      severity={activeSeverity}
                      isCleanLight={isCleanLight}
                      isSage={isSage}
                    />
                    <AIBulletinTeletype
                      weatherData={weatherData}
                      bulletin={bulletin}
                      isLoading={isLoadingBulletin}
                      onRegenerate={() => fetchAIBulletin(weatherData, true)}
                      isCleanLight={isCleanLight}
                      isSage={isSage}
                    />
                  </div>
                </div>

                <BentoTelemetryGrid
                  current={weatherData.current}
                  todayDaily={weatherData.dailyForecast?.[0]}
                  sunMoon={weatherData.sunMoon}
                  airQuality={weatherData.airQuality}
                  isCleanLight={isCleanLight}
                  isSage={isSage}
                />
              </div>
            )}

            {/* DEDICATED REAL-TIME LIGHTNING STRIKE MAP TAB */}
            {activeTab === 'LIGHTNING_MAP' && (
              <div className="space-y-6">
                <div
                  className={`p-4 rounded-2xl border backdrop-blur-xl flex flex-wrap items-center justify-between gap-4 ${
                    isSage
                      ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B]'
                      : isCleanLight
                      ? 'bg-white/95 border-slate-200 text-slate-800'
                      : 'bg-[#080e1a]/90 border-cyan-900/60 text-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold font-mono tracking-tight flex items-center space-x-2">
                        <span>Real-Time Lightning Strike Coordinates Map</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-400/40">
                          Mock LDS Active
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        High-precision coordinate overlay for Cloud-to-Ground (CG) and Intra-Cloud (IC) electrical discharges with peak current (kA) telemetry.
                      </p>
                    </div>
                  </div>
                </div>

                <LightningStrikeMap
                  weatherData={weatherData}
                  activeStep={activeStep}
                  radarTiles={radarTiles}
                  activeTab={activeTab}
                  isCleanLight={isCleanLight || isSage}
                />
              </div>
            )}

            {/* RADAR MOSAIC TAB */}
            {activeTab === 'RADAR_MOSAIC' && (
              <RadarMosaicView
                onSelectStation={(st) => {
                  handleSelectStation(st);
                  setActiveTab('OVERVIEW');
                }}
                currentStationId={selectedStation.id}
                isCleanLight={isCleanLight || isSage}
              />
            )}

            {/* SATELLITE TAB */}
            {activeTab === 'SATELLITE' && (
              <SatelliteView station={selectedStation} isCleanLight={isCleanLight || isSage} />
            )}

            {/* AI BULLETINS ARCHIVE TAB */}
            {activeTab === 'AI_BULLETINS' && (
              <BulletinsArchiveView
                currentBulletin={bulletin}
                weatherData={weatherData}
                onRefreshBulletin={() => fetchAIBulletin(weatherData, true)}
                isLoading={isLoadingBulletin}
                onExportPdf={handleExportPdf}
                isCleanLight={isCleanLight || isSage}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Professional AstraCast Footer */}
      <footer
        className={`max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 border-t mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium pb-24 md:pb-6 ${
          isSage
            ? 'border-[#9AAEA3]/40 text-[#59705B]/80'
            : isCleanLight
            ? 'border-slate-200 text-slate-500'
            : 'border-white/10 text-slate-400'
        }`}
      >
        <div className="flex items-center space-x-2">
          <CloudRain className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-700 dark:text-slate-200">AstraCast Nowcast Terminal</span>
          <span>·</span>
          <span>Severe Weather Intelligence Platform</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className={`w-2 h-2 rounded-full ${ingestionMode === 'REAL_DATA' ? 'bg-emerald-500' : 'bg-purple-500'}`}></span>
            <span>{ingestionMode === 'REAL_DATA' ? 'Live Telemetry' : 'Demo Mode Active'}</span>
          </span>
          <span>·</span>
          <button
            onClick={() => setShowDevPortal(true)}
            className="hover:underline cursor-pointer flex items-center space-x-1 text-slate-600 dark:text-slate-400 hover:text-sky-400"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Developer Settings</span>
          </button>
        </div>
      </footer>

      {/* Developer & Admin Configuration Modal */}
      {showDevPortal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#081324] border border-white/20 shadow-2xl p-6 sm:p-8 text-white space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight">Developer & System Administration</h2>
                  <p className="text-xs text-slate-400">Connection verification probes, credential management, and diagnostics</p>
                </div>
              </div>
              <button
                onClick={() => setShowDevPortal(false)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all"
                aria-label="Close Developer Portal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ApiDataSourceConfig
              isSage={isSage}
              isCleanLight={isCleanLight}
              onRefreshTelemetry={() => fetchWeatherData(selectedStation, false)}
            />
          </div>
        </div>
      )}

      {/* Operator Account & Activity Telemetry Modal */}
      <UserAuthModal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        currentUser={currentUser}
        currentStationName={selectedStation.name}
        isSage={isSage}
        isCleanLight={isCleanLight}
        onUserChange={setCurrentUser}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-2xl flex items-center justify-around p-2 text-[10px] font-semibold select-none ${
          isSage
            ? 'bg-[#E2E2DB]/95 border-[#9AAEA3]/50 text-[#59705B]'
            : isCleanLight
            ? 'bg-white/95 border-sky-200/80 text-slate-700'
            : 'bg-[#091528]/95 border-white/10 text-slate-300'
        }`}
      >
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`flex flex-col items-center space-y-1 px-2.5 py-1 rounded-xl ${
            activeTab === 'OVERVIEW'
              ? isSage
                ? 'text-[#BBBB9A] font-bold'
                : 'text-sky-400 font-bold'
              : ''
          }`}
        >
          <CloudRain className="w-4 h-4" />
          <span>Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('LIGHTNING_MAP')}
          className={`flex flex-col items-center space-y-1 px-2.5 py-1 rounded-xl ${
            activeTab === 'LIGHTNING_MAP'
              ? isSage
                ? 'text-[#BBBB9A] font-bold'
                : 'text-cyan-400 font-bold'
              : ''
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Lightning</span>
        </button>
        <button
          onClick={() => setActiveTab('RADAR_MOSAIC')}
          className={`flex flex-col items-center space-y-1 px-2.5 py-1 rounded-xl ${
            activeTab === 'RADAR_MOSAIC'
              ? isSage
                ? 'text-[#BBBB9A] font-bold'
                : 'text-sky-400 font-bold'
              : ''
          }`}
        >
          <Radar className="w-4 h-4" />
          <span>Radar</span>
        </button>
        <button
          onClick={() => setActiveTab('SATELLITE')}
          className={`flex flex-col items-center space-y-1 px-2.5 py-1 rounded-xl ${
            activeTab === 'SATELLITE'
              ? isSage
                ? 'text-[#BBBB9A] font-bold'
                : 'text-sky-400 font-bold'
              : ''
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Satellite</span>
        </button>
        <button
          onClick={() => setActiveTab('AI_BULLETINS')}
          className={`flex flex-col items-center space-y-1 px-2.5 py-1 rounded-xl ${
            activeTab === 'AI_BULLETINS'
              ? isSage
                ? 'text-[#BBBB9A] font-bold'
                : 'text-sky-400 font-bold'
              : ''
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>AI Nowcast</span>
        </button>
        <button
          onClick={() => setShowUserModal(true)}
          className="flex flex-col items-center space-y-1 px-2.5 py-1 rounded-xl cursor-pointer"
        >
          <User className="w-4 h-4 text-emerald-400" />
          <span className="font-bold">{currentUser ? 'Account' : 'Sign In'}</span>
        </button>
      </nav>
    </div>
  );
}
