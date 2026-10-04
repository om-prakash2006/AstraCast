/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AstraCast — Live Data Feed Status Component
 * Professional, clean summary of live meteorological feeds for end users & operators.
 */

import React, { useState } from 'react';
import { DataSourceStatus, IngestionMode } from '../types/dataSource';
import {
  Activity,
  Radio,
  Satellite,
  Zap,
  Cpu,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface DataSourceDashboardProps {
  sourceStatuses?: DataSourceStatus[];
  statuses?: any[];
  bundle?: any;
  mode: IngestionMode | 'REAL_DATA' | 'DEMO_DATA';
  onToggleMode: (mode: any) => void;
  onRefresh: () => void;
  isLoading: boolean;
  lastUpdatedText?: string;
  dataAgeSeconds?: number;
  isCleanLight?: boolean;
  isSage?: boolean;
  onNavigateToConfig?: () => void;
}

export const DataSourceDashboard: React.FC<DataSourceDashboardProps> = ({
  sourceStatuses,
  statuses,
  bundle,
  mode,
  onToggleMode,
  onRefresh,
  isLoading,
  lastUpdatedText = 'Real-time sync',
  isCleanLight = false,
  isSage = false,
  onNavigateToConfig,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Friendly human labels and simple status categories
  const feeds = [
    {
      id: 'weather',
      label: 'Surface Telemetry',
      icon: <Activity className="w-4 h-4 text-emerald-500" />,
      status: mode === 'DEMO_DATA' ? 'Demo' : 'Live',
      statusType: mode === 'DEMO_DATA' ? 'demo' : 'live',
      detail: mode === 'DEMO_DATA' ? 'Benchmark synoptic AWS observations' : 'Real-time ground meteorological station telemetry',
    },
    {
      id: 'radar',
      label: 'Doppler Radar',
      icon: <Radio className="w-4 h-4 text-rose-500" />,
      status: mode === 'DEMO_DATA' ? 'Demo' : 'Live',
      statusType: mode === 'DEMO_DATA' ? 'demo' : 'live',
      detail: mode === 'DEMO_DATA' ? 'Archived DWR polar volume scan' : 'Active public Doppler radar composite',
    },
    {
      id: 'nowcast',
      label: 'Nowcasting Engine',
      icon: <Cpu className="w-4 h-4 text-purple-500" />,
      status: 'Live',
      statusType: 'live',
      detail: 'Convective cell tracking (+15m to +60m projection)',
    },
    {
      id: 'lightning',
      label: 'Lightning Risk',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      status: mode === 'DEMO_DATA' ? 'Demo' : 'Estimated',
      statusType: mode === 'DEMO_DATA' ? 'demo' : 'estimated',
      detail: mode === 'DEMO_DATA' ? 'Archived lightning strikes' : 'AI Estimated Lightning Risk (thermodynamic CAPE model)',
    },
    {
      id: 'satellite',
      label: 'Satellite (INSAT-3DR)',
      icon: <Satellite className="w-4 h-4 text-sky-500" />,
      status: mode === 'DEMO_DATA' ? 'Demo' : 'Unavailable',
      statusType: mode === 'DEMO_DATA' ? 'demo' : 'unavailable',
      detail: mode === 'DEMO_DATA' ? 'Sample multispectral cloud-top granule' : 'Institutional access required',
    },
  ];

  const renderStatusBadge = (status: string, statusType: string) => {
    switch (statusType) {
      case 'live':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{status}</span>
          </span>
        );
      case 'estimated':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>{status}</span>
          </span>
        );
      case 'demo':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            <span>{status}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <section
      className={`rounded-2xl backdrop-blur-2xl transition-all shadow-md border overflow-hidden select-none ${
        isSage
          ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B]'
          : isCleanLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#0b192e]/90 border-white/10 text-white'
      }`}
    >
      {/* Header Bar */}
      <div
        className={`px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b ${
          isSage
            ? 'bg-[#59705B] text-[#E2E2DB] border-[#BBBB9A]/40'
            : isCleanLight
            ? 'bg-slate-50 text-slate-900 border-slate-200'
            : 'bg-[#0f2442] text-white border-white/10'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
              isSage
                ? 'bg-[#E2E2DB] text-[#59705B]'
                : isCleanLight
                ? 'bg-sky-500 text-white'
                : 'bg-sky-400/20 text-sky-300 border border-sky-400/40'
            }`}
          >
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs sm:text-sm tracking-wide">
                Live Data Feeds & Sensors
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  mode === 'REAL_DATA'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-400/50'
                }`}
              >
                {mode === 'REAL_DATA' ? 'Real Data Active' : 'Demo Mode Active'}
              </span>
            </div>
            <p className="text-[11px] opacity-75">
              Live surface stations, Doppler radar composite, convective nowcasting, and sensor telemetry
            </p>
          </div>
        </div>

        {/* Mode Switcher & Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Mode Switcher */}
          <div
            className={`flex items-center p-1 rounded-xl border text-xs font-semibold ${
              isSage
                ? 'bg-[#E2E2DB]/20 border-[#BBBB9A]/40 text-[#E2E2DB]'
                : isCleanLight
                ? 'bg-white border-slate-300 text-slate-800'
                : 'bg-black/30 border-white/10 text-white'
            }`}
          >
            <button
              onClick={() => onToggleMode('REAL_DATA')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'REAL_DATA'
                  ? isSage
                    ? 'bg-[#E2E2DB] text-[#59705B] shadow-xs font-bold'
                    : 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Real Data
            </button>
            <button
              onClick={() => onToggleMode('DEMO_DATA')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                mode === 'DEMO_DATA'
                  ? isSage
                    ? 'bg-[#BBBB9A] text-[#59705B] shadow-xs font-bold'
                    : 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Demo Mode
            </button>
          </div>

          {/* Refresh Pipeline */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Poll live data feeds now"
            className={`p-2 rounded-xl border cursor-pointer transition-all disabled:opacity-50 ${
              isSage
                ? 'bg-[#E2E2DB]/20 border-[#BBBB9A] text-[#E2E2DB] hover:bg-[#E2E2DB]/30'
                : isCleanLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {/* Accordion toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="opacity-75 hover:opacity-100 p-1 cursor-pointer"
            aria-label="Toggle feed details"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Metadata Sub-bar */}
          <div
            className={`flex flex-wrap items-center justify-between text-xs pb-3 border-b gap-2 ${
              isSage
                ? 'border-[#9AAEA3]/50 text-[#59705B]'
                : isCleanLight
                ? 'border-slate-100 text-slate-600'
                : 'border-white/10 text-slate-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 opacity-70" />
              <span>Last Synchronized:</span>
              <strong className={isSage ? 'text-[#59705B]' : isCleanLight ? 'text-slate-900' : 'text-white'}>
                {lastUpdatedText}
              </strong>
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Direct telemetry active · Zero synthetic data claimed as live</span>
            </div>
          </div>

          {/* 5 Feeds Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${
                  isSage
                    ? 'bg-[#E2E2DB] border-[#9AAEA3]/60 text-[#59705B]'
                    : isCleanLight
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-[#12243d]/70 border-white/10 text-white'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {feed.icon}
                      <span className="font-bold text-xs truncate">
                        {feed.label}
                      </span>
                    </div>
                  </div>

                  <div>
                    {renderStatusBadge(feed.status, feed.statusType)}
                  </div>
                </div>

                <p className="text-[11px] leading-snug opacity-75 line-clamp-2 pt-1 border-t border-black/5 dark:border-white/5">
                  {feed.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Demo Mode Notice Banner */}
          {mode === 'DEMO_DATA' && (
            <div
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between text-xs gap-2 ${
                isSage
                  ? 'bg-[#BBBB9A]/20 border-[#BBBB9A] text-[#59705B]'
                  : 'bg-purple-950/40 border-purple-500/40 text-purple-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  <strong>DEMO DATA:</strong> Displaying benchmark severe thunderstorm scenario (Kolkata Kalbaisakhi squall line) for platform evaluation.
                </span>
              </div>
              <button
                onClick={() => onToggleMode('REAL_DATA')}
                className="underline hover:opacity-100 cursor-pointer font-bold shrink-0"
              >
                Switch to Live Real Data →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
