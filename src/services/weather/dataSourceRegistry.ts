import { IngestedMultiSourceBundle, WeatherObservation } from '../../types/nowcast';
import { DataSourceStatus, DataQuality, IngestionMode } from '../../types/dataSource';
import { RealWeatherApiProvider } from './weatherApi';
import { MosdacSatelliteProvider } from './satelliteProvider';
import { ConfigurableRadarProvider } from './radarProvider';
import { ConfigurableLightningProvider } from './lightningProvider';
import { DataNormalizer } from './dataNormalizer';
import { PrototypeNowcastingEngine } from './nowcastingEngine';

export interface DataRegistryStatus {
  sourceId: string;
  name: string;
  status: 'LIVE' | 'RECENT' | 'UNAVAILABLE' | 'DEMO' | 'NOT_CONFIGURED';
  statusText: string;
  isLive: boolean;
  lastUpdatedIso: string | null;
  lastUpdatedFormatted: string;
  dataQuality: string;
  notes: string;
}

/**
 * Orchestrator for SIH26072 Data Ingestion Architecture
 * Coordinates multi-source ingestion, enforces strict separation between
 * Real Data Mode and Demo Mode, and computes pipeline status.
 */
export class DataSourceRegistry {
  private weatherProvider = new RealWeatherApiProvider();
  private satelliteProvider = new MosdacSatelliteProvider();
  private radarProvider = new ConfigurableRadarProvider();
  private lightningProvider = new ConfigurableLightningProvider();
  private nowcastingEngine = new PrototypeNowcastingEngine();

  private mode: 'REAL_DATA' | 'DEMO_DATA' = 'REAL_DATA';

  getMode(): 'REAL_DATA' | 'DEMO_DATA' {
    return this.mode;
  }

  setMode(mode: 'REAL_DATA' | 'DEMO_DATA') {
    this.mode = mode;
  }

  async ingestAll(stationId: string, latitude: number, longitude: number): Promise<IngestedMultiSourceBundle> {
    const isDemoMode = this.mode === 'DEMO_DATA';

    // 1. Weather observation
    let weather: WeatherObservation;
    if (isDemoMode) {
      weather = {
        id: `DEMO-WX-${stationId}`,
        timestamp: new Date().toISOString(),
        latitude,
        longitude,
        temperature: 32.4,
        humidity: 86,
        pressure: 1003.8,
        windSpeed: 38.0,
        windDirection: 285,
        precipitation: 28.5,
        cloudCover: 95,
        dewPoint: 28.0,
        cape: 2450,
        liftedIndex: -5.2,
        source: 'Historical Benchmark Dataset (DEMO)',
        isLive: false,
        dataQuality: 'DEMO',
      };
    } else {
      weather = await this.weatherProvider.getCurrentWeather(latitude, longitude);
    }

    // 2. Satellite observation
    const satellite = isDemoMode
      ? this.satelliteProvider.getDemoSatelliteObservation(latitude, longitude)
      : await this.satelliteProvider.getSatelliteObservation(latitude, longitude);

    // 3. Radar observation
    const radar = isDemoMode
      ? this.radarProvider.getDemoRadarObservation(latitude, longitude, stationId)
      : await this.radarProvider.getRadarObservation(latitude, longitude, stationId);

    // 4. Lightning observation
    const lightning = isDemoMode
      ? this.lightningProvider.getDemoLightningObservation(latitude, longitude)
      : await this.lightningProvider.getLightningObservation(latitude, longitude);

    // 5. AI Lightning Risk Estimate
    const lightningRiskEstimate = this.lightningProvider.estimateLightningRisk(weather, satellite, radar);

    // 6. Storm observation vector
    const stormObservation = DataNormalizer.normalizeStormObservation(weather, radar, satellite);

    // 7. Run Nowcasting Engine
    const nowcast = await this.nowcastingEngine.predict({
      stationId,
      latitude,
      longitude,
      weather,
      satellite,
      radar,
      lightning: lightning.dataQuality === 'UNAVAILABLE' ? null : lightning,
      lightningRiskEstimate,
    });

    return {
      timestamp: new Date().toISOString(),
      mode: this.mode,
      weather,
      satellite,
      radar,
      lightning: lightning.dataQuality === 'UNAVAILABLE' ? null : lightning,
      lightningRiskEstimate,
      stormObservation,
      nowcast,
    };
  }

