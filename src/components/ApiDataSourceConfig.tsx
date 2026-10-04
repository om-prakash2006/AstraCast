/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH26072 — API & Data Source Configuration
 *
 * CRITICAL SECURITY DISCIPLINE:
 * 1. Password-type inputs for all secret keys.
 * 2. Never displays or echoes saved secret values.
 * 3. Never logs secret values to console.
 * 4. Shows masked values ('••••••••••••••••••••') and 'Configured ✓' indicators only.
 * 5. Connection tests run via secure server-side probe without leaking tokens.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Database,
  CloudRain,
  Satellite,
  Radar,
  Zap,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  ExternalLink,
  Lock,
  Radio,
  Server,
} from 'lucide-react';

export interface SourceConfigItem {
  sourceId: string;
  sourceName: string;
  isConfigured: boolean;
  maskedKey: string;
  configuredUrl: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ESTIMATED' | 'CONNECTION_FAILED' | 'NOT_REQUIRED';
  statusLabel: string;
  lastTested: string | null;
  lastTestSuccess: boolean | null;
  testMessage: string;
  requiresKey: boolean;
  notes: string;
}

interface ApiDataSourceConfigProps {
  isSage?: boolean;
  isCleanLight?: boolean;
  onRefreshTelemetry?: () => void;
}

