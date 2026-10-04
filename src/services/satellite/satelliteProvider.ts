/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Satellite Provider Interface
 */

import { SatelliteObservation } from '../../types/observations';
import { MosdacAuthStatus } from '../../types/satellite';

export interface SatelliteProvider {
  name: string;
  isConfigured: boolean;
  getAuthStatus(): MosdacAuthStatus;
  getLatestObservation(
    lat: number,
    lng: number,
    channel?: 'TIR1' | 'WV' | 'VIS' | 'RGB'
  ): Promise<SatelliteObservation>;
}