  getStatuses(bundle?: IngestedMultiSourceBundle | null): DataRegistryStatus[] {
    const isDemo = this.mode === 'DEMO_DATA';
    const now = new Date();

    const formatTs = (iso: string | null) => {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
      } catch {
        return '—';
      }
    };

    // 1. Weather
    const weatherQuality = bundle?.weather.dataQuality || (isDemo ? 'DEMO' : 'LIVE');
    const weatherStatus: DataRegistryStatus = {
      sourceId: 'weather',
      name: 'Surface Weather Telemetry',
      status: isDemo ? 'DEMO' : weatherQuality === 'LIVE' ? 'LIVE' : weatherQuality === 'RECENT' ? 'RECENT' : 'UNAVAILABLE',
      statusText: isDemo ? 'DEMO DATA' : weatherQuality === 'LIVE' ? 'LIVE' : weatherQuality === 'RECENT' ? 'RECENT' : 'UNAVAILABLE',
      isLive: !isDemo && weatherQuality === 'LIVE',
      lastUpdatedIso: bundle?.weather.timestamp || now.toISOString(),
      lastUpdatedFormatted: formatTs(bundle?.weather.timestamp || null),
      dataQuality: isDemo ? 'DEMO' : weatherQuality,
      notes: bundle?.weather.source || 'Open-Meteo / WMO Met Stations',
    };

    // 2. Satellite
    const satConfigured = this.satelliteProvider.isConfigured();
    const satQuality = bundle?.satellite.dataQuality || (isDemo ? 'DEMO' : satConfigured ? 'LIVE' : 'UNAVAILABLE');
    const satelliteStatus: DataRegistryStatus = {
      sourceId: 'satellite',
      name: 'ISRO MOSDAC Satellite',
      status: isDemo ? 'DEMO' : satConfigured ? (satQuality === 'LIVE' ? 'LIVE' : 'UNAVAILABLE') : 'NOT_CONFIGURED',
      statusText: isDemo ? 'DEMO ARCHIVE' : satConfigured ? 'LIVE' : 'NOT CONFIGURED',
      isLive: !isDemo && satQuality === 'LIVE',
      lastUpdatedIso: bundle?.satellite.timestamp || null,
      lastUpdatedFormatted: formatTs(bundle?.satellite.timestamp || null),
      dataQuality: isDemo ? 'DEMO' : satQuality,
      notes: isDemo
        ? 'INSAT-3DR Rapid-Scan Archive (Simulated Demo)'
        : satConfigured
        ? 'MOSDAC / ISRO INSAT-3DR Authenticated Feed'
        : 'Requires VITE_MOSDAC_API_URL & VITE_MOSDAC_API_KEY (Authorized SAC Access)',
    };

    // 3. Radar
    const radarConfigured = this.radarProvider.isConfigured();
    const radarQuality = bundle?.radar.dataQuality || (isDemo ? 'DEMO' : radarConfigured ? 'LIVE' : 'UNAVAILABLE');
    const radarStatus: DataRegistryStatus = {
      sourceId: 'radar',
      name: 'Doppler Weather Radar',
      status: isDemo ? 'DEMO' : radarConfigured ? (radarQuality === 'LIVE' ? 'LIVE' : 'UNAVAILABLE') : 'NOT_CONFIGURED',
      statusText: isDemo ? 'DEMO VOLUME SCAN' : radarConfigured ? 'LIVE' : 'NOT CONFIGURED',
      isLive: !isDemo && radarQuality === 'LIVE',
      lastUpdatedIso: bundle?.radar.timestamp || null,
      lastUpdatedFormatted: formatTs(bundle?.radar.timestamp || null),
      dataQuality: isDemo ? 'DEMO' : radarQuality,
      notes: isDemo
        ? 'S-Band DWR Polar Volume Scan Benchmark'
        : radarConfigured
        ? 'Doppler Radar Ingestion Gateway'
        : 'Direct raw IMD DWR volumetric feeds require departmental network credentials. RainViewer composite tiles active.',
    };

