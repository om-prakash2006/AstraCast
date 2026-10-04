/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Unified Data Provider Registry
 *
 * Coordinates real-time data ingestion across:
 * 1. Weather Ground Observations
 * 2. Satellite (ISRO MOSDAC)
 * 3. Doppler Weather Radar
 * 4. Lightning Network / AI Risk Estimator
 * 5. Nowcasting Engine
 *
 * Strictly separates REAL DATA MODE from DEMO MODE.
 */

import { IngestionMode, DataSourceStatus } from '../types/dataSource';
import {
  WeatherObservation,
  StormObservation,
  LightningObservation,
  SatelliteObservation,
} from '../types/observations';
import { NowcastResult } from '../types/nowcast';
import { LightningRiskEstimate } from '../types/lightning';

import { OpenMeteoWeatherProvider } from './weather/openMeteoWeatherProvider';
import { MockWeatherProvider } from './weather/mockWeatherProvider';
import { MosdacProvider } from './satellite/mosdacProvider';
import { MockSatelliteProvider } from './satellite/mockSatelliteProvider';
import { ImdRadarProvider } from './radar/imdRadarProvider';
import { RainViewerRadarProvider } from './radar/rainViewerRadarProvider';
import { MockRadarProvider } from './radar/mockRadarProvider';
import { ConfigurableLightningProvider } from './lightning/lightningProvider';
import { MockLightningProvider } from './lightning/mockLightningProvider';
import { PrototypeNowcastingEngine } from './nowcasting/prototypeNowcastingEngine';

import { getInitialDataSourceStatuses } from '../config/dataSources';

export interface IngestionResult {
  mode: IngestionMode;
  ingestedAt: string;
  sourceStatuses: DataSourceStatus[];
  weather: WeatherObservation;
  satellite: SatelliteObservation;
  radarCells: StormObservation[];
  lightningStrikes: LightningObservation[];
  lightningRisk: LightningRiskEstimate;
  nowcast: NowcastResult;
  radarTileUrlTemplate: string | null;
  radarScanTimeUtc: string;
  dataAgeSeconds: number;
}

export class DataProviderRegistry {
  private static instance: DataProviderRegistry;

  private mode: IngestionMode = 'REAL_DATA';

  // Real Providers
  private realWeather = new OpenMeteoWeatherProvider();
  private realMosdac = new MosdacProvider();
  private realImdRadar = new ImdRadarProvider();
  private realRainViewer = new RainViewerRadarProvider();
  private realLightning = new ConfigurableLightningProvider();

  // Demo Providers
  private mockWeather = new MockWeatherProvider();
  private mockSatellite = new MockSatelliteProvider();
  private mockRadar = new MockRadarProvider();
  private mockLightning = new MockLightningProvider();

  // Nowcasting Engine
  private nowcastingEngine = new PrototypeNowcastingEngine();

  // In-memory cache & last update timestamps
  private lastIngestedResult: IngestionResult | null = null;

  public static getInstance(): DataProviderRegistry {
    if (!DataProviderRegistry.instance) {
      DataProviderRegistry.instance = new DataProviderRegistry();
    }
    return DataProviderRegistry.instance;
  }

  public getMode(): IngestionMode {
    return this.mode;
  }

  public setMode(mode: IngestionMode): void {
    this.mode = mode;
  }

  /**
   * Unified Ingestion Workflow
   */
  public async ingestAll(
    lat: number,
    lng: number,
    stationCode?: string
  ): Promise<IngestionResult> {
    const isReal = this.mode === 'REAL_DATA';
    const startTime = Date.now();

    // 1. Weather Ingestion
    const weatherProvider = isReal ? this.realWeather : this.mockWeather;
    const weatherObs: WeatherObservation = await weatherProvider.getCurrentWeather(
      lat,
      lng,
      stationCode
    );

    // 2. Satellite Ingestion
    const satelliteProvider = isReal ? this.realMosdac : this.mockSatellite;
    const satelliteObs: SatelliteObservation = await satelliteProvider.getLatestObservation(
      lat,
      lng,
      'TIR1'
    );

    // 3. Radar Ingestion
    let radarCells: StormObservation[] = [];
    let radarTileUrlTemplate: string | null = null;
    let radarScanTimeUtc = new Date().toISOString();

    if (isReal) {
      if (this.realImdRadar.isConfigured) {
        radarCells = await this.realImdRadar.getDetectedStormCells(lat, lng);
        radarTileUrlTemplate = this.realImdRadar.getTileUrlTemplate();
        const header = await this.realImdRadar.getScanHeader(stationCode || 'DWR');
        radarScanTimeUtc = header.scanTimeUtc;
      } else {
        // Fallback to RainViewer public mosaic tiles (no synthetic vector cells made up)
        radarTileUrlTemplate = this.realRainViewer.getTileUrlTemplate();
        const header = await this.realRainViewer.getScanHeader(stationCode || 'DWR');
        radarScanTimeUtc = header.scanTimeUtc;
      }
    } else {
      radarCells = await this.mockRadar.getDetectedStormCells(lat, lng);
      const header = await this.mockRadar.getScanHeader(stationCode || 'DWR');
      radarScanTimeUtc = header.scanTimeUtc;
    }

    // 4. Lightning Ingestion
    const lightningProvider = isReal ? this.realLightning : this.mockLightning;
    const { observations: strikes } = await lightningProvider.getObservedStrikes(lat, lng, 80);

    const lightningRisk: LightningRiskEstimate = lightningProvider.estimateLightningRisk(lat, lng, {
      cape: weatherObs.cape || 500,
      liftedIndex: weatherObs.liftedIndex || 0,
      rh: weatherObs.humidity || 70,
      precipRate: weatherObs.precipitation || 0,
    });

    // 5. Nowcasting Engine Execution
    const nowcastResult: NowcastResult = await this.nowcastingEngine.computeNowcast({
      stationCode,
      latitude: lat,
      longitude: lng,
      weather: weatherObs,
      satellite: satelliteObs,
      radarCells,
      lightningObs: strikes,
      atmosphericIndices: {
        cape: weatherObs.cape || 500,
        liftedIndex: weatherObs.liftedIndex || 0,
      },
    });

    // 6. Dynamic Source Status Mapping
    const sourceStatuses: DataSourceStatus[] = this.buildDynamicSourceStatuses(
      isReal,
      weatherObs,
      satelliteObs,
      strikes.length > 0
    );

    const result: IngestionResult = {
      mode: this.mode,
      ingestedAt: new Date().toISOString(),
      sourceStatuses,
      weather: weatherObs,
      satellite: satelliteObs,
      radarCells,
      lightningStrikes: strikes,
      lightningRisk,
      nowcast: nowcastResult,
      radarTileUrlTemplate,
      radarScanTimeUtc,
      dataAgeSeconds: Math.floor((Date.now() - startTime) / 1000),
    };

    this.lastIngestedResult = result;
    return result;
  }

