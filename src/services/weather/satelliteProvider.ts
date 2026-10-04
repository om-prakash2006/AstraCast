import { SatelliteObservation } from '../../types/satellite';

export interface SatelliteProvider {
  getSatelliteObservation(latitude: number, longitude: number): Promise<SatelliteObservation>;
  isConfigured(): boolean;
  getAuthStatus(): { authenticated: boolean; message: string };
}

export class MosdacSatelliteProvider implements SatelliteProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = (import.meta.env.VITE_MOSDAC_API_URL as string | undefined)?.trim() || '';
    this.apiKey = (import.meta.env.VITE_MOSDAC_API_KEY as string | undefined)?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  getAuthStatus(): { authenticated: boolean; message: string } {
    if (!this.apiUrl && !this.apiKey) {
      return {
        authenticated: false,
        message: 'MOSDAC authentication/data access required. Set VITE_MOSDAC_API_URL and VITE_MOSDAC_API_KEY.',
      };
    }
    if (this.apiUrl && !this.apiKey) {
      return {
        authenticated: false,
        message: 'MOSDAC API URL specified, but API token/key is missing.',
      };
    }
    return {
      authenticated: true,
      message: 'Configured for ISRO MOSDAC INSAT-3DR Geostationary Data Feed.',
    };
  }

  async getSatelliteObservation(latitude: number, longitude: number): Promise<SatelliteObservation> {
    // If not configured, strictly return UNAVAILABLE status with clear reason
    if (!this.isConfigured()) {
      return {
        id: `SAT-UNCONFIGURED-${Math.round(latitude)}-${Math.round(longitude)}`,
        timestamp: null,
        latitude,
        longitude,
        satelliteName: 'INSAT-3DR',
        sensor: 'IMAGER',
        channel: 'TIR1',
        brightnessTemperatureK: null,
        waterVapourContentMm: null,
        cloudTopPressureHpa: null,
        cloudFraction: null,
        cloudType: null,
        cloudMovementVector: null,
        overpassStatus: 'NO_PASS',
        source: 'ISRO MOSDAC (Access Pending - Requires API Credentials)',
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }

    // When configured with real credentials, attempt ingestion
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch(`${this.apiUrl}/insat3dr/rapid-scan?lat=${latitude}&lng=${longitude}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Mosdac-Key': this.apiKey,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`MOSDAC endpoint returned status ${res.status}`);
      }

      const data = await res.json();

      return {
        id: `SAT-LIVE-${data.granuleId || Date.now()}`,
        timestamp: data.acquisitionTime || new Date().toISOString(),
        latitude,
        longitude,
        satelliteName: data.satellite || 'INSAT-3DR',
        sensor: data.sensor || 'IMAGER',
        channel: data.channel || 'TIR1',
        brightnessTemperatureK: data.btK ?? null,
        waterVapourContentMm: data.wvMm ?? null,
        cloudTopPressureHpa: data.ctpHpa ?? null,
        cloudFraction: data.cloudFraction ?? null,
        cloudType: data.cloudClassification ?? null,
        cloudMovementVector: data.windVector ? {
          headingDeg: data.windVector.heading ?? 260,
          speedKmH: data.windVector.speed ?? 42,
        } : null,
        overpassStatus: 'RAPID_SCAN',
        source: 'MOSDAC / ISRO INSAT-3DR (Authenticated Feed)',
        isLive: true,
        dataQuality: 'LIVE',
      };
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[MosdacSatelliteProvider] Failed to ingest authenticated feed:', err?.message || err);

      return {
        id: `SAT-ERR-${Date.now()}`,
        timestamp: null,
        latitude,
        longitude,
        satelliteName: 'INSAT-3DR',
        sensor: 'IMAGER',
        channel: 'TIR1',
        brightnessTemperatureK: null,
        waterVapourContentMm: null,
        cloudTopPressureHpa: null,
        cloudFraction: null,
        cloudType: null,
        cloudMovementVector: null,
        overpassStatus: 'NO_PASS',
        source: `MOSDAC Ingestion Error: ${err?.message || 'Connection Timed Out'}`,
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }
  }

  /**
   * For explicit SIH DEMO mode only: returns sample INSAT-3DR rapid-scan observation
   */
  getDemoSatelliteObservation(latitude: number, longitude: number): SatelliteObservation {
    return {
      id: `SAT-DEMO-${Date.now()}`,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      satelliteName: 'INSAT-3DR',
      sensor: 'IMAGER',
      channel: 'TIR1',
      brightnessTemperatureK: 212.4, // Deep convective cloud top (< -60°C)
      waterVapourContentMm: 58.2,
      cloudTopPressureHpa: 175.0,
      cloudFraction: 0.94,
      cloudType: 'Cumulonimbus Anvil (Severe Convective Core)',
      cloudMovementVector: {
        headingDeg: 285,
        speedKmH: 48,
      },
      overpassStatus: 'RAPID_SCAN',
      source: 'INSAT-3DR Archived Rapid Scan Granule (DEMO MODE)',
      isLive: false,
      dataQuality: 'DEMO',
    };
  }
}
