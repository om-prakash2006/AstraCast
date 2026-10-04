import { RadarTileResponse } from '../../src/types/weather';

interface RadarCache {
  timestamp: number;
  data: RadarTileResponse;
}

let cachedRadar: RadarCache | null = null;
const RADAR_CACHE_TTL_MS = 60 * 1000; // 1 minute cache

export async function fetchLiveRadarTiles(): Promise<RadarTileResponse> {
  const now = Date.now();
  if (cachedRadar && now - cachedRadar.timestamp < RADAR_CACHE_TTL_MS) {
    return cachedRadar.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`RainViewer API returned status ${res.status}`);
    }

    const data = await res.json();
    const host = data.host || 'https://tilecache.rainviewer.com';
    const past = data.radar?.past || [];
    const nowcast = data.radar?.nowcast || [];

    const latestFrame = past.length > 0 ? past[past.length - 1] : { time: Math.floor(now / 1000), path: '/v2/radar/now' };
    const latestPath = latestFrame.path;
    const latestTimestamp = latestFrame.time;

    // Palette 2: METVUW, smooth: 1, snow: 1
    const tileTemplate = `${host}${latestPath}/256/{z}/{x}/{y}/2/1_1.png`;

    const radarResponse: RadarTileResponse = {
      host,
      latestPath,
      latestTimestamp,
      pastFrames: past,
      nowcastFrames: nowcast,
      tileTemplate,
      colorPalette: 2,
    };

    cachedRadar = { timestamp: now, data: radarResponse };
    return radarResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Error fetching live RainViewer radar tiles:', err);

    if (cachedRadar) {
      return cachedRadar.data;
    }

    // Fallback template
    return {
      host: 'https://tilecache.rainviewer.com',
      latestPath: '/v2/radar/fallback',
      latestTimestamp: Math.floor(now / 1000),
      pastFrames: [],
      nowcastFrames: [],
      tileTemplate: 'https://tilecache.rainviewer.com/v2/radar/fallback/256/{z}/{x}/{y}/2/1_1.png',
      colorPalette: 2,
    };
  }
}
