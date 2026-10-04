/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Lightning Provider Types
 */

import { LightningObservation } from './observations';
import { DataQuality } from './dataSource';

export type { LightningObservation };

export interface LightningRiskEstimate {
  timestamp: string;
  latitude: number;
  longitude: number;
  lightningProbabilityPercent: number; // 0 to 100%
  riskScore?: number;
  threatLevel: 'LOW' | 'WATCH' | 'ALERT' | 'CRITICAL' | 'HIGH' | 'MODERATE';
  riskCategory?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  estimatedStrikeDensityPerSqKm?: number;
  estimatedStrikePotentialPerHour?: number;
  capeContributionJkg?: number;
  dominantMechanism?: string;
  isAiEstimated: true;
  modelRationale?: string;
  modelName?: string;
  basisObservationSources?: string[];
}

export interface LightningProvider {
  name: string;
  isSensorFeedAvailable(): boolean;
  getObservedStrikes(
    lat: number,
    lng: number,
    radiusKm?: number
  ): Promise<{
    observations: LightningObservation[];
    statusMessage: string;
    isSensorFeedLive: boolean;
  }>;
  estimateLightningRisk(
    lat: number,
    lng: number,
    atmosphericFeatures: { cape: number; liftedIndex: number; rh: number; precipRate: number }
  ): LightningRiskEstimate;
}
