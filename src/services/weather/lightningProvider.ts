import { LightningObservation, LightningRiskEstimate } from '../../types/lightning';
import { WeatherObservation } from '../../types/nowcast';
import { RadarObservation } from '../../types/radar';
import { SatelliteObservation } from '../../types/satellite';

export interface LightningProvider {
  getLightningObservation(latitude: number, longitude: number): Promise<LightningObservation>;
  isConfigured(): boolean;
  getStatusMessage(): string;
  estimateLightningRisk(
    weather: WeatherObservation,
    satellite?: SatelliteObservation | null,
    radar?: RadarObservation | null
  ): LightningRiskEstimate;
}

export class ConfigurableLightningProvider implements LightningProvider {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = (import.meta.env.VITE_LIGHTNING_API_URL as string | undefined)?.trim() || '';
    this.apiKey = (import.meta.env.VITE_LIGHTNING_API_KEY as string | undefined)?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  getStatusMessage(): string {
    if (!this.apiUrl || !this.apiKey) {
      return 'Direct lightning observations unavailable. Real-time Indian ground LDS feeds (IITM Damini / Earth Networks) require departmental credentials.';
    }
    return `Connected to Authorized Lightning Sensor API (${this.apiUrl})`;
  }

  async getLightningObservation(latitude: number, longitude: number): Promise<LightningObservation> {
    if (!this.isConfigured()) {
      return {
        id: `LTG-UNAVAILABLE-${Math.round(latitude)}-${Math.round(longitude)}`,
        timestamp: null,
        latitude,
        longitude,
        strikeCount: null,
        intensityKa: null,
        polarity: null,
        strikeType: null,
        detectionConfidence: null,
        sensorNetwork: null,
        source: 'Direct lightning observations unavailable',
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    try {
      const res = await fetch(`${this.apiUrl}/strikes/nearby?lat=${latitude}&lng=${longitude}&radiusKm=50`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Lightning API returned status ${res.status}`);
      }

      const data = await res.json();

      return {
        id: `LTG-LIVE-${data.clusterId || Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
        latitude,
        longitude,
        strikeCount: data.strikeCount ?? 0,
        intensityKa: data.peakCurrentKa ?? null,
        polarity: data.polarity ?? null,
        strikeType: data.type ?? 'MIXED',
        detectionConfidence: data.confidence ?? 90,
        sensorNetwork: data.network || 'Ground LDS Network',
        source: 'Live Ground Lightning Detection Network (LDS)',
        isLive: true,
        dataQuality: 'LIVE',
      };
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[ConfigurableLightningProvider] Lightning API failed:', err?.message || err);

      return {
        id: `LTG-ERR-${Date.now()}`,
        timestamp: null,
        latitude,
        longitude,
        strikeCount: null,
        intensityKa: null,
        polarity: null,
        strikeType: null,
        detectionConfidence: null,
        sensorNetwork: null,
        source: `Lightning API Error: ${err?.message || 'Connection failed'}`,
        isLive: false,
        dataQuality: 'UNAVAILABLE',
      };
    }
  }

  /**
   * AI/ML Risk Model Estimator
   * Strictly labeled as "AI Estimated Lightning Risk"
   * Combines CAPE, Lifted Index, rain rate, satellite IR BT, and radar reflectivity.
   */
  estimateLightningRisk(
    weather: WeatherObservation,
    satellite?: SatelliteObservation | null,
    radar?: RadarObservation | null
  ): LightningRiskEstimate {
    const cape = weather.cape ?? 600;
    const liftedIndex = weather.liftedIndex ?? -1.5;
    const rain = weather.precipitation ?? 0;
    const dbz = radar?.peakReflectivityDbz ?? (rain > 0 ? 35 : 15);
    const irBtK = satellite?.brightnessTemperatureK ?? 260;

    // Convective charging index (0 - 100)
    // 1. CAPE factor (0-40 pts): >2000 J/kg indicates violent updrafts
    const capeFactor = Math.min(40, (Math.max(0, cape) / 2500) * 40);

    // 2. Instability Lifted Index (0-20 pts): negative LI indicates extreme buoyancy
    const liFactor = liftedIndex < 0 ? Math.min(20, Math.abs(liftedIndex) * 3.5) : 0;

    // 3. Radar Hail / Mixed Phase Echo (0-25 pts): dBZ > 45 in mixed-phase zone
    const radarFactor = Math.min(25, (Math.max(0, dbz - 25) / 30) * 25);

    // 4. Satellite Cloud Top Coldness (0-15 pts): BT < 220 K (-53°C) indicates high overshoot
    const satFactor = irBtK < 240 ? Math.min(15, ((240 - irBtK) / 35) * 15) : 0;

    const riskScore = Math.min(99, Math.max(5, Math.round(capeFactor + liFactor + radarFactor + satFactor)));

    let riskCategory: LightningRiskEstimate['riskCategory'] = 'LOW';
    let estimatedPotential = 0;

    if (riskScore >= 75) {
      riskCategory = 'CRITICAL';
      estimatedPotential = Math.round(45 + (riskScore - 75) * 2);
    } else if (riskScore >= 50) {
      riskCategory = 'HIGH';
      estimatedPotential = Math.round(20 + (riskScore - 50) * 0.9);
    } else if (riskScore >= 25) {
      riskCategory = 'MODERATE';
      estimatedPotential = Math.round(5 + (riskScore - 25) * 0.5);
    }

    const basisSources = [weather.source];
    if (satellite?.dataQuality && satellite.dataQuality !== 'UNAVAILABLE') {
      basisSources.push(satellite.source);
    }
    if (radar?.dataQuality && radar.dataQuality !== 'UNAVAILABLE') {
      basisSources.push(radar.source);
    }

    return {
      timestamp: new Date().toISOString(),
      latitude: weather.latitude,
      longitude: weather.longitude,
      lightningProbabilityPercent: riskScore,
      riskScore,
      threatLevel: (riskCategory === 'CRITICAL' ? 'CRITICAL' : riskCategory === 'HIGH' ? 'ALERT' : riskCategory === 'MODERATE' ? 'WATCH' : 'LOW') as 'LOW' | 'WATCH' | 'ALERT' | 'CRITICAL',
      riskCategory: (riskCategory === 'CRITICAL' ? 'CRITICAL' : riskCategory === 'HIGH' ? 'HIGH' : riskCategory === 'MODERATE' ? 'MODERATE' : 'LOW'),
      estimatedStrikeDensityPerSqKm: Math.round(estimatedPotential / 10),
      capeContributionJkg: cape,
      isAiEstimated: true,
      modelRationale:
        cape >= 2000
          ? `Extreme convective updraft column (CAPE: ${cape} J/kg, LI: ${liftedIndex}) promoting non-inductive ice-graupel collision charging.`
          : cape >= 1000
          ? `Moderate thermodynamic buoyancy supporting multi-cell electrical discharge.`
          : 'Stable boundary layer with marginal charge separation potential.',
    };
  }

  /**
   * For SIH Demo Mode only
   */
  getDemoLightningObservation(latitude: number, longitude: number): LightningObservation {
    return {
      id: `LTG-DEMO-${Date.now()}`,
      timestamp: new Date().toISOString(),
      latitude,
      longitude,
      strikeCount: 18,
      intensityKa: -42.8,
      polarity: 'NEGATIVE',
      strikeType: 'CG',
      detectionConfidence: 96,
      sensorNetwork: 'IITM Damini / National Lightning Network (DEMO CASE)',
      source: 'Archived Monsoon Convection Ground LDS (DEMO)',
      isLive: false,
      dataQuality: 'DEMO',
    };
  }
}
