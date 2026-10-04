import { RadarObservation } from '../../types/radar';

export interface RadarProvider {
  getRadarObservation(latitude: number, longitude: number, stationCode?: string): Promise<RadarObservation>;
  isConfigured(): boolean;
  getStatusMessage(): string;
}

export class ConfigurableRadarProvider implements RadarProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = (import.meta.env.VITE_RADAR_API_URL as string | undefined)?.trim() || '';
    this.apiKey = (import.meta.env.VITE_RADAR_API_KEY as string | undefined)?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl);
  }

  getStatusMessage(): string {
    if (!this.apiUrl) {
      return 'Radar data source not configured. Direct raw IMD DWR volumetric feeds require authorized departmental access.';
    }
    return `Connected to Radar Ingestion Gateway (${this.apiUrl})`;
  }

  async getRadarObservation(
    latitude: number,
    longitude: number,
    stationCode: string = 'DWR_GENERIC'
  ): Promise<RadarObservation> {
    if (!this.isConfigured()) {
      return {
        id: `RADAR-UNCONFIGURED-${stationCode}`,
        timestamp: null,
        latitude,
        longitude,
        stationCode,
        peakReflectivityDbz: null,
        echoTopKm: null,
        verticallyIntegratedLiquidKgM2: null,
        precipitationIntensityMmH: null,
        velocityMps: null,
        spectrumWidthMps: null,
        cellIdentification: null,
        radarStatus: 'UNCONFIGURED',
        source: 'Radar data source not configured',
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const headers: Record<string, string> = {};
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const res = await fetch(`${this.apiUrl}/scan/latest?lat=${latitude}&lng=${longitude}&station=${stationCode}`, {
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Radar API responded with HTTP status ${res.status}`);
      }

      const data = await res.json();

      return {
        id: `RADAR-LIVE-${stationCode}-${data.scanTime || Date.now()}`,
        timestamp: data.scanTime || new Date().toISOString(),
        latitude,
        longitude,
        stationCode: data.stationCode || stationCode,
        peakReflectivityDbz: data.maxReflectivityDbz ?? null,
        echoTopKm: data.echoTopKm ?? null,
        verticallyIntegratedLiquidKgM2: data.vil ?? null,
        precipitationIntensityMmH: data.rainRateMmH ?? null,
        velocityMps: data.radialVelocityMps ?? null,
        spectrumWidthMps: data.spectrumWidthMps ?? null,
        cellIdentification: data.stormCells || null,
        radarStatus: 'OPERATIONAL',
        source: `Doppler Radar Ingestion (${stationCode})`,
        isLive: true,
        dataQuality: 'LIVE',
      };
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[ConfigurableRadarProvider] Failed to fetch radar data:', err?.message || err);

      return {
        id: `RADAR-ERR-${stationCode}`,
        timestamp: null,
        latitude,
        longitude,
        stationCode,
        peakReflectivityDbz: null,
        echoTopKm: null,
        verticallyIntegratedLiquidKgM2: null,
        precipitationIntensityMmH: null,
        velocityMps: null,
        spectrumWidthMps: null,
        cellIdentification: null,
        radarStatus: 'OFFLINE',
        source: `Radar API Error: ${err?.message || 'Connection failed'}`,
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }
  }

  /**
   * For explicit SIH DEMO mode only: returns realistic radar volume scan observations
   */
  getDemoRadarObservation(latitude: number, longitude: number, stationCode = 'DWR_KOLKATA'): RadarObservation {
    return {
      id: `RADAR-DEMO-${stationCode}`,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      stationCode,
      peakReflectivityDbz: 56.5,
      echoTopKm: 15.2,
      verticallyIntegratedLiquidKgM2: 44.0,
      precipitationIntensityMmH: 34.0,
      velocityMps: -22.5,
      spectrumWidthMps: 6.8,
      cellIdentification: [
        {
          cellId: 'CELL-01',
          azimuthDeg: 285,
          rangeKm: 28.4,
          severityLabel: 'SEVERE HAIL CORE',
        },
        {
          cellId: 'CELL-02',
          azimuthDeg: 250,
          rangeKm: 58.0,
          severityLabel: 'FLANKING MULTICELL',
        },
      ],
      radarStatus: 'OPERATIONAL',
      source: 'S-band Doppler Radar Benchmark Dataset (DEMO)',
      isLive: false,
      dataQuality: 'DEMO',
    };
  }
}
