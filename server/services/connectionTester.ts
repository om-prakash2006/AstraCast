/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH26072 Secure Server-Side Connection Tester
 *
 * Executes real verification probes for each data source without
 * ever echoing or exposing API keys in response payloads or console.
 */

import { dataSourceConfigStore } from './dataSourceConfigStore';

export interface TestResult {
  success: boolean;
  status: 'CONNECTED' | 'CONNECTION_FAILED' | 'NOT_CONFIGURED';
  message: string;
}

export async function testServiceConnection(
  service: string,
  providedUrl?: string,
  providedKey?: string
): Promise<TestResult> {
  const serviceKey = service.toLowerCase();

  switch (serviceKey) {
    case 'supabase': {
      const url = (providedUrl || dataSourceConfigStore.getSupabaseSecrets().url || '').trim();
      const key = (providedKey || dataSourceConfigStore.getSupabaseSecrets().anonKey || '').trim();

      if (!url || !key) {
        const res: TestResult = {
          success: false,
          status: 'NOT_CONFIGURED',
          message: 'Both Supabase URL and Anon Key are required.',
        };
        dataSourceConfigStore.recordTestResult('supabase', false, res.message);
        return res;
      }

      try {
        const cleanBase = url.replace(/\/+$/, '');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        // Ping PostgREST root
        const pingRes = await fetch(`${cleanBase}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (pingRes.ok || pingRes.status === 200 || pingRes.status === 204) {
          const res: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: `Supabase connected successfully (HTTP ${pingRes.status} OK).`,
          };
          dataSourceConfigStore.recordTestResult('supabase', true, res.message);
          return res;
        }

        if (pingRes.status === 401 || pingRes.status === 403) {
          const res: TestResult = {
            success: false,
            status: 'CONNECTION_FAILED',
            message: 'Authentication failed: Invalid Supabase Anon Key (HTTP 401).',
          };
          dataSourceConfigStore.recordTestResult('supabase', false, res.message);
          return res;
        }

        const res: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Supabase server returned HTTP ${pingRes.status}.`,
        };
        dataSourceConfigStore.recordTestResult('supabase', false, res.message);
        return res;
      } catch (err: any) {
        const res: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Network error connecting to Supabase (${err?.name === 'AbortError' ? 'Connection timed out' : 'Unreachable host'}).`,
        };
        dataSourceConfigStore.recordTestResult('supabase', false, res.message);
        return res;
      }
    }

    case 'tomorrowio':
    case 'tomorrow_io':
    case 'tomorrow': {
      const key = (providedKey || dataSourceConfigStore.getTomorrowIoKey() || '').trim();

      if (!key) {
        const res: TestResult = {
          success: false,
          status: 'NOT_CONFIGURED',
          message: 'Tomorrow.io API Key is required.',
        };
        dataSourceConfigStore.recordTestResult('tomorrowIo', false, res.message);
        return res;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        // Test with sample coordinates (Kolkata DWR station: 22.57, 88.36)
        const endpoint = `https://api.tomorrow.io/v4/weather/realtime?location=22.57,88.36&apikey=${encodeURIComponent(key)}`;
        const testRes = await fetch(endpoint, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (testRes.ok) {
          const res: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: 'Tomorrow.io API connected successfully. Real-time telemetry operational.',
          };
          dataSourceConfigStore.recordTestResult('tomorrowIo', true, res.message);
          return res;
        }

        if (testRes.status === 401 || testRes.status === 403) {
          const res: TestResult = {
            success: false,
            status: 'CONNECTION_FAILED',
            message: 'Authentication failed: Invalid Tomorrow.io API Key (HTTP 401/403).',
          };
          dataSourceConfigStore.recordTestResult('tomorrowIo', false, res.message);
          return res;
        }

        if (testRes.status === 429) {
          const res: TestResult = {
            success: false,
            status: 'CONNECTION_FAILED',
            message: 'Tomorrow.io rate limit reached (HTTP 429). Valid key detected.',
          };
          dataSourceConfigStore.recordTestResult('tomorrowIo', false, res.message);
          return res;
        }

        const res: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Tomorrow.io gateway responded with HTTP status ${testRes.status}.`,
        };
        dataSourceConfigStore.recordTestResult('tomorrowIo', false, res.message);
        return res;
      } catch (err: any) {
        const res: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Network error connecting to Tomorrow.io (${err?.name === 'AbortError' ? 'Timed out' : 'Network failure'}).`,
        };
        dataSourceConfigStore.recordTestResult('tomorrowIo', false, res.message);
        return res;
      }
    }

    case 'openmeteo':
    case 'open_meteo':
    case 'open-meteo': {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const testUrl = 'https://api.open-meteo.com/v1/forecast?latitude=22.57&longitude=88.36&current=temperature_2m,relative_humidity_2m';
        const res = await fetch(testUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const r: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: 'Open-Meteo public API connected successfully (No API key needed).',
          };
          dataSourceConfigStore.recordTestResult('openMeteo', true, r.message);
          return r;
        }

        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Open-Meteo responded with HTTP status ${res.status}.`,
        };
        dataSourceConfigStore.recordTestResult('openMeteo', false, r.message);
        return r;
      } catch (err: any) {
        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: 'Failed to connect to Open-Meteo public service.',
        };
        dataSourceConfigStore.recordTestResult('openMeteo', false, r.message);
        return r;
      }
    }

    case 'rainviewer': {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const r: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: 'RainViewer public radar composite connected successfully (No API key needed).',
          };
          dataSourceConfigStore.recordTestResult('rainViewer', true, r.message);
          return r;
        }

        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `RainViewer API responded with HTTP status ${res.status}.`,
        };
        dataSourceConfigStore.recordTestResult('rainViewer', false, r.message);
        return r;
      } catch (err: any) {
        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: 'Failed to connect to RainViewer radar composite.',
        };
        dataSourceConfigStore.recordTestResult('rainViewer', false, r.message);
        return r;
      }
    }

    case 'mosdac': {
      const url = (providedUrl || dataSourceConfigStore.getMosdacSecrets().url || '').trim();
      const key = (providedKey || dataSourceConfigStore.getMosdacSecrets().apiKey || '').trim();

      if (!url || !key) {
        const r: TestResult = {
          success: false,
          status: 'NOT_CONFIGURED',
          message: 'Authentication/data access required. Set MOSDAC API URL & Key.',
        };
        dataSourceConfigStore.recordTestResult('mosdac', false, r.message);
        return r;
      }

      try {
        const cleanBase = url.replace(/\/+$/, '');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(`${cleanBase}/insat3dr/rapid-scan?lat=22.57&lng=88.36`, {
          headers: {
            'Authorization': `Bearer ${key}`,
            'X-Mosdac-Key': key,
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const r: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: 'ISRO MOSDAC Satellite Gateway connected (INSAT-3DR Rapid-Scan active).',
          };
          dataSourceConfigStore.recordTestResult('mosdac', true, r.message);
          return r;
        }

        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `MOSDAC gateway authentication failed with HTTP status ${res.status}.`,
        };
        dataSourceConfigStore.recordTestResult('mosdac', false, r.message);
        return r;
      } catch (err: any) {
        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Network error connecting to MOSDAC (${err?.name === 'AbortError' ? 'Timed out' : 'Unreachable endpoint'}).`,
        };
        dataSourceConfigStore.recordTestResult('mosdac', false, r.message);
        return r;
      }
    }

    case 'lightning': {
      const url = (providedUrl || dataSourceConfigStore.getLightningSecrets().url || '').trim();
      const key = (providedKey || dataSourceConfigStore.getLightningSecrets().apiKey || '').trim();

      if (!url || !key) {
        const r: TestResult = {
          success: false,
          status: 'NOT_CONFIGURED',
          message: 'Direct lightning observations unavailable (AI Risk Estimator active). Direct sensor key not configured.',
        };
        dataSourceConfigStore.recordTestResult('lightning', false, r.message);
        return r;
      }

      try {
        const cleanBase = url.replace(/\/+$/, '');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        const res = await fetch(`${cleanBase}/strikes/nearby?lat=22.57&lng=88.36&radiusKm=50`, {
          headers: { 'Authorization': `Bearer ${key}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok) {
          const r: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: 'Connected to Ground Lightning Detection Network (LDS). Direct observations active.',
          };
          dataSourceConfigStore.recordTestResult('lightning', true, r.message);
          return r;
        }

        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Lightning gateway returned HTTP status ${res.status}. Direct feed unavailable.`,
        };
        dataSourceConfigStore.recordTestResult('lightning', false, r.message);
        return r;
      } catch (err: any) {
        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Network error connecting to Lightning gateway (${err?.name === 'AbortError' ? 'Timed out' : 'Unreachable'}).`,
        };
        dataSourceConfigStore.recordTestResult('lightning', false, r.message);
        return r;
      }
    }

    case 'nowcastml':
    case 'nowcast_ml':
    case 'nowcast': {
      const url = (providedUrl || dataSourceConfigStore.getNowcastMlSecrets().url || '/api/forecast').trim();
      const isLocalPrototype = url.startsWith('/') || url.includes('localhost') || url.includes('127.0.0.1');

      if (isLocalPrototype) {
        const r: TestResult = {
          success: true,
          status: 'CONNECTED',
          message: 'Prototype Nowcast API active (Internal convective baseline; not an operational certified forecast).',
        };
        dataSourceConfigStore.recordTestResult('nowcastMl', true, r.message);
        return r;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const res = await fetch(`${url.replace(/\/+$/, '')}/health`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const r: TestResult = {
            success: true,
            status: 'CONNECTED',
            message: 'External Python Nowcasting ML Service is healthy and operational.',
          };
          dataSourceConfigStore.recordTestResult('nowcastMl', true, r.message);
          return r;
        }

        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Remote ML service returned HTTP status ${res.status}.`,
        };
        dataSourceConfigStore.recordTestResult('nowcastMl', false, r.message);
        return r;
      } catch (err: any) {
        const r: TestResult = {
          success: false,
          status: 'CONNECTION_FAILED',
          message: `Failed to reach external ML service (${err?.name === 'AbortError' ? 'Timed out' : 'Unreachable'}). Falling back to Prototype Nowcast API.`,
        };
        dataSourceConfigStore.recordTestResult('nowcastMl', false, r.message);
        return r;
      }
    }

    default:
      return {
        success: false,
        status: 'CONNECTION_FAILED',
        message: `Unknown service: ${service}`,
      };
  }
}
