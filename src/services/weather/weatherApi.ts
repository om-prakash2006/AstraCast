import { WeatherObservation } from '../../types/nowcast';
import { WeatherProvider } from './weatherProvider';

/**
 * Real API Implementation of WeatherProvider
 * Supports Open-Meteo as default open meteorological API or custom configured API URL & Key.
 */
export class RealWeatherApiProvider implements WeatherProvider {
  name = 'RealWeatherApi';
  get isConfigured(): boolean {
    return Boolean(this.apiUrl);
  }

  private apiUrl: string;
  private apiKey: string;
  private lastSuccessfulObservation: WeatherObservation | null = null;
  private lastFetchTime: number = 0;

  constructor() {
    this.apiUrl = (import.meta.env.VITE_WEATHER_API_URL as string | undefined)?.trim() || 'https://api.open-meteo.com/v1/forecast';
    this.apiKey = (import.meta.env.VITE_WEATHER_API_KEY as string | undefined)?.trim() || '';
  }

  async getCurrentWeather(latitude: number, longitude: number): Promise<WeatherObservation> {
    const isCustomApi = Boolean(this.apiKey) || (!this.apiUrl.includes('open-meteo.com') && this.apiUrl.length > 0);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      // 1. If custom API is explicitly configured with custom URL, query it directly
      if (isCustomApi && !this.apiUrl.includes('open-meteo.com')) {
        const headers: Record<string, string> = {};
        const url = `${this.apiUrl}?lat=${latitude}&lng=${longitude}`;
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
          headers['X-Api-Key'] = this.apiKey;
        }
        const res = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const raw = await res.json();
          const cur = raw.current || raw.data || raw;
          return {
            id: `OBS-WX-${Math.round(latitude * 100)}-${Math.round(longitude * 100)}-${Date.now()}`,
            timestamp: cur.time || new Date().toISOString(),
            latitude,
            longitude,
            temperature: cur.temperature_2m ?? cur.temperature ?? null,
            humidity: cur.relative_humidity_2m ?? cur.humidity ?? null,
            pressure: cur.surface_pressure ?? cur.pressure ?? null,
            windSpeed: cur.wind_speed_10m ?? cur.windSpeed ?? null,
            windDirection: cur.wind_direction_10m ?? cur.windDirection ?? null,
            precipitation: cur.precipitation ?? cur.rain ?? null,
            cloudCover: cur.cloud_cover ?? cur.cloudCover ?? null,
            dewPoint: cur.dew_point_2m ?? null,
            cape: cur.cape ?? null,
            liftedIndex: cur.lifted_index ?? null,
            source: 'Custom Ingested Weather API',
            isLive: true,
            dataQuality: 'LIVE',
          };
        }
      }

      // 2. Query application server proxy route (/api/weather/live) first (reliable server-side fetch)
      try {
        const proxyRes = await fetch(`/api/weather/live?lat=${latitude}&lng=${longitude}`, {
          signal: controller.signal,
        });
        if (proxyRes.ok) {
          clearTimeout(timeout);
          const weatherData = await proxyRes.json();
          const cur = weatherData.current;
          if (cur) {
            const obs: WeatherObservation = {
              id: `OBS-WX-${Math.round(latitude * 100)}-${Math.round(longitude * 100)}-${Date.now()}`,
              timestamp: weatherData.timestamp || new Date().toISOString(),
              latitude,
              longitude,
              temperature: cur.temperature,
              humidity: cur.relativeHumidity,
              pressure: cur.surfacePressure,
              windSpeed: cur.windSpeed,
              windDirection: cur.windDirection,
              precipitation: cur.rainRate,
              cloudCover: null,
              dewPoint: cur.dewPoint,
              cape: cur.cape,
              liftedIndex: cur.liftedIndex,
              source: 'Open-Meteo High-Resolution AWS Feed',
              isLive: true,
              dataQuality: 'LIVE',
            };
            this.lastSuccessfulObservation = obs;
            this.lastFetchTime = Date.now();
            return obs;
          }
        }
      } catch {
        // Continue to direct Open-Meteo if server proxy is unreachable
      }

      // 3. Direct browser query to Open-Meteo public API
      const directUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,dew_point_2m,surface_pressure,wind_speed_10m,wind_direction_10m,precipitation,weather_code,cloud_cover,cape,lifted_index&timezone=Asia%2FKolkata`;
      const res = await fetch(directUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`Weather API responded with HTTP status ${res.status}`);
      }

      const raw = await res.json();
      this.lastFetchTime = Date.now();

      const cur = raw.current || raw.data || raw;

      const observation: WeatherObservation = {
        id: `OBS-WX-${Math.round(latitude * 100)}-${Math.round(longitude * 100)}-${Date.now()}`,
        timestamp: cur.time || new Date().toISOString(),
        latitude,
        longitude,
        temperature: cur.temperature_2m ?? cur.temperature ?? null,
        humidity: cur.relative_humidity_2m ?? cur.humidity ?? null,
        pressure: cur.surface_pressure ?? cur.pressure ?? null,
        windSpeed: cur.wind_speed_10m ?? cur.windSpeed ?? null,
        windDirection: cur.wind_direction_10m ?? cur.windDirection ?? null,
        precipitation: cur.precipitation ?? cur.rain ?? null,
        cloudCover: cur.cloud_cover ?? cur.cloudCover ?? null,
        dewPoint: cur.dew_point_2m ?? (cur.temperature_2m ? cur.temperature_2m - ((100 - (cur.relative_humidity_2m || 80)) / 5) : null),
        cape: cur.cape ?? null,
        liftedIndex: cur.lifted_index ?? null,
        source: 'Open-Meteo / WMO Telemetry Feed',
        isLive: true,
        dataQuality: 'LIVE',
      };

      this.lastSuccessfulObservation = observation;
      return observation;
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[RealWeatherApiProvider] Network request failed:', err?.message || err);

      // If we previously had a live observation, return it as RECENT
      if (this.lastSuccessfulObservation) {
        return {
          ...this.lastSuccessfulObservation,
          isLive: false,
          dataQuality: 'RECENT',
          source: `${this.lastSuccessfulObservation.source} (Cached Observation)`,
        };
      }

      // Explicitly return UNAVAILABLE / DEMO data, NEVER claim fake live values
      return {
        id: `DEMO-WX-${Math.round(latitude * 100)}-${Math.round(longitude * 100)}`,
        timestamp: new Date().toISOString(),
        latitude,
        longitude,
        temperature: 30.5,
        humidity: 82,
        pressure: 1005.2,
        windSpeed: 28.0,
        windDirection: 270,
        precipitation: 14.5,
        cloudCover: 90,
        dewPoint: 26.8,
        cape: 1850,
        liftedIndex: -4.2,
        source: 'Historical Benchmark Dataset (DEMO)',
        isLive: false,
        dataQuality: 'DEMO',
      };
    }
  }

  getLastFetchTime(): number {
    return this.lastFetchTime;
  }
}
