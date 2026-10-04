import { Router, Request, Response } from 'express';
import { fetchLiveWeatherData } from '../services/weatherService';
import { fetchLiveRadarTiles } from '../services/radarService';
import { generateAIBulletin } from '../services/aiBulletinService';
import { INDIAN_MET_STATIONS } from '../../src/data/stations';
import { dataSourceConfigStore } from '../services/dataSourceConfigStore';
import { testServiceConnection } from '../services/connectionTester';

const router = Router();

// GET /api/stations
router.get('/stations', (_req: Request, res: Response) => {
  res.json({ stations: INDIAN_MET_STATIONS });
});

// GET /api/config/carto
router.get('/config/carto', (_req: Request, res: Response) => {
  const lightningSecrets = dataSourceConfigStore.getLightningSecrets();
  let key = (process.env.VITE_CARTO_API_KEY || process.env.CARTO_API_KEY || '').trim();

  // If CARTO key was entered into the lightning section or stored in lightning credentials
  if (!key || key === 'MY_CARTO_API_KEY') {
    if (lightningSecrets.apiKey && (lightningSecrets.apiKey.startsWith('cb1_') || lightningSecrets.apiKey.length >= 25)) {
      key = lightningSecrets.apiKey.trim();
    } else if (lightningSecrets.url && (lightningSecrets.url.startsWith('cb1_') || lightningSecrets.url.includes('carto'))) {
      key = lightningSecrets.url.trim();
    }
  }

  // Also check if any lightning environment variable holds the CARTO key
  if (!key) {
    const candidate = (process.env.VITE_LIGHTNING_API_KEY || process.env.LIGHTNING_API_KEY || '').trim();
    if (candidate.startsWith('cb1_') || candidate.length >= 25) {
      key = candidate;
    }
  }

  res.json({
    cartoApiKey: key,
    isKeyed: Boolean(key && key !== 'MY_CARTO_API_KEY'),
    provider: 'carto.com',
  });
});

