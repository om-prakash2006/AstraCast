/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Radar Provider Types
 */

import { StormObservation } from './observations';
import { DataQuality } from './dataSource';

export type { StormObservation };

export interface RadarObservation {
  id?: string;
  timestamp: string | null;
  latitude: number;
  longitude: number;
  stationCode: string;
  intensity?: number | null;
  peakReflectivityDbz?: number | null;
  movementDirection?: number | null;
  movementSpeed?: number | null;
  echoTopKm?: number | null;
  verticallyIntegratedLiquidKgM2?: number | null;
  precipitationIntensityMmH?: number | null;
  velocityMps?: number | null;
  spectrumWidthMps?: number | null;
  cellIdentification?: any | null;
  stormCells?: any[];
  radarStatus?: string;
  source: string;
  isLive: boolean;
  dataQuality: DataQuality;
  isConfigured?: boolean;
}

export interface RadarScanHeader {
  stationCode: string;
  radarType: string;        // e.g. "S-Band Doppler", "C-Band Doppler", "RainViewer Open Mosaic"
  sweepElevationDeg: number;
  scanTimeUtc: string;
  maxRangeKm: number;
  azimuthResolutionDeg: number;
  prfHz: number;
  pulseWidthMicroSec: number;
  source: string;
  isAuthorizedIndianRadarFeed: boolean;
  isLive: boolean;
  dataQuality: DataQuality;
}

export interface RadarProvider {
  name: string;
  isConfigured(): boolean;
  getScanHeader(stationCode: string): Promise<RadarScanHeader>;
  getDetectedStormCells(lat: number, lng: number): Promise<StormObservation[]>;
  getTileUrlTemplate(): string | null;
}
