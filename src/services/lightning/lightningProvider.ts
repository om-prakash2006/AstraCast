/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Lightning Provider & Risk Estimator
 *
 * NOTE: Does NOT claim direct real-time Indian lightning sensor access unless
 * VITE_LIGHTNING_API_URL is configured.
 * Otherwise returns 'Direct lightning observations unavailable' and computes
 * 'AI Estimated Lightning Risk' from CAPE, Lifted Index, and Radar Reflectivity.
 */

import { LightningObservation } from '../../types/observations';
import { LightningProvider, LightningRiskEstimate } from '../../types/lightning';
import { DATA_SOURCE_CONFIG } from '../../config/dataSources';

export class ConfigurableLightningProvider implements LightningProvider {
  public name = 'Indian Lightning Detection Network / AI Risk Estimator';

  private apiUrl = DATA_SOURCE_CONFIG.lightning.apiUrl;
  private apiKey = DATA_SOURCE_CONFIG.lightning.apiKey;

  public isSensorFeedAvailable(): boolean {
    return Boolean(this.apiUrl && this.apiUrl.startsWith('http'));
  }

  public async getObservedStrikes(
    lat: number,
    lng: number,
    radiusKm: number = 80
  ): Promise<{
    observations: LightningObservation[];
    statusMessage: string;
    isSensorFeedLive: boolean;
  }> {
    // If no direct sensor network API is configured:
    if (!this.isSensorFeedAvailable()) {
      return {
        observations: [],
        statusMessage: 'Direct lightning observations unavailable. Real-time sensor feed not configured. Using AI Estimated Lightning Risk.',
        isSensorFeedLive: false,
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/strikes?lat=${lat}&lng=${lng}&radius=${radiusKm}`, {
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      });
      if (!res.ok) throw new Error(`Lightning API returned HTTP ${res.status}`);
      const rawStrikes = await res.json();
      const observations: LightningObservation[] = (rawStrikes || []).map((s: any) => ({
        id: s.id || `LIVE-LTG-${Math.random().toString(36).substring(2, 8)}`,
        timestamp: s.timestamp || new Date().toISOString(),
        latitude: Number(s.lat),
        longitude: Number(s.lng),
        intensity: s.currentKA ? Number(s.currentKA) : 25,
        strikeCount: 1,
        strikeType: s.type || 'CG',
        source: 'Live Ground Sensor Network',
        isLive: true,
        dataQuality: 'LIVE',
        isAiEstimated: false,
      }));

      return {
        observations,
        statusMessage: `Active live sensor stream connected (${observations.length} strikes observed).`,
        isSensorFeedLive: true,
      };
    } catch (err: any) {
      console.warn(`[LightningProvider] Sensor API error: ${err?.message}`);
      return {
        observations: [],
        statusMessage: 'Direct lightning observations unavailable (API error). Using AI Estimated Lightning Risk.',
        isSensorFeedLive: false,
      };
    }
  }

  /**
   * Physics & meteorological model: Estimates lightning risk from atmospheric thermodynamic parameters
   * (CAPE, Lifted Index, Humidity, and Precip)
   */
  public estimateLightningRisk(
    lat: number,
    lng: number,
    atmosphericFeatures: { cape: number; liftedIndex: number; rh: number; precipRate: number }
  ): LightningRiskEstimate {
    const { cape, liftedIndex, rh, precipRate } = atmosphericFeatures;

    // Thermodynamic lightning probability index
    // Deep convection requires high CAPE (>1500) and negative Lifted Index (< -3)
    let prob = 10;
    if (cape >= 2500) prob += 45;
    else if (cape >= 1500) prob += 30;
    else if (cape >= 800) prob += 15;

    if (liftedIndex <= -6) prob += 30;
    else if (liftedIndex <= -3) prob += 20;
    else if (liftedIndex <= -1) prob += 10;

    if (precipRate > 15) prob += 15;
    else if (precipRate > 5) prob += 10;

    if (rh > 80) prob += 10;

    const clampedProb = Math.min(98, Math.max(5, prob));

    let threatLevel: 'LOW' | 'WATCH' | 'ALERT' | 'CRITICAL' = 'LOW';
    if (clampedProb >= 75) threatLevel = 'CRITICAL';
    else if (clampedProb >= 50) threatLevel = 'ALERT';
    else if (clampedProb >= 25) threatLevel = 'WATCH';

    const strikeDensity = Math.round((clampedProb / 100) * (cape / 800) * 10) / 10;

    return {
      timestamp: new Date().toISOString(),
      latitude: lat,
      longitude: lng,
      lightningProbabilityPercent: clampedProb,
      threatLevel,
      estimatedStrikeDensityPerSqKm: strikeDensity,
      capeContributionJkg: cape,
      isAiEstimated: true,
      modelRationale: `Convective instability driven: CAPE ${cape} J/kg, Lifted Index ${liftedIndex}. High electrostatic charging potential in mixed-phase cloud layer (-10°C to -25°C).`,
    };
  }
}