    // 4. Lightning
    const ltgConfigured = this.lightningProvider.isConfigured();
    const ltgQuality = bundle?.lightning?.dataQuality || (isDemo ? 'DEMO' : ltgConfigured ? 'LIVE' : 'UNAVAILABLE');
    const lightningStatus: DataRegistryStatus = {
      sourceId: 'lightning',
      name: 'Ground Lightning Sensors',
      status: isDemo ? 'DEMO' : ltgConfigured ? (ltgQuality === 'LIVE' ? 'LIVE' : 'UNAVAILABLE') : 'NOT_CONFIGURED',
      statusText: isDemo ? 'DEMO STRIKES' : ltgConfigured ? 'LIVE' : 'AI ESTIMATED',
      isLive: !isDemo && ltgQuality === 'LIVE',
      lastUpdatedIso: bundle?.lightning?.timestamp || null,
      lastUpdatedFormatted: formatTs(bundle?.lightning?.timestamp || null),
      dataQuality: isDemo ? 'DEMO' : ltgConfigured ? ltgQuality : 'UNAVAILABLE',
      notes: isDemo
        ? 'Historical Lightning Sensor Log (DEMO)'
        : ltgConfigured
        ? 'Ground Lightning Detection Network (LDS)'
        : 'Direct lightning sensors unconfigured. AI Microphysics Risk Model estimating strike potential from CAPE/reflectivity.',
    };

    // 5. AI Nowcasting Model
    const modelMeta = this.nowcastingEngine.getModelMetadata();
    const aiStatus: DataRegistryStatus = {
      sourceId: 'ai_model',
      name: 'Nowcasting Model',
      status: 'LIVE',
      statusText: 'AVAILABLE',
      isLive: true,
      lastUpdatedIso: bundle?.nowcast.timestamp || now.toISOString(),
      lastUpdatedFormatted: formatTs(bundle?.nowcast.timestamp || null),
      dataQuality: 'LIVE',
      notes: `${modelMeta.name} (${modelMeta.version})`,
    };

