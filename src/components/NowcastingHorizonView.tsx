/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Nowcasting Timeline Horizon View (+15m, +30m, +45m, +60m)
 */

import React from 'react';
import { NowcastResult } from '../types/nowcast';
import {
  Clock,
  Compass,
  Zap,
  CloudRain,
  Wind,
  ShieldAlert,
  Info,
} from 'lucide-react';

interface NowcastingHorizonViewProps {
  nowcast: NowcastResult;
  isCleanLight?: boolean;
  isSage?: boolean;
}

export const NowcastingHorizonView: React.FC<NowcastingHorizonViewProps> = ({
  nowcast,
  isCleanLight = false,
  isSage = false,
}) => {
  return (
    <div
      className={`rounded-2xl backdrop-blur-2xl transition-all p-4 sm:p-5 shadow-lg border select-none ${
        isSage
          ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B] shadow-[#59705B]/5'
          : isCleanLight
          ? 'bg-white/80 border-sky-200 text-slate-800 shadow-sky-900/5'
          : 'bg-[#0f1f38]/60 border-white/10 text-slate-100 shadow-black/30'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-black/5 dark:border-white/10 gap-2">
        <div className="flex items-center space-x-2">
          <Clock className={`w-4 h-4 ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`} />
          <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider">
            NOWCAST PREDICTION HORIZON // +15 / +30 / +45 / +60 MIN
          </h3>
          <span
            className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold ${
              isSage
                ? 'bg-[#BBBB9A]/30 text-[#59705B] border border-[#BBBB9A]'
                : 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
            }`}
          >
            {nowcast.isPrototypeModel ? 'PROTOTYPE NOWCASTING MODEL' : 'TRAINED ML MODEL'}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="flex items-center space-x-1">
            <Compass className="w-3.5 h-3.5 opacity-70" />
            <span>DIR: <strong>{Math.round(nowcast.predictedMovementDirection)}°</strong></span>
          </span>
          <span>·</span>
          <span>
            SPEED: <strong>{Math.round(nowcast.predictedMovementSpeed)} km/h</strong>
          </span>
        </div>
      </div>

      {/* 4 Horizon Cards (+15m, +30m, +45m, +60m) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {((nowcast.timeline || nowcast.horizons) ?? []).map((step) => {
          const isHighRisk = step.thunderstormProbability >= 65 || step.riskLevel === 'STAGE_IV_WARNING';

          return (
            <div
              key={step.horizon}
              className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2 transition-all ${
                isHighRisk
                  ? isSage
                    ? 'bg-[#59705B]/10 border-[#59705B]/60'
                    : 'bg-red-500/10 border-red-500/30'
                  : isSage
                  ? 'bg-[#E2E2DB] border-[#9AAEA3]/60'
                  : isCleanLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-black/20 border-white/5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-black">{step.horizon}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                      step.riskLevel === 'STAGE_IV_WARNING'
                        ? 'bg-red-500 text-white'
                        : step.riskLevel === 'STAGE_III_ALERT'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {step.riskLevel.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Probabilities */}
                <div className="mt-2.5 space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center space-x-1 opacity-80">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>THUNDERSTORM</span>
                    </span>
                    <strong className="text-sm tabular-nums">{step.thunderstormProbability}%</strong>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="flex items-center space-x-1 opacity-80">
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>LIGHTNING RISK</span>
                    </span>
                    <strong className="text-sm tabular-nums">{step.lightningProbability}%</strong>
                  </div>
                </div>
              </div>

              {/* Rain and Displacement */}
              <div className="pt-2 border-t border-black/5 dark:border-white/10 text-[10px] font-mono flex items-center justify-between opacity-80">
                <span className="flex items-center space-x-1">
                  <CloudRain className="w-3 h-3" />
                  <span>{step.expectedRainRateMmH} mm/h</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Wind className="w-3 h-3" />
                  <span>Gusts {step.expectedWindGustKmH} km/h</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Disclaimer */}
      <div className="mt-3 pt-2 border-t border-black/5 dark:border-white/10 flex items-center space-x-2 text-[10px] font-mono opacity-70">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>{nowcast.disclaimer}</span>
      </div>
    </div>
  );
};
