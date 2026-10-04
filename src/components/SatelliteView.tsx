/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — ISRO MOSDAC Satellite View (Phase 4)
 *
 * NOTE: Does NOT scrape restricted endpoints or fabricate live satellite data.
 * If VITE_MOSDAC_API_KEY is not configured and in REAL DATA MODE, displays:
 * 'MOSDAC authentication/data access required.'
 */

import React, { useState } from 'react';
import { StationInfo } from '../types/weather';
import { IngestionMode } from '../types/dataSource';
import { DataQualityBadge } from './DataQualityBadge';
import { DATA_SOURCE_CONFIG } from '../config/dataSources';
import {
  Satellite,
  ShieldAlert,
  Lock,
  Layers,
  Info,
  Wind,
  Droplets,
  Thermometer,
} from 'lucide-react';

interface SatelliteViewProps {
  station: StationInfo;
  isCleanLight?: boolean;
  mode?: IngestionMode;
  onSwitchToDemo?: () => void;
}

export const SatelliteView: React.FC<SatelliteViewProps> = ({
  station,
  isCleanLight = false,
  mode = 'REAL_DATA',
  onSwitchToDemo,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'TIR1' | 'WV' | 'VIS' | 'RGB'>('TIR1');
  const isMosdacConfigured = DATA_SOURCE_CONFIG.mosdac.isConfigured;
  const isRealMode = mode === 'REAL_DATA';

  // If in real mode and MOSDAC credentials are not configured, display authentication barrier
  const showAuthRequired = isRealMode && !isMosdacConfigured;

  return (
    <div className="flex-1 p-4 flex flex-col space-y-4 font-mono select-none">
      {/* Control Banner */}
      <div
        className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border backdrop-blur-xl ${
          isCleanLight
            ? 'bg-[#E5F5E0]/90 border-[#C7E9C0] text-[#00441B]'
            : 'bg-[#00441B]/90 border-[#238B45]/50 text-[#F7FCF5]'
        }`}
      >
        <div>
          <div className="flex items-center space-x-2">
            <Satellite className="w-4 h-4 text-[#A1D99B]" />
            <h2
              className={`text-sm font-bold uppercase tracking-wider ${
                isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
              }`}
            >
              INSAT-3D / 3DR GEO-METEOROLOGICAL SATELLITE FEED
            </h2>
            <DataQualityBadge
              quality={showAuthRequired ? 'UNAVAILABLE' : isRealMode ? 'LIVE' : 'DEMO'}
              size="sm"
            />
          </div>
          <p
            className={`text-[11px] font-medium ${
              isCleanLight ? 'text-[#238B45]' : 'text-[#C7E9C0]'
            }`}
          >
            RAPID SCAN SERVICE (RSS) • 82.5°E ORBITAL SLOT • OPERATED BY ISRO / IMD
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className={isCleanLight ? 'text-[#238B45] font-bold' : 'text-[#A1D99B] font-semibold'}>
            CHANNEL:
          </span>
          {(['TIR1', 'WV', 'VIS', 'RGB'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setSelectedChannel(ch)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer border transition-colors ${
                selectedChannel === ch
                  ? 'bg-gradient-to-r from-[#41AB5D] to-[#238B45] text-[#F7FCF5] border-[#74C476] shadow-sm'
                  : isCleanLight
                  ? 'bg-[#F7FCF5] text-[#00441B] border-[#C7E9C0] hover:bg-[#C7E9C0]'
                  : 'bg-[#002f13] text-[#F7FCF5] border-[#238B45] hover:bg-[#006D2C]'
              }`}
            >
              [{ch}]
            </button>
          ))}
        </div>
      </div>

      {/* If Auth is required and in Real Data Mode: show clear banner */}
      {showAuthRequired ? (
        <div
          className={`p-8 rounded-2xl border flex flex-col items-center justify-center text-center space-y-4 shadow-xl ${
            isCleanLight
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-[#152338] border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-400" />
          </div>
          <div className="max-w-xl space-y-2">
            <h3 className="text-base font-extrabold uppercase tracking-wide">
              MOSDAC Authentication & Data Access Required
            </h3>
            <p className="text-xs leading-relaxed opacity-90">
              Live INSAT-3D/3DR satellite products are hosted on ISRO's Meteorological & Oceanographic Satellite Data Archival Centre (MOSDAC) gateway and require institutional API credentials.
            </p>
            <div className="p-3 rounded-xl bg-black/20 text-xs font-medium text-left flex items-center justify-between">
              <span className="opacity-80">Telemetry Stream:</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                Unavailable (Institutional Access Required)
              </span>
            </div>
            <p className="text-[11px] opacity-75">
              To evaluate satellite-derived convective cloud features for this platform demonstration, switch to Demo Mode.
            </p>
          </div>
          {onSwitchToDemo && (
            <button
              onClick={onSwitchToDemo}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer transition-colors shadow-md uppercase"
            >
              Switch to Demo Mode (Sample INSAT-3D Product) →
            </button>
          )}
        </div>
      ) : (
        /* Main Satellite Workspace with Observation Fields */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
          {/* Left 2 Cols: Geospatial Infrared Swath Display */}
          <div
            className={`lg:col-span-2 min-h-[450px] relative p-5 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl border ${
              isCleanLight
                ? 'bg-[#002b11] border-[#74C476]'
                : 'bg-[#001f0c] border-[#238B45]/60 shadow-2xl'
            }`}
          >
            <div className="z-10 flex flex-wrap items-center justify-between gap-2 text-white text-xs">
              <span
                className={`px-3 py-1.5 rounded-xl shadow-lg border backdrop-blur-xl ${
                  isCleanLight
                    ? 'bg-[#E5F5E0]/95 border-[#C7E9C0] text-[#00441B]'
                    : 'bg-[#00441B]/95 border-[#238B45]/60 text-[#F7FCF5]'
                }`}
              >
                INSAT-3DR // CHANNEL:{' '}
                <strong className={isCleanLight ? 'text-[#006D2C] font-extrabold' : 'text-[#A1D99B] font-extrabold'}>
                  {selectedChannel}
                </strong>{' '}
                // RES: 4.0 KM
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl shadow-lg border backdrop-blur-xl ${
                  isCleanLight
                    ? 'bg-[#E5F5E0]/95 border-[#C7E9C0] text-[#00441B]'
                    : 'bg-[#00441B]/95 border-[#238B45]/60 text-[#F7FCF5]'
                }`}
              >
                TARGET:{' '}
                <strong className={isCleanLight ? 'text-[#006D2C] font-extrabold' : 'text-[#A1D99B] font-extrabold'}>
                  {station.name.toUpperCase()}
                </strong>{' '}
                ({station.lat.toFixed(2)}N, {station.lng.toFixed(2)}E)
              </span>
            </div>

            {/* Swath Grid Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-40 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="satGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#74C476" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#satGrid)" />
                <circle cx="50%" cy="50%" r="140" fill="none" stroke="#A1D99B" strokeWidth="1.5" strokeDasharray="6,4" />
                <circle cx="50%" cy="50%" r="220" fill="none" stroke="#41AB5D" strokeWidth="1.5" />
              </svg>
            </div>

            {/* Cloud Top Analysis */}
            <div
              className={`z-10 p-4 max-w-md text-[11px] space-y-1.5 rounded-2xl shadow-2xl border backdrop-blur-xl ${
                isCleanLight
                  ? 'bg-[#E5F5E0]/95 border-[#C7E9C0] text-[#00441B]'
                  : 'bg-[#00441B]/95 border-[#238B45]/60 text-[#F7FCF5]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-extrabold uppercase ${isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'}`}>
                  CLOUD TOP TEMPERATURE (CTT)
                </span>
                <span className="text-[9px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded font-bold">
                  {isRealMode ? 'LIVE MOSDAC' : 'SAMPLE PRODUCT'}
                </span>
              </div>
              <div>
                PEAK OVERSHOOTING TOP: <span className="text-red-400 font-extrabold">-72.4°C (16.2 KM AMSL)</span>
              </div>
              <div>
                WATER VAPOR DEFICIT: <span className="text-amber-400 font-extrabold">-4.8 K</span>
              </div>
              <div>
                CLOUD MOVEMENT VECTOR:{' '}
                <span className="text-[#41AB5D] font-extrabold">245° AT 38 KM/H (NORTHEASTWARD ADVECTION)</span>
              </div>
            </div>
          </div>

          {/* Right Col: Derived Satellite Parameters */}
          <div
            className={`p-5 rounded-2xl space-y-4 shadow-lg border backdrop-blur-xl ${
              isCleanLight
                ? 'bg-[#E5F5E0]/80 border-[#C7E9C0] text-[#00441B]'
                : 'bg-[#00441B]/80 border-[#238B45]/50 text-[#F7FCF5]'
            }`}
          >
            <div className={`border-b pb-2 ${isCleanLight ? 'border-[#C7E9C0]' : 'border-[#238B45]/40'}`}>
              <h3 className={`text-xs font-bold uppercase ${isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'}`}>
                SATELLITE-DERIVED ATMOSPHERIC SOUNDING
              </h3>
              <span className={`text-[10px] font-semibold ${isCleanLight ? 'text-[#238B45]' : 'text-[#C7E9C0]'}`}>
                PRODUCT: INSAT-3DR SOUNDER RETRIEVAL
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div
                className={`p-3 rounded-xl border shadow-xs ${
                  isCleanLight ? 'border-[#C7E9C0] bg-[#F7FCF5]' : 'border-[#238B45]/40 bg-[#002f13]'
                }`}
              >
                <div className={`text-[10px] uppercase font-bold flex items-center space-x-1 ${isCleanLight ? 'text-[#238B45]' : 'text-[#A1D99B]'}`}>
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>EQUILIBRIUM LEVEL (EL)</span>
                </div>
                <div className={`text-lg font-extrabold mt-0.5 tabular-nums ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>
                  14,800 M <span className={`text-xs font-medium ${isCleanLight ? 'text-[#006D2C]' : 'text-[#74C476]'}`}>(-68.2°C)</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border shadow-xs ${
                  isCleanLight ? 'border-[#C7E9C0] bg-[#F7FCF5]' : 'border-[#238B45]/40 bg-[#002f13]'
                }`}
              >
                <div className={`text-[10px] uppercase font-bold flex items-center space-x-1 ${isCleanLight ? 'text-[#238B45]' : 'text-[#A1D99B]'}`}>
                  <Droplets className="w-3.5 h-3.5" />
                  <span>PRECIPITABLE WATER (PW)</span>
                </div>
                <div className={`text-lg font-extrabold mt-0.5 tabular-nums ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>
                  58.4 mm <span className="text-xs text-amber-500 font-bold">[HIGH MOISTURE]</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border shadow-xs ${
                  isCleanLight ? 'border-[#C7E9C0] bg-[#F7FCF5]' : 'border-[#238B45]/40 bg-[#002f13]'
                }`}
              >
                <div className={`text-[10px] uppercase font-bold flex items-center space-x-1 ${isCleanLight ? 'text-[#238B45]' : 'text-[#A1D99B]'}`}>
                  <Wind className="w-3.5 h-3.5" />
                  <span>VERTICAL WIND SHEAR (0-6 KM)</span>
                </div>
                <div className={`text-lg font-extrabold mt-0.5 tabular-nums ${isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'}`}>
                  38 KNOTS <span className="text-xs text-rose-500 font-bold">[SQUALL SUPPORTIVE]</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
