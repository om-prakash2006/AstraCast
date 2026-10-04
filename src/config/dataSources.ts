/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Real Data Source Configuration
 *
 * NOTE: Credentials must never be hard-coded.
 * Configure real API URLs and keys via environment variables or server proxy.
 */

import { DataSourceStatus } from '../types/dataSource';

// Read client environment variables safely
const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string>);

export const DATA_SOURCE_CONFIG = {
  // Weather API (Open-Meteo as default free live provider, or custom IMD AWS endpoint)
  weather: {
    apiUrl: env.VITE_WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
    apiKey: env.VITE_WEATHER_API_KEY || '',
    isConfigured: true, // Open-Meteo free tier provides active live ground telemetry
    providerName: 'Open-Meteo High-Resolution Surface AWS Feed',
  },

  // MOSDAC / ISRO Satellite API
  mosdac: {
    apiUrl: env.VITE_MOSDAC_API_URL || '',
    apiKey: env.VITE_MOSDAC_API_KEY || '',
    isConfigured: Boolean(env.VITE_MOSDAC_API_URL && env.VITE_MOSDAC_API_KEY),
    providerName: 'ISRO MOSDAC INSAT-3D/3DR Meteorological Stream',
    requiresInstitutionalAuth: true,
  },

  // Radar API (e.g. IMD DWR network or open RainViewer composite)
  radar: {
    apiUrl: env.VITE_RADAR_API_URL || '',
    apiKey: env.VITE_RADAR_API_KEY || '',
    isConfigured: Boolean(env.VITE_RADAR_API_URL),
    openMosaicAvailable: true, // RainViewer public Doppler tile composite is available
    providerName: 'IMD Doppler Weather Radar Network / Open Composite',
  },

  // Lightning API (e.g. Earth Networks / Blitzortung / Damini network)
  lightning: {
    apiUrl: env.VITE_LIGHTNING_API_URL || '',
    apiKey: env.VITE_LIGHTNING_API_KEY || '',
    isConfigured: Boolean(env.VITE_LIGHTNING_API_URL),
    providerName: 'Indian Lightning Location Network (ILLN / Ground Sensor)',
  },

  // AI Nowcasting ML Backend (Python FastAPI / Flask service)
  nowcastingBackend: {
    apiUrl: env.VITE_NOWCAST_ML_API_URL || '',
    apiKey: env.VITE_NOWCAST_ML_API_KEY || '',
    isConfigured: Boolean(env.VITE_NOWCAST_ML_API_URL),
    providerName: 'Prototype Nowcasting Model (Heuristic Convective Engine)',
  },
};

/**
 * Returns dynamic status for each data source based on current environment configuration.
 */
