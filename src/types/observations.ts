/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Common Normalized Data Structures
 *
 * NOTE: Providers may not supply every field. Missing fields are strictly typed as null
 * rather than fabricating artificial default numbers.
 */

import { DataQuality } from './dataSource';

export interface WeatherObservation {
  id?: string;
  timestamp: string | null;   // ISO 8601 observation timestamp from sensor
  latitude: number;
  longitude: number;
  temperature: number | null; // °C
  humidity: number | null;    // %
  pressure: number | null;    // hPa
  windSpeed: number | null;   // km/h
  windDirection: number | null; // degrees 0-360
  windGusts?: number | null;   // km/h
  precipitation: number | null; // mm/h rate
  cloudCover: number | null;  // %
  dewPoint: number | null;    // °C
  cape: number | null;        // J/kg Convective Available Potential Energy
  liftedIndex: number | null; // Convective instability index
  weatherCode?: number | null; // WMO code
  source: string;             // e.g. "Open-Meteo AWS Direct", "IMD AWS Synop", "Demo Sensor"
  isLive: boolean;            // true ONLY when received from an active external API
  dataQuality: DataQuality;   // LIVE | RECENT | HISTORICAL | DEMO | UNAVAILABLE
  stationCode?: string | null;
}

export interface StormObservation {
  id?: string;
  timestamp: string | null;
  latitude: number;
  longitude: number;
  intensity?: number | null;         // dBZ reflectivity
  peakReflectivityDbz?: number | null;
  movementDirection?: number | null; // Azimuth degrees (e.g. 240°)
  movementSpeed?: number | null;     // km/h
  stormAreaSqKm?: number | null;
  cellName?: string | null;
  stationCode?: string;
  precipitationIntensityMmH?: number | null;
  isConfigured?: boolean;
  severityLevel?: 'NORMAL' | 'WATCH' | 'ALERT' | 'CRITICAL' | null;
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
}

export interface LightningObservation {
  id?: string;
  timestamp: string | null;
  latitude: number;
  longitude: number;
  intensity?: number | null;   // peak current in kA
  intensityKa?: number | null; // alias for intensity
  strikeCount: number | null; // strike count in temporal window
  strikeType?: 'CG' | 'IC' | 'UNKNOWN' | 'MIXED' | string | null;
  polarity?: '+' | '-' | 'MIXED' | string | null;
  detectionConfidence?: number | null;
  sensorNetwork?: string | null;
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
  isAiEstimated?: boolean;    // true if derived from CAPE/reflectivity rather than physical sensor
}

export interface SatelliteObservation {
  id?: string;
  timestamp: string | null;
  satelliteName?: string;      // e.g. "INSAT-3D", "INSAT-3DR", "METEOSAT"
  sensor?: string;
  channel?: 'TIR1' | 'TIR2' | 'MIR' | 'WV' | 'VIS' | 'RGB' | string;
  latitude?: number;
  longitude?: number;
  centerLatitude?: number;
  centerLongitude?: number;
  cloudTopTemperatureK?: number | null; // Kelvin
  brightnessTemperatureK?: number | null; // alias
  cloudFraction?: number | null;        // 0 to 1
  waterVapourMm?: number | null;        // Total precipitable water mm
  waterVapourContentMm?: number | null; // alias
  cloudTopPressureHpa?: number | null;
  cloudType?: string | null;
  cloudMovementVector?: { headingDeg: number; speedKmH: number } | null;
  overpassStatus?: string;
  cloudMotionVector?: {
    directionDeg: number;
    speedKmH: number;
  } | null;
  infraredObservationUrl?: string | null;
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
  requiresAuth?: boolean;
}
