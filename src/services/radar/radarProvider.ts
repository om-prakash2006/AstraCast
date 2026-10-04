/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Radar Provider Interface
 */

import { StormObservation } from '../../types/observations';
import { RadarScanHeader } from '../../types/radar';

export interface RadarProvider {
  name: string;
  isConfigured: boolean;
  isDirectIndianDwrFeed: boolean;
  getScanHeader(stationCode: string): Promise<RadarScanHeader>;
  getDetectedStormCells(lat: number, lng: number): Promise<StormObservation[]>;
  getTileUrlTemplate(): string | null;
}
