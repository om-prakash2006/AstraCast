/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — ISRO MOSDAC Satellite Provider
 *
 * NOTE: Respects institutional security protocols. If valid API credentials are not
 * supplied in VITE_MOSDAC_API_URL & VITE_MOSDAC_API_KEY, explicitly surfaces
 * 'MOSDAC authentication/data access required' without hallucinating live observations.
 */

import { SatelliteProvider } from './satelliteProvider';
import { SatelliteObservation } from '../../types/observations';
import { MosdacAuthStatus } from '../../types/satellite';
import { DATA_SOURCE_CONFIG } from '../../config/dataSources';
import { DataNormalizer } from '../dataNormalizer';

export class MosdacProvider implements SatelliteProvider {
  public name = 'ISRO MOSDAC INSAT-3D/3DR Satellite Stream';
  public isConfigured = DATA_SOURCE_CONFIG.mosdac.isConfigured;

  private apiUrl = DATA_SOURCE_CONFIG.mosdac.apiUrl;
  private apiKey = DATA_SOURCE_CONFIG.mosdac.apiKey;

  public getAuthStatus(): MosdacAuthStatus {
    const hasKey = Boolean(this.apiKey && this.apiKey !== 'MY_MOSDAC_API_KEY');
    const hasUrl = Boolean(this.apiUrl && this.apiUrl.startsWith('http'));

    if (hasKey && hasUrl) {
      return {
        isAuthenticated: true,
        endpointUrl: this.apiUrl,
        hasApiKey: true,
        message: 'Authenticated MOSDAC access established.',
      };
    }

    return {
      isAuthenticated: false,
      endpointUrl: this.apiUrl || 'https://mosdac.gov.in (Unconfigured)',
      hasApiKey: false,
      message: 'MOSDAC authentication/data access required. ISRO/MOSDAC satellite feeds require an institutional API key.',
    };
  }

  public async getLatestObservation(
    lat: number,
    lng: number,
    channel: 'TIR1' | 'WV' | 'VIS' | 'RGB' = 'TIR1'
  ): Promise<SatelliteObservation> {
    const auth = this.getAuthStatus();

    // If no credentials configured, return honest UNAVAILABLE observation
    if (!auth.isAuthenticated) {
      return {
        timestamp: new Date().toISOString(),
        satelliteName: 'INSAT-3D / 3DR (ISRO)',
        channel,
        centerLatitude: lat,
        centerLongitude: lng,
        cloudTopTemperatureK: null,
        cloudFraction: null,
        waterVapourMm: null,
        cloudMotionVector: null,
        infraredObservationUrl: null,
        source: 'ISRO MOSDAC (Auth Required)',
        isLive: false,
        dataQuality: 'UNAVAILABLE',
        requiresAuth: true,
      };
    }

    // Attempt live ingestion from configured authenticated MOSDAC gateway
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(`${this.apiUrl}/products/insat3d/latest?channel=${channel}&lat=${lat}&lon=${lng}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`MOSDAC gateway returned HTTP ${res.status}`);
      }

      const raw = await res.json();
      return DataNormalizer.normalizeSatellite(raw, 'ISRO MOSDAC Live API', true, true);
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn(`[MosdacProvider] Connection failed: ${err?.message}`);

      return {
        timestamp: new Date().toISOString(),
        satelliteName: 'INSAT-3D / 3DR (ISRO)',
        channel,
        centerLatitude: lat,
        centerLongitude: lng,
        cloudTopTemperatureK: null,
        cloudFraction: null,
        waterVapourMm: null,
        cloudMotionVector: null,
        infraredObservationUrl: null,
        source: 'MOSDAC Gateway Connection Failed',
        isLive: false,
        dataQuality: 'UNAVAILABLE',
        requiresAuth: true,
      };
    }
  }
}