// GET /api/config/datasources — Get sanitized source status (NEVER returns actual keys)
router.get('/config/datasources', (_req: Request, res: Response) => {
  try {
    const statuses = dataSourceConfigStore.getClientStatuses();
    res.json({
      timestamp: new Date().toISOString(),
      sources: statuses,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve configuration status' });
  }
});

// POST /api/config/datasources — Save credentials securely server-side
router.post('/config/datasources', (req: Request, res: Response) => {
  try {
    const { service, url, apiKey } = req.body;
    if (!service) {
      return res.status(400).json({ error: 'Missing service identifier' });
    }

    dataSourceConfigStore.updateSecret(service, { url, apiKey });

    // If key was provided in lightning section or starts with cb1_, also link to CARTO
    const cleanKey = apiKey ? apiKey.trim() : '';
    const cleanUrl = url ? url.trim() : '';
    if (cleanKey && (cleanKey.startsWith('cb1_') || (service.toLowerCase() === 'lightning' && cleanKey.length >= 25))) {
      process.env.VITE_CARTO_API_KEY = cleanKey;
      process.env.CARTO_API_KEY = cleanKey;
    }
    if (cleanUrl && cleanUrl.includes('carto.com') && cleanKey) {
      process.env.VITE_CARTO_API_KEY = cleanKey;
    }

    // Respond with success flag; never echo back the secret key
    res.json({
      success: true,
      service,
      message: `Configuration for ${service} updated successfully.`,
      maskedStatus: 'Configured ✓',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// POST /api/config/test-connection — Secure server-side verification probe
router.post('/config/test-connection', async (req: Request, res: Response) => {
  try {
    const { service, url, apiKey } = req.body;
    if (!service) {
      return res.status(400).json({ error: 'Missing service identifier' });
    }

    const testResult = await testServiceConnection(service, url, apiKey);
    res.json(testResult);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      status: 'CONNECTION_FAILED',
      message: 'Internal test execution error occurred.',
    });
  }
});

// GET & POST /api/forecast — Prototype Nowcast API Endpoint
router.all('/forecast', (req: Request, res: Response) => {
  res.json({
    engine: 'SIH26072 Prototype Nowcasting Model',
    version: 'v1.4-prototype',
    disclaimer: 'Prototype Nowcast API (Diagnostic convective baseline; not an operational certified forecast).',
    status: 'OPERATIONAL',
    horizons: ['+15m', '+30m', '+45m', '+60m'],
    timestamp: new Date().toISOString(),
  });
});

// GET /api/weather/live?stationId={id}&lat={lat}&lng={lng}
router.get(['/weather/live', '/weather/live/:stationId'], async (req: Request, res: Response) => {
  try {
    const stationParam = (req.params.stationId || req.query.stationId) as string | undefined;
    let lat = parseFloat(req.query.lat as string);
    let lng = parseFloat(req.query.lng as string);

    if (stationParam) {
      const found = INDIAN_MET_STATIONS.find(
        (s) =>
          s.id.toLowerCase() === stationParam.toLowerCase() ||
          s.radarStationCode.toLowerCase() === stationParam.toLowerCase()
      );
      if (found) {
        lat = found.lat;
        lng = found.lng;
      }
    }

    if (isNaN(lat) || isNaN(lng)) {
      lat = 22.57; // Default Kolkata DWR
      lng = 88.36;
    }

    const data = await fetchLiveWeatherData(lat, lng);
    res.json(data);
  } catch (err: any) {
    console.error('Error in /api/weather/live:', err);
    res.status(500).json({ error: 'Failed to fetch live weather data', details: err?.message });
  }
});

// GET /api/radar/live-timestamp
router.get('/radar/live-timestamp', async (_req: Request, res: Response) => {
  try {
    const rvRes = await fetch('https://api.rainviewer.com/public/weather-maps.json');
    if (!rvRes.ok) throw new Error(`RainViewer API returned status ${rvRes.status}`);
    const rvData = await rvRes.json();
    const host = rvData.host || 'https://tilecache.rainviewer.com';
    const past = rvData.radar?.past || [];
    const latest = past[past.length - 1];

    if (!latest) {
      throw new Error('No radar frames available in RainViewer feed');
    }

    const path = latest.path; // e.g. '/v2/radar/4e5b26cd4a83'
    const time = latest.time;
    const cleanId = path.replace('/v2/radar/', '');

    res.json({
      host,
      timestamp: time,
      framePath: path,
      frameId: cleanId,
      tileUrlTemplate: `${host}/v2/radar/${cleanId}/512/{z}/{x}/{y}/2/1_1.png`,
      sampleTileUrl: `${host}/v2/radar/${cleanId}/512/4/11/7/2/1_1.png`,
      isoTime: new Date(time * 1000).toISOString(),
    });
  } catch (err: any) {
    console.error('Error in /api/radar/live-timestamp:', err);
    const fallbackEpoch = Math.floor(Date.now() / 1000);
    res.json({
      host: 'https://tilecache.rainviewer.com',
      timestamp: fallbackEpoch,
      framePath: '/v2/radar/latest',
      frameId: 'latest',
      tileUrlTemplate: 'https://tilecache.rainviewer.com/v2/radar/latest/512/{z}/{x}/{y}/2/1_1.png',
      sampleTileUrl: 'https://tilecache.rainviewer.com/v2/radar/latest/512/4/11/7/2/1_1.png',
      isoTime: new Date(fallbackEpoch * 1000).toISOString(),
      warning: 'RainViewer fallback applied',
    });
  }
});

// GET /api/radar/live-tiles
router.get('/radar/live-tiles', async (_req: Request, res: Response) => {
  try {
    const data = await fetchLiveRadarTiles();
    res.json(data);
  } catch (err: any) {
    console.error('Error in /api/radar/live-tiles:', err);
    res.status(500).json({ error: 'Failed to fetch radar tiles', details: err?.message });
  }
});

// GET /api/lightning/live?lat={lat}&lng={lng}
router.get('/lightning/live', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string) || 28.5665;
    const lng = parseFloat(req.query.lng as string) || 77.1031;

    const weatherData = await fetchLiveWeatherData(lat, lng);
    res.json({
      station: weatherData.station,
      timestamp: weatherData.timestamp,
      strikesCount: weatherData.lightningStrikes.length,
      strikes: weatherData.lightningStrikes,
      stormCells: weatherData.stormCells,
      lightningThreat: weatherData.severity.lightningThreat,
      cape: weatherData.current.cape,
      precip: weatherData.current.precipitation,
    });
  } catch (err: any) {
    console.error('Error in /api/lightning/live:', err);
    res.status(500).json({ error: 'Failed to fetch live lightning data', details: err?.message });
  }
});

// POST /api/v1/ai/generate-bulletin
router.post('/v1/ai/generate-bulletin', async (req: Request, res: Response) => {
  try {
    let weatherData = req.body.weatherData;
    if (!weatherData && req.body.lat && req.body.lng) {
      weatherData = await fetchLiveWeatherData(parseFloat(req.body.lat), parseFloat(req.body.lng));
    }

    if (!weatherData) {
      return res.status(400).json({ error: 'Missing weatherData or lat/lng in request body' });
    }

    const forceRefresh = Boolean(req.body.forceRefresh);
    const bulletin = await generateAIBulletin(weatherData, forceRefresh);
    res.json(bulletin);
  } catch (err: any) {
    console.error('Error in /api/v1/ai/generate-bulletin:', err);
    res.status(500).json({ error: 'Failed to generate AI bulletin', details: err?.message });
  }
});

// GET /api/data-sources - Returns dynamic connection and authentication status
router.get('/data-sources', (_req: Request, res: Response) => {
  const weatherApiUrl = process.env.VITE_WEATHER_API_URL || process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
  const weatherApiKey = Boolean(process.env.VITE_WEATHER_API_KEY || process.env.WEATHER_API_KEY);

  const mosdacApiUrl = process.env.VITE_MOSDAC_API_URL || process.env.MOSDAC_API_URL || '';
  const mosdacApiKey = Boolean(process.env.VITE_MOSDAC_API_KEY || process.env.MOSDAC_API_KEY);

  const radarApiUrl = process.env.VITE_RADAR_API_URL || process.env.RADAR_API_URL || '';
  const radarApiKey = Boolean(process.env.VITE_RADAR_API_KEY || process.env.RADAR_API_KEY);

  const lightningApiUrl = process.env.VITE_LIGHTNING_API_URL || process.env.LIGHTNING_API_URL || '';
  const lightningApiKey = Boolean(process.env.VITE_LIGHTNING_API_KEY || process.env.LIGHTNING_API_KEY);

  res.json({
    timestamp: new Date().toISOString(),
    sources: [
      {
        id: 'weather',
        name: 'Surface Weather Telemetry',
        category: 'ATMOSPHERIC_OBS',
        configured: Boolean(weatherApiUrl),
        hasKey: weatherApiKey,
        provider: weatherApiUrl.includes('open-meteo') ? 'Open-Meteo Public API' : 'Custom Weather API',
        status: 'LIVE',
        authRequired: false,
      },
      {
        id: 'satellite',
        name: 'MOSDAC / ISRO Satellite (INSAT-3DR)',
        category: 'GEO_SATELLITE',
        configured: Boolean(mosdacApiUrl && mosdacApiKey),
        hasKey: mosdacApiKey,
        provider: 'ISRO Space Applications Centre',
        status: Boolean(mosdacApiUrl && mosdacApiKey) ? 'LIVE' : 'NOT_CONFIGURED',
        authRequired: true,
        authMessage: 'MOSDAC authentication/data access required.',
      },
      {
        id: 'radar',
        name: 'Doppler Weather Radar (DWR)',
        category: 'DOPPLER_RADAR',
        configured: Boolean(radarApiUrl),
        hasKey: radarApiKey,
        provider: 'India Meteorological Department (IMD)',
        status: Boolean(radarApiUrl) ? 'LIVE' : 'NOT_CONFIGURED',
        authRequired: true,
        authMessage: 'Radar data source not configured. Raw polar volumetric scans require departmental authorization.',
      },
      {
        id: 'lightning',
        name: 'Ground Lightning Sensors (LDS)',
        category: 'LIGHTNING_SENSORS',
        configured: Boolean(lightningApiUrl && lightningApiKey),
        hasKey: lightningApiKey,
        provider: 'IITM Damini / National LDS',
        status: Boolean(lightningApiUrl && lightningApiKey) ? 'LIVE' : 'AI_ESTIMATED',
        authRequired: true,
        authMessage: 'Direct lightning observations unavailable. AI risk model active.',
      },
      {
        id: 'ai_model',
        name: 'Prototype Nowcasting Model',
        category: 'NOWCASTING_ENGINE',
        configured: true,
        hasKey: true,
        provider: 'Convective Baseline Pipeline',
        status: 'AVAILABLE',
        authRequired: false,
      },
    ],
  });
});

// ============================================================================
// USER ACTIVITY LOGGING & AUDIT TRAIL API
// Writes to PostgreSQL / Supabase user_activities table if keyed; maintains ring buffer
// ============================================================================
interface ServerActivityRecord {
  id?: string;
  userId?: string | null;
  sessionId: string;
  activityType: string;
  activityCategory: string;
  description: string;
  stationCode?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

const serverActivityRingBuffer: ServerActivityRecord[] = [];

// POST /api/auth/activity
router.post('/auth/activity', async (req: Request, res: Response) => {
  try {
    const record: ServerActivityRecord = {
      ...req.body,
      createdAt: req.body.createdAt || new Date().toISOString(),
      id: req.body.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    serverActivityRingBuffer.unshift(record);
    if (serverActivityRingBuffer.length > 200) {
      serverActivityRingBuffer.pop();
    }

    // Forward to Supabase user_activities table if credentials are set
    const { url, anonKey } = dataSourceConfigStore.getSupabaseSecrets();
    if (url && anonKey) {
      try {
        await fetch(`${url}/rest/v1/user_activities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            user_id: record.userId || null,
            session_id: record.sessionId,
            activity_type: record.activityType,
            activity_category: record.activityCategory || 'GENERAL',
            description: record.description,
            station_code: record.stationCode || null,
            latitude: record.latitude || null,
            longitude: record.longitude || null,
            metadata: record.metadata || {},
          }),
        });
      } catch (subErr) {
        console.warn('Backend Supabase insert notice:', subErr);
      }
    }

    res.status(201).json({ success: true, record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record activity';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/auth/activities
router.get('/auth/activities', (_req: Request, res: Response) => {
  res.json({
    activities: serverActivityRingBuffer.slice(0, 50),
    totalCount: serverActivityRingBuffer.length,
  });
});

// GET /api/auth/analytics
router.get('/auth/analytics', (_req: Request, res: Response) => {
  const counts: Record<string, {
    activityDate: string;
    activityType: string;
    activityCategory: string;
    stationCode?: string;
    totalEvents: number;
    uniqueSessions: Set<string>;
    uniqueUsers: Set<string>;
  }> = {};

  for (const act of serverActivityRingBuffer) {
    const date = (act.createdAt || new Date().toISOString()).split('T')[0];
    const key = `${date}_${act.activityType}_${act.stationCode || 'GLOBAL'}`;
    if (!counts[key]) {
      counts[key] = {
        activityDate: date,
        activityType: act.activityType,
        activityCategory: act.activityCategory || 'GENERAL',
        stationCode: act.stationCode,
        totalEvents: 0,
        uniqueSessions: new Set<string>(),
        uniqueUsers: new Set<string>(),
      };
    }
    counts[key].totalEvents++;
    if (act.sessionId) counts[key].uniqueSessions.add(act.sessionId);
    if (act.userId) counts[key].uniqueUsers.add(act.userId);
  }

  const analytics = Object.values(counts).map((c) => ({
    activityDate: c.activityDate,
    activityType: c.activityType,
    activityCategory: c.activityCategory,
    stationCode: c.stationCode,
    totalEvents: c.totalEvents,
    uniqueSessions: c.uniqueSessions.size,
    uniqueUsers: c.uniqueUsers.size,
  }));

  res.json({ analytics });
});

export default router;
