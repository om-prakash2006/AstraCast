/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Satellite Provider Types
 */

import { SatelliteObservation } from './observations';
import { DataQuality } from './dataSource';

export type { SatelliteObservation };

export interface SatelliteProductQuery {
  satellite: 'INSAT-3D' | 'INSAT-3DR' | 'INSAT-3DS';
  channel: 'TIR1' | 'WV' | 'VIS' | 'RGB';
  sector?: 'INDIA' | 'FULL_DISK' | 'REGIONAL';
  timestamp?: string;
}

export interface MosdacAuthStatus {
  isAuthenticated: boolean;
  endpointUrl: string;
  hasApiKey: boolean;
  message: string;
}

export interface SatelliteProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  getAuthStatus(): MosdacAuthStatus;
  getLatestObservation(
    lat: number,
    lng: number,
    channel?: 'TIR1' | 'WV' | 'VIS' | 'RGB'
  ): Promise<SatelliteObservation>;
}