export const ApiDataSourceConfig: React.FC<ApiDataSourceConfigProps> = ({
  isSage = false,
  isCleanLight = false,
  onRefreshTelemetry,
}) => {
  const [sources, setSources] = useState<SourceConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<{ [key: string]: string }>({});
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{
    [key: string]: { success: boolean; status: string; message: string };
  }>({});

  // Input states (temporary for entry; never pre-filled with secrets)
  const [supabaseUrl, setSupabaseUrl] = useState<string>('https://xplqemhiyaictydxppdq.supabase.co');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState<string>('');

  const [tomorrowApiKey, setTomorrowApiKey] = useState<string>('');

  const [mosdacUrl, setMosdacUrl] = useState<string>('');
  const [mosdacApiKey, setMosdacApiKey] = useState<string>('');

  const [lightningUrl, setLightningUrl] = useState<string>('');
  const [lightningApiKey, setLightningApiKey] = useState<string>('');

  const [nowcastUrl, setNowcastUrl] = useState<string>('/api/forecast');
  const [nowcastApiKey, setNowcastApiKey] = useState<string>('');

  // Fetch status from server
  const fetchStatuses = async () => {
    try {
      const res = await fetch('/api/config/datasources');
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
        // Update URL inputs if server returned non-default URLs
        const sup = data.sources?.find((s: SourceConfigItem) => s.sourceId === 'supabase');
        if (sup?.configuredUrl) setSupabaseUrl(sup.configuredUrl);
        const mos = data.sources?.find((s: SourceConfigItem) => s.sourceId === 'mosdac');
        if (mos?.configuredUrl) setMosdacUrl(mos.configuredUrl);
        const ltg = data.sources?.find((s: SourceConfigItem) => s.sourceId === 'lightning');
        if (ltg?.configuredUrl) setLightningUrl(ltg.configuredUrl);
        const nwc = data.sources?.find((s: SourceConfigItem) => s.sourceId === 'nowcastMl');
        if (nwc?.configuredUrl) setNowcastUrl(nwc.configuredUrl);
      }
    } catch {
      // Offline fallback: keep current state
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, []);

  // Save credential
  const handleSave = async (service: string, url?: string, apiKey?: string) => {
    try {
      const res = await fetch('/api/config/datasources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, url, apiKey }),
      });
      if (res.ok) {
        setSaveSuccessMsg((prev) => ({ ...prev, [service]: 'Saved ✓' }));
        setTimeout(() => {
          setSaveSuccessMsg((prev) => {
            const next = { ...prev };
            delete next[service];
            return next;
          });
        }, 3000);

        // Clear password inputs immediately after saving so they are not left in DOM
        if (service === 'supabase') setSupabaseAnonKey('');
        if (service === 'tomorrow') setTomorrowApiKey('');
        if (service === 'mosdac') setMosdacApiKey('');
        if (service === 'lightning') setLightningApiKey('');
        if (service === 'nowcast') setNowcastApiKey('');

        // Refresh statuses
        await fetchStatuses();
        if (onRefreshTelemetry) onRefreshTelemetry();
      }
    } catch {
      setSaveSuccessMsg((prev) => ({ ...prev, [service]: 'Failed to save' }));
    }
  };

  // Test connection
  const handleTestConnection = async (service: string, url?: string, apiKey?: string) => {
    setTestingService(service);
    try {
      const res = await fetch('/api/config/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, url, apiKey }),
      });
      const result = await res.json();
      setTestResults((prev) => ({ ...prev, [service]: result }));
      await fetchStatuses();
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          success: false,
          status: 'CONNECTION_FAILED',
          message: 'Connection probe failed. Check server status.',
        },
      }));
    } finally {
      setTestingService(null);
    }
  };

  const getSourceItem = (id: string): SourceConfigItem | undefined => {
    return sources.find((s) => s.sourceId === id);
  };

  // Format status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            🟢 CONNECTED
          </span>
        );
      case 'NOT_CONFIGURED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            🟡 NOT CONFIGURED
          </span>
        );
      case 'ESTIMATED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            🟡 ESTIMATED (AI MODEL)
          </span>
        );
      case 'CONNECTION_FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-400"></span>
            🔴 CONNECTION FAILED
          </span>
        );
      case 'NOT_REQUIRED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            ⚪ NOT REQUIRED
          </span>
        );
    }
  };

  const cardBgClass = isSage
    ? 'bg-[#E2E2DB] border-[#9AAEA3] text-[#59705B]'
    : isCleanLight
    ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
    : 'bg-[#0f1f38]/90 border-slate-700/60 text-slate-100 shadow-xl';

  const inputClass = isSage
    ? 'bg-[#F2F2EC] border-[#9AAEA3] text-[#59705B] focus:border-[#59705B] placeholder-[#9AAEA3]'
    : isCleanLight
    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500 placeholder-slate-400'
    : 'bg-slate-900/90 border-slate-700 text-slate-100 focus:border-emerald-500 placeholder-slate-500';

  const btnPrimary = isSage
    ? 'bg-[#59705B] hover:bg-[#4a5f4c] text-[#E2E2DB]'
    : isCleanLight
    ? 'bg-sky-600 hover:bg-sky-500 text-white'
    : 'bg-emerald-600 hover:bg-emerald-500 text-white';

  const btnSecondary = isSage
    ? 'bg-[#BBBB9A]/50 hover:bg-[#BBBB9A] text-[#59705B] border border-[#9AAEA3]'
    : isCleanLight
    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600';

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner */}
      <div
        className={`p-6 rounded-3xl border backdrop-blur-2xl transition-all ${cardBgClass}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-black uppercase tracking-wider font-mono">
                API & Data Source Configuration
              </h1>
            </div>
            <p className="text-xs opacity-80 leading-relaxed font-sans max-w-3xl">
              Configure credentials and endpoints for external meteorological telemetry pipelines. All secret keys are stored strictly server-side, never exposed to browser logs, and masked in the UI.
            </p>
          </div>
          <button
            onClick={fetchStatuses}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-3 rounded-2xl bg-black/15 border border-current/10 flex items-start gap-2.5 text-[11px] font-mono">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="text-emerald-400 font-bold">SECURITY ENFORCEMENT:</strong>
            <p className="opacity-80">
              API keys are password-typed and never shown after saving. The interface displays only &quot;Configured ✓&quot; and &quot;••••••••••&quot;. Connection tests are executed server-side without leaking authorization headers.
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* DATA SOURCE STATUS TABLE                                        */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl overflow-hidden ${cardBgClass}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-wider font-mono flex items-center gap-2">
            <Server className="w-4 h-4 text-sky-400" />
            Data Source Status Table
          </h2>
          <span className="text-[10px] font-mono opacity-60">REAL-TIME TELEMETRY PIPELINES</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-current/10 text-[11px] opacity-75">
                <th className="pb-2.5 px-3">SOURCE</th>
                <th className="pb-2.5 px-3">STATUS</th>
                <th className="pb-2.5 px-3">LAST TESTED</th>
                <th className="pb-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-current/5">
              {[
                { id: 'supabase', name: 'Supabase', svc: 'supabase' },
                { id: 'tomorrowIo', name: 'Tomorrow.io', svc: 'tomorrow' },
                { id: 'openMeteo', name: 'Open-Meteo', svc: 'openmeteo' },
                { id: 'rainViewer', name: 'RainViewer', svc: 'rainviewer' },
                { id: 'mosdac', name: 'MOSDAC', svc: 'mosdac' },
                { id: 'lightning', name: 'Lightning', svc: 'lightning' },
                { id: 'nowcastMl', name: 'Nowcast ML', svc: 'nowcast' },
              ].map((row) => {
                const item = getSourceItem(row.id);
                const status = item?.status || 'NOT_CONFIGURED';
                const lastTested = item?.lastTested
                  ? new Date(item.lastTested).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: 'Asia/Kolkata',
                    }) + ' IST'
                  : '—';
                const isTesting = testingService === row.svc;

                return (
                  <tr key={row.id} className="hover:bg-current/5 transition-colors">
                    <td className="py-3 px-3 font-bold flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current/40"></span>
                      {row.name}
                    </td>
                    <td className="py-3 px-3">{renderStatusBadge(status)}</td>
                    <td className="py-3 px-3 opacity-75">{lastTested}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleTestConnection(row.svc)}
                        disabled={isTesting}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${btnSecondary}`}
                      >
                        {isTesting ? 'Testing...' : 'Test Connection'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. SUPABASE                                                    */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">1. Supabase</h3>
          </div>
          <div className="flex items-center gap-2">
            {getSourceItem('supabase')?.isConfigured ? (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured ✓ (••••••••••)
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-amber-400">Not configured</span>
            )}
          </div>
        </div>

        <p className="text-xs opacity-75 leading-relaxed font-sans">
          Connect your remote Supabase PostgreSQL records store for persistent logging of nowcasting verification scores and multi-sensor observations. Supports endpoint: <code className="px-1.5 py-0.5 rounded bg-black/20 font-mono">https://xplqemhiyaictydxppdq.supabase.co</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">Supabase URL</label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xplqemhiyaictydxppdq.supabase.co"
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">Supabase Anon Key</label>
            <input
              type="password"
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder={getSourceItem('supabase')?.isConfigured ? '•••••••••••••••••••• (Leave blank to keep existing)' : 'Enter Supabase anon public key'}
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleSave('supabase', supabaseUrl, supabaseAnonKey)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnPrimary}`}
          >
            Save Configuration
          </button>
          <button
            onClick={() => handleTestConnection('supabase', supabaseUrl, supabaseAnonKey)}
            disabled={testingService === 'supabase'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'supabase' ? 'Testing...' : 'Test Connection'}
          </button>
          {saveSuccessMsg['supabase'] && (
            <span className="text-xs font-mono font-bold text-emerald-400">
              {saveSuccessMsg['supabase']}
            </span>
          )}
        </div>

        {testResults['supabase'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['supabase'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['supabase'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['supabase'].message}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. WEATHER — TOMORROW.IO                                       */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">
              2. Weather — Tomorrow.io
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {getSourceItem('tomorrowIo')?.isConfigured ? (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured ✓ (••••••••••)
              </span>
            ) : (
              <span className="text-xs font-mono font-bold text-amber-400">Not configured</span>
            )}
          </div>
        </div>

        <p className="text-xs opacity-75 leading-relaxed font-sans">
          Enter <strong>ONLY</strong> your Tomorrow.io API Key. Do NOT paste complete URLs with <code className="px-1.5 py-0.5 rounded bg-black/20 font-mono">?apikey=...</code>; the application automatically constructs standard realtime and timeline API queries.
        </p>

        <div className="font-mono text-xs space-y-1.5 max-w-xl">
          <label className="font-bold opacity-80 block">Tomorrow.io API Key</label>
          <input
            type="password"
            value={tomorrowApiKey}
            onChange={(e) => setTomorrowApiKey(e.target.value)}
            placeholder={getSourceItem('tomorrowIo')?.isConfigured ? '•••••••••••••••••••• (Leave blank to keep existing)' : 'Enter Tomorrow.io API Key (e.g. abc123xyz...)'}
            className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleSave('tomorrow', undefined, tomorrowApiKey)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnPrimary}`}
          >
            Save Configuration
          </button>
          <button
            onClick={() => handleTestConnection('tomorrow', undefined, tomorrowApiKey)}
            disabled={testingService === 'tomorrow'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'tomorrow' ? 'Testing...' : 'Test Connection'}
          </button>
          {saveSuccessMsg['tomorrow'] && (
            <span className="text-xs font-mono font-bold text-emerald-400">
              {saveSuccessMsg['tomorrow']}
            </span>
          )}
        </div>

        {testResults['tomorrow'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['tomorrow'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['tomorrow'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['tomorrow'].message}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. WEATHER — OPEN-METEO                                        */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">
              3. Weather — Open-Meteo
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Status: Available without API key
          </span>
        </div>

        <p className="text-xs opacity-75 leading-relaxed font-sans">
          Open-Meteo does not require an API key for the configured public endpoint. High-resolution surface parameters, thermodynamic CAPE, and lifted index are actively streamed without registration.
        </p>

        <div className="p-3.5 rounded-2xl bg-black/15 border border-current/10 font-mono text-xs space-y-1">
          <div className="opacity-75">Configured Endpoint:</div>
          <code className="text-emerald-400 font-bold block break-all">
            https://api.open-meteo.com/v1/forecast
          </code>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleTestConnection('openmeteo')}
            disabled={testingService === 'openmeteo'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'openmeteo' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResults['openmeteo'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['openmeteo'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['openmeteo'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['openmeteo'].message}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 4. RADAR — RAINVIEWER                                          */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Radar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">
              4. Radar — RainViewer
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Status: Public endpoint (No API key needed)
          </span>
        </div>

        <p className="text-xs opacity-75 leading-relaxed font-sans">
          RainViewer public weather-map endpoint provides real-time global Doppler radar mosaic frames and tile cache streams. API Key is not required for this configured public endpoint. No fake keys are used.
        </p>

        <div className="p-3.5 rounded-2xl bg-black/15 border border-current/10 font-mono text-xs space-y-1">
          <div className="opacity-75">Configured Endpoint:</div>
          <code className="text-emerald-400 font-bold block break-all">
            https://api.rainviewer.com/public/weather-maps.json
          </code>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleTestConnection('rainviewer')}
            disabled={testingService === 'rainviewer'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'rainviewer' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {testResults['rainviewer'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['rainviewer'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['rainviewer'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['rainviewer'].message}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. SATELLITE — MOSDAC / ISRO                                   */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Satellite className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">
              5. Satellite — MOSDAC / ISRO
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {getSourceItem('mosdac')?.isConfigured ? (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured ✓ (••••••••••)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🟡 Authentication/data access required
              </span>
            )}
          </div>
        </div>

        <p className="text-xs opacity-75 leading-relaxed font-sans">
          INSAT-3D/3DR geostationary rapid-scan infrared and water vapour observations require registered institutional credentials from ISRO Space Applications Centre. <em>If no key is configured, default status is strictly marked as NOT CONFIGURED.</em>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">MOSDAC API URL</label>
            <input
              type="text"
              value={mosdacUrl}
              onChange={(e) => setMosdacUrl(e.target.value)}
              placeholder="https://mosdac.gov.in/api/v1 (or authorized proxy)"
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">MOSDAC API Key</label>
            <input
              type="password"
              value={mosdacApiKey}
              onChange={(e) => setMosdacApiKey(e.target.value)}
              placeholder={getSourceItem('mosdac')?.isConfigured ? '•••••••••••••••••••• (Leave blank to keep existing)' : 'Not configured'}
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleSave('mosdac', mosdacUrl, mosdacApiKey)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnPrimary}`}
          >
            Save Configuration
          </button>
          <button
            onClick={() => handleTestConnection('mosdac', mosdacUrl, mosdacApiKey)}
            disabled={testingService === 'mosdac'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'mosdac' ? 'Testing...' : 'Test Connection'}
          </button>
          {saveSuccessMsg['mosdac'] && (
            <span className="text-xs font-mono font-bold text-emerald-400">
              {saveSuccessMsg['mosdac']}
            </span>
          )}
        </div>

        {testResults['mosdac'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['mosdac'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['mosdac'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['mosdac'].message}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 6. LIGHTNING (DIRECT SENSORS vs. AI ESTIMATOR)                 */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">
              6. Lightning Sensor Network
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {getSourceItem('lightning')?.isConfigured ? (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Direct Observations Active (••••••••••)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                🟡 Direct lightning observations unavailable (AI Risk Estimator active)
              </span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-sans space-y-1">
          <strong className="text-amber-400 font-bold block font-mono">
            ARCHITECTURAL DISTINCTION:
          </strong>
          <p className="opacity-90 leading-relaxed">
            <strong>DIRECT LIGHTNING OBSERVATIONS:</strong> Requires physical ground sensor feeds (e.g. IITM Damini / National LDS).
            <br />
            <strong>AI ESTIMATED LIGHTNING RISK:</strong> When direct sensors are unconfigured, the application automatically computes electrical strike potential using convective thermodynamic CAPE and rain rate.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">Lightning API URL</label>
            <input
              type="text"
              value={lightningUrl}
              onChange={(e) => setLightningUrl(e.target.value)}
              placeholder="https://damini.tropmet.res.in/api (or sensor gateway)"
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">Lightning API Key</label>
            <input
              type="password"
              value={lightningApiKey}
              onChange={(e) => setLightningApiKey(e.target.value)}
              placeholder={getSourceItem('lightning')?.isConfigured ? '•••••••••••••••••••• (Leave blank to keep existing)' : 'Not configured'}
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleSave('lightning', lightningUrl, lightningApiKey)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnPrimary}`}
          >
            Save Configuration
          </button>
          <button
            onClick={() => handleTestConnection('lightning', lightningUrl, lightningApiKey)}
            disabled={testingService === 'lightning'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'lightning' ? 'Testing...' : 'Test Connection'}
          </button>
          {saveSuccessMsg['lightning'] && (
            <span className="text-xs font-mono font-bold text-emerald-400">
              {saveSuccessMsg['lightning']}
            </span>
          )}
        </div>

        {testResults['lightning'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['lightning'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['lightning'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['lightning'].message}</span>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 7. NOWCASTING ML API                                           */}
      {/* ============================================================== */}
      <div className={`p-6 rounded-3xl border backdrop-blur-2xl space-y-4 ${cardBgClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-current/10 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black uppercase font-mono tracking-wide">
              7. Nowcasting ML API
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            Prototype Nowcast API
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-black/15 border border-current/10 text-xs font-mono space-y-1">
          <span className="text-amber-400 font-bold block">DISCLAIMER / MODEL MATURITY:</span>
          <p className="opacity-80 font-sans text-xs leading-relaxed">
            The built-in engine is a <strong>Prototype Nowcast API</strong> (convective heuristic baseline for +15m, +30m, +45m, +60m timeline evaluation). It is not designated as a scientifically validated operational forecast. Point to an external Python ConvLSTM/U-Net service when deploying into production.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">Nowcast ML API URL</label>
            <input
              type="text"
              value={nowcastUrl}
              onChange={(e) => setNowcastUrl(e.target.value)}
              placeholder="/api/forecast (Default internal prototype)"
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-bold opacity-80 block">Nowcast ML API Key (Optional)</label>
            <input
              type="password"
              value={nowcastApiKey}
              onChange={(e) => setNowcastApiKey(e.target.value)}
              placeholder="Optional service token (Leave blank if local)"
              className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-xs ${inputClass}`}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => handleSave('nowcast', nowcastUrl, nowcastApiKey)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnPrimary}`}
          >
            Save Configuration
          </button>
          <button
            onClick={() => handleTestConnection('nowcast', nowcastUrl, nowcastApiKey)}
            disabled={testingService === 'nowcast'}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${btnSecondary}`}
          >
            {testingService === 'nowcast' ? 'Testing...' : 'Test Connection'}
          </button>
          {saveSuccessMsg['nowcast'] && (
            <span className="text-xs font-mono font-bold text-emerald-400">
              {saveSuccessMsg['nowcast']}
            </span>
          )}
        </div>

        {testResults['nowcast'] && (
          <div
            className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              testResults['nowcast'].success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResults['nowcast'].success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResults['nowcast'].message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