  private buildDynamicSourceStatuses(
    isReal: boolean,
    weather: WeatherObservation,
    satellite: SatelliteObservation,
    hasStrikes: boolean
  ): DataSourceStatus[] {
    const base = getInitialDataSourceStatuses();

    if (!isReal) {
      return base.map((s) => ({
        ...s,
        status: 'FALLBACK_DEMO',
        statusLabel: 'DEMO DATA (SIMULATED)',
        dataQuality: 'DEMO',
        lastUpdated: new Date().toISOString(),
        notes: 'Operating in Demo Mode using pre-recorded convective event scenarios.',
      }));
    }

    return base.map((s) => {
      if (s.id === 'weather') {
        return {
          ...s,
          configured: true,
          status: weather.isLive ? 'CONNECTED' : 'ERROR',
          statusLabel: weather.isLive ? 'LIVE (Open-Meteo High-Res AWS)' : 'API TEMPORARILY UNAVAILABLE',
          dataQuality: weather.dataQuality,
          lastUpdated: weather.timestamp,
        };
      }
      if (s.id === 'satellite') {
        const auth = this.realMosdac.getAuthStatus();
        return {
          ...s,
          configured: auth.isAuthenticated,
          status: auth.isAuthenticated ? 'CONNECTED' : 'AUTHENTICATION_REQUIRED',
          statusLabel: auth.isAuthenticated ? 'LIVE (MOSDAC Stream)' : 'MOSDAC AUTH REQUIRED',
          dataQuality: satellite.dataQuality,
          lastUpdated: satellite.isLive ? satellite.timestamp : null,
          notes: auth.message,
        };
      }
      if (s.id === 'radar') {
        return {
          ...s,
          configured: this.realImdRadar.isConfigured || true,
          status: this.realImdRadar.isConfigured ? 'CONNECTED' : 'CONNECTED',
          statusLabel: this.realImdRadar.isConfigured
            ? 'LIVE (Configured DWR API)'
            : 'OPEN MOSAIC (RainViewer Composite)',
          dataQuality: 'LIVE',
          lastUpdated: new Date().toISOString(),
          notes: this.realImdRadar.isConfigured
            ? 'Authorized Indian Doppler Weather Radar API connected.'
            : 'Direct IMD DWR feed unconfigured. RainViewer open radar composite active.',
        };
      }
      if (s.id === 'lightning') {
        const live = this.realLightning.isSensorFeedAvailable();
        return {
          ...s,
          configured: live,
          status: live ? 'CONNECTED' : 'NOT_CONFIGURED',
          statusLabel: live ? 'LIVE SENSOR FEED' : 'AI ESTIMATED (Direct Feed Unconfigured)',
          dataQuality: live ? 'LIVE' : 'DEMO',
          lastUpdated: new Date().toISOString(),
          notes: live
            ? 'Ground sensor time-of-arrival detection stream active.'
            : 'Direct lightning observations unavailable. Real-time sensor feed not configured. Using AI Estimated Lightning Risk.',
        };
      }
      if (s.id === 'nowcasting') {
        return {
          ...s,
          status: 'CONNECTED',
          statusLabel: 'AVAILABLE (Prototype Nowcasting Model)',
          dataQuality: 'LIVE',
          lastUpdated: new Date().toISOString(),
        };
      }
      return s;
    });
  }
}