export function getInitialDataSourceStatuses(): DataSourceStatus[] {
  return [
    {
      id: 'weather',
      name: 'Atmospheric / Weather Telemetry',
      sourceType: 'WEATHER',
      configured: true,
      status: 'CONNECTED',
      statusLabel: 'LIVE (Open-Meteo High-Res AWS)',
      endpointUrl: DATA_SOURCE_CONFIG.weather.apiUrl,
      lastUpdated: new Date().toISOString(),
      dataQuality: 'LIVE',
      notes: 'Active real-time surface parameters, CAPE, and lifted index.',
      requiresAuth: false,
      isRestrictedGovFeed: false,
    },
    {
      id: 'satellite',
      name: 'ISRO MOSDAC Satellite',
      sourceType: 'SATELLITE',
      configured: DATA_SOURCE_CONFIG.mosdac.isConfigured,
      status: DATA_SOURCE_CONFIG.mosdac.isConfigured ? 'CONNECTED' : 'AUTHENTICATION_REQUIRED',
      statusLabel: DATA_SOURCE_CONFIG.mosdac.isConfigured ? 'LIVE (MOSDAC API)' : 'MOSDAC AUTH REQUIRED',
      endpointUrl: DATA_SOURCE_CONFIG.mosdac.apiUrl || 'https://mosdac.gov.in/live-stream',
      lastUpdated: null,
      dataQuality: DATA_SOURCE_CONFIG.mosdac.isConfigured ? 'LIVE' : 'UNAVAILABLE',
      notes: DATA_SOURCE_CONFIG.mosdac.isConfigured
        ? 'INSAT-3D/3DR rapid scan IR & Water Vapour observation feeds.'
        : 'MOSDAC authentication/data access required. Set VITE_MOSDAC_API_URL and VITE_MOSDAC_API_KEY.',
      requiresAuth: true,
      isRestrictedGovFeed: true,
    },
    {
      id: 'radar',
      name: 'Doppler Weather Radar (DWR)',
      sourceType: 'RADAR',
      configured: DATA_SOURCE_CONFIG.radar.isConfigured || DATA_SOURCE_CONFIG.radar.openMosaicAvailable,
      status: DATA_SOURCE_CONFIG.radar.isConfigured ? 'CONNECTED' : 'FALLBACK_DEMO',
      statusLabel: DATA_SOURCE_CONFIG.radar.isConfigured
        ? 'LIVE (Configured DWR API)'
        : 'OPEN COMPOSITE (RainViewer) / DWR UNCONFIGURED',
      endpointUrl: DATA_SOURCE_CONFIG.radar.apiUrl || 'https://api.rainviewer.com/public/weather-maps.json',
      lastUpdated: new Date().toISOString(),
      dataQuality: DATA_SOURCE_CONFIG.radar.isConfigured ? 'LIVE' : 'RECENT',
      notes: DATA_SOURCE_CONFIG.radar.isConfigured
        ? 'Dedicated Indian DWR polar volume scan endpoint active.'
        : 'Direct IMD DWR feed unconfigured. RainViewer open radar composite is used for public rain echo.',
      requiresAuth: false,
      isRestrictedGovFeed: true,
    },
    {
      id: 'lightning',
      name: 'Lightning Detection Network',
      sourceType: 'LIGHTNING',
      configured: DATA_SOURCE_CONFIG.lightning.isConfigured,
      status: DATA_SOURCE_CONFIG.lightning.isConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
      statusLabel: DATA_SOURCE_CONFIG.lightning.isConfigured ? 'LIVE SENSOR FEED' : 'AI ESTIMATED (Direct Feed Unconfigured)',
      endpointUrl: DATA_SOURCE_CONFIG.lightning.apiUrl || undefined,
      lastUpdated: new Date().toISOString(),
      dataQuality: DATA_SOURCE_CONFIG.lightning.isConfigured ? 'LIVE' : 'DEMO',
      notes: DATA_SOURCE_CONFIG.lightning.isConfigured
        ? 'Real-time ground-based time-of-arrival sensor network active.'
        : 'Direct lightning observations unavailable. Lightning risk is computed via AI from atmospheric CAPE and reflectivity.',
      requiresAuth: false,
      isRestrictedGovFeed: true,
    },
    {
      id: 'nowcasting',
      name: 'Nowcasting ML Engine',
      sourceType: 'NOWCAST_ENGINE',
      configured: true,
      status: 'CONNECTED',
      statusLabel: DATA_SOURCE_CONFIG.nowcastingBackend.isConfigured
        ? 'LIVE ML BACKEND'
        : 'AVAILABLE (Prototype Nowcasting Model)',
      endpointUrl: DATA_SOURCE_CONFIG.nowcastingBackend.apiUrl || 'Internal Convective Rules Engine',
      lastUpdated: new Date().toISOString(),
      dataQuality: 'LIVE',
      notes: DATA_SOURCE_CONFIG.nowcastingBackend.isConfigured
        ? 'Connected to external Python Conv-LSTM ML backend.'
        : 'Running physics-grounded Prototype Model (+15m, +30m, +45m, +60m horizons). Ready to connect Python backend.',
      requiresAuth: false,
      isRestrictedGovFeed: false,
    },
  ];
}
