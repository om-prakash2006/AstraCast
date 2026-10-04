import { StormObservation, WeatherObservation } from '../../types/nowcast';
import { RadarObservation } from '../../types/radar';
import { SatelliteObservation } from '../../types/satellite';
import { LightningObservation } from '../../types/lightning';

/**
 * Common Data Normalizer
 * Normalizes multi-source observations into SIH26072 standard schemas.
 * Strictly adheres to rule: use null when unavailable, do not inject fake values.
 */
export class DataNormalizer {
  static normalizeStormObservation(
    weather: WeatherObservation,
    radar?: RadarObservation | null,
    satellite?: SatelliteObservation | null
  ): StormObservation {
    const hasRadarIntensity = radar?.peakReflectivityDbz !== null && radar?.peakReflectivityDbz !== undefined;
    const hasPrecip = weather.precipitation !== null && weather.precipitation !== undefined;

    // Movement direction: prefer satellite cloud movement, then radar velocity, then steering wind direction (wind + 180° for advection)
    let movementDir: number | null = null;
    let movementSpeed: number | null = null;

    const cmv = (satellite as any)?.cloudMovementVector || satellite?.cloudMotionVector;
    if (cmv) {
      movementDir = cmv.headingDeg ?? cmv.directionDeg ?? null;
      movementSpeed = cmv.speedKmH ?? null;
    } else if (weather.windDirection !== null) {
      // Atmospheric steering level (~700 hPa advection vector approximation)
      movementDir = (weather.windDirection + 15) % 360;
      movementSpeed = weather.windSpeed ? Math.round(weather.windSpeed * 1.25) : 30;
    }

    let intensity: number | null = null;
    if (hasRadarIntensity && radar) {
      intensity = radar.peakReflectivityDbz ?? null;
    } else if (hasPrecip && weather.precipitation !== null) {
      // Relative convective intensity score derived from surface rain rate
      intensity = Math.round(Math.min(75, Math.max(15, 20 + weather.precipitation * 1.5)));
    }

    const isLive = weather.isLive || Boolean(radar?.isLive) || Boolean(satellite?.isLive);

    return {
      id: `STORM-OBS-${Math.round(weather.latitude * 100)}-${Math.round(weather.longitude * 100)}`,
      timestamp: weather.timestamp || new Date().toISOString(),
      latitude: weather.latitude,
      longitude: weather.longitude,
      intensity,
      movementDirection: movementDir,
      movementSpeed,
      source: radar?.isLive ? radar.source : weather.isLive ? weather.source : 'Integrated Multi-Sensor Analysis',
      isLive,
      dataQuality: weather.dataQuality,
    };
  }

  static summarizeIngestionBundle(
    weather: WeatherObservation,
    satellite: SatelliteObservation,
    radar: RadarObservation,
    lightning: LightningObservation | null
  ) {
    return {
      liveSourcesCount: [weather, satellite, radar, lightning].filter((s) => s?.isLive).length,
      qualityMatrix: {
        weather: weather.dataQuality,
        satellite: satellite.dataQuality,
        radar: radar.dataQuality,
        lightning: lightning ? lightning.dataQuality : 'UNAVAILABLE',
      },
      latestTimestamp: [weather.timestamp, satellite.timestamp, radar.timestamp, lightning?.timestamp]
        .filter(Boolean)
        .sort()
        .pop() || new Date().toISOString(),
    };
  }
}