    return [weatherStatus, satelliteStatus, radarStatus, lightningStatus, aiStatus];
  }

  getSourceStatuses(bundle?: IngestedMultiSourceBundle | null): DataSourceStatus[] {
    const isDemo = this.mode === 'DEMO_DATA';
    const now = new Date();

    const formatTs = (iso: string | null) => {
      if (!iso) return '—';
      try {
        const d = new Date(iso);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
      } catch {
        return '—';
      }
    };

    const satConfigured = this.satelliteProvider.isConfigured();
    const radarConfigured = this.radarProvider.isConfigured();
    const ltgConfigured = this.lightningProvider.isConfigured();

    const weatherQuality: DataQuality = isDemo ? 'DEMO' : (bundle?.weather.dataQuality as DataQuality) || 'LIVE';
    const satQuality: DataQuality = isDemo ? 'DEMO' : (bundle?.satellite.dataQuality as DataQuality) || (satConfigured ? 'LIVE' : 'UNAVAILABLE');
    const radarQuality: DataQuality = isDemo ? 'DEMO' : (bundle?.radar.dataQuality as DataQuality) || (radarConfigured ? 'LIVE' : 'UNAVAILABLE');
    const ltgQuality: DataQuality = isDemo ? 'DEMO' : (bundle?.lightning?.dataQuality as DataQuality) || (ltgConfigured ? 'LIVE' : 'UNAVAILABLE');

    return [
      {
        id: 'weather',
        name: 'Surface AWS Weather',
        sourceType: 'WEATHER',
        configured: true,
        status: isDemo ? 'FALLBACK_DEMO' : 'CONNECTED',
        statusLabel: isDemo ? 'DEMO DATA' : 'LIVE API CONNECTED',
        lastUpdated: formatTs(bundle?.weather.timestamp || now.toISOString()),
        dataQuality: weatherQuality,
        notes: isDemo ? 'Synthetic meteorological scenario' : bundle?.weather.source || 'Open-Meteo AWS Telemetry',
        requiresAuth: false,
        isRestrictedGovFeed: false,
      },
      {
        id: 'satellite',
        name: 'ISRO MOSDAC Satellite',
        sourceType: 'SATELLITE',
        configured: satConfigured,
        status: isDemo ? 'FALLBACK_DEMO' : satConfigured ? 'CONNECTED' : 'AUTHENTICATION_REQUIRED',
        statusLabel: isDemo ? 'DEMO ARCHIVE' : satConfigured ? 'LIVE MOSDAC' : 'AUTH REQUIRED',
        lastUpdated: formatTs(bundle?.satellite.timestamp || null),
        dataQuality: satQuality,
        notes: isDemo
          ? 'INSAT-3DR Rapid-Scan Archive (Simulated Demo)'
          : satConfigured
          ? 'ISRO SAC Authenticated Feed'
          : 'MOSDAC authentication/data access required (SAC credentials)',
        requiresAuth: true,
        isRestrictedGovFeed: true,
      },
      {
        id: 'radar',
        name: 'Doppler Weather Radar',
        sourceType: 'RADAR',
        configured: radarConfigured,
        status: isDemo ? 'FALLBACK_DEMO' : radarConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
        statusLabel: isDemo ? 'DEMO SCAN' : radarConfigured ? 'LIVE DWR' : 'NOT CONFIGURED',
        lastUpdated: formatTs(bundle?.radar.timestamp || null),
        dataQuality: radarQuality,
        notes: isDemo
          ? 'S-Band DWR Polar Volume Benchmark'
          : radarConfigured
          ? 'IMD DWR Gateway Connected'
          : 'Radar data source not configured. Raw polar volumetric scans require departmental access.',
        requiresAuth: true,
        isRestrictedGovFeed: true,
      },
      {
        id: 'lightning',
        name: 'Ground Lightning Sensors',
        sourceType: 'LIGHTNING',
        configured: ltgConfigured,
        status: isDemo ? 'FALLBACK_DEMO' : ltgConfigured ? 'CONNECTED' : 'NOT_CONFIGURED',
        statusLabel: isDemo ? 'DEMO STRIKES' : ltgConfigured ? 'LIVE LDS' : 'AI ESTIMATED',
        lastUpdated: formatTs(bundle?.lightning?.timestamp || null),
        dataQuality: ltgQuality,
        notes: isDemo
          ? 'Synthetic lightning strike log'
          : ltgConfigured
          ? 'Ground Lightning Sensor Network'
          : 'Direct lightning observations unavailable. AI Estimated Lightning Risk active.',
        requiresAuth: true,
        isRestrictedGovFeed: true,
      },
      {
        id: 'nowcast',
        name: 'Nowcasting Model',
        sourceType: 'NOWCAST_ENGINE',
        configured: true,
        status: 'CONNECTED',
        statusLabel: 'PROTOTYPE ACTIVE',
        lastUpdated: formatTs(bundle?.nowcast.timestamp || now.toISOString()),
        dataQuality: 'LIVE',
        notes: `${this.nowcastingEngine.getModelMetadata().name} (0-60m horizons)`,
        requiresAuth: false,
        isRestrictedGovFeed: false,
      },
    ];
  }
}

export const globalDataSourceRegistry = new DataSourceRegistry();
