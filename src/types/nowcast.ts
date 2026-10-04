/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Nowcasting Engine Types
 */

import {
  WeatherObservation,
  StormObservation,
  LightningObservation,
  SatelliteObservation,
} from './observations';
import { LightningRiskEstimate } from './lightning';

export type {
  WeatherObservation,
  StormObservation,
  LightningObservation,
  SatelliteObservation,
};

export type ForecastHorizon = '+15m' | '+30m' | '+45m' | '+60m';
export type ForecastHorizonOffset = ForecastHorizon;
export type NowcastHorizonPrediction = HorizonPrediction;

export interface IngestedMultiSourceBundle {
  timestamp: string;
  mode: 'REAL_DATA' | 'DEMO_DATA';
  weather: WeatherObservation;
  satellite: SatelliteObservation;
  radar: StormObservation & { isConfigured?: boolean; peakReflectivityDbz?: number | null };
  lightning: LightningObservation | null;
  lightningRiskEstimate: LightningRiskEstimate;
  stormObservation: StormObservation;
  nowcast: NowcastResult;
}

export interface HorizonPrediction {
  horizon: ForecastHorizon;
  minutesAhead?: number;
  horizonMinutes?: number;
  timestamp?: string;
  predictedTimestamp?: string;
  thunderstormProbability: number; // 0 to 100%
  lightningProbability: number;     // 0 to 100%
  expectedRainRateMmH?: number;
  estimatedPrecipitationMmH?: number;
  expectedWindGustKmH?: number;
  estimatedWindGustKmH?: number;
  estimatedCape?: number;
  projectedCentroid?: { lat: number; lng: number };
  riskLevel: 'STAGE_I_NORMAL' | 'STAGE_II_WATCH' | 'STAGE_III_ALERT' | 'STAGE_IV_WARNING' | 'LOW' | 'WATCH' | 'ALERT' | 'WARNING';
  predictedMovementDirection: number; // degrees
  predictedMovementSpeed: number;     // km/h
  stormDisplacementKm?: { dx: number; dy: number };
}

export interface NowcastInputFeatures {
  stationCode?: string;
  latitude: number;
  longitude: number;
  weather: WeatherObservation;
  satellite?: SatelliteObservation | null;
  radarCells?: StormObservation[] | null;
  lightningObs?: LightningObservation[] | null;
  atmosphericIndices?: {
    cape: number;
    liftedIndex: number;
    windShear06km?: number;
  };
}

export interface NowcastResult {
  id?: string;
  timestamp?: string;
  stationId?: string;
  engineName?: string;
  isPrototypeModel?: boolean;
  isProductionModel?: boolean;
  modelIdentifier: string; // e.g. "SIH-CONVECT-HEURISTIC-V1" or "PY-ONNX-CONV-LSTM"
  generatedAt?: string;
  latitude: number;
  longitude: number;
  overallThunderstormProbability?: number; // 0 - 100%
  overallLightningProbability?: number;      // 0 - 100%
  thunderstormProbability?: number;
  lightningProbability?: number;
  currentHazardScore?: number;
  dataSourcesUsed?: any;
  riskLevel: 'STAGE_I_NORMAL' | 'STAGE_II_WATCH' | 'STAGE_III_ALERT' | 'STAGE_IV_WARNING' | 'LOW' | 'WATCH' | 'ALERT' | 'WARNING';
  riskLabel?: string;
  predictedMovementDirection: number; // degrees
  predictedMovementSpeed: number;     // km/h
  timeline?: HorizonPrediction[];
  horizons?: HorizonPrediction[];
  lightningRiskEstimate?: any;
  disclaimer: string;
}

export interface NowcastingEngine {
  engineName: string;
  isPrototype: boolean;
  computeNowcast(input: NowcastInputFeatures): Promise<NowcastResult>;
}
