import React from 'react';
import { SeverityAssessment } from '../types/weather';

interface ThreatIndexCardProps {
  severity: SeverityAssessment;
  isCleanLight?: boolean;
  isSage?: boolean;
}

export const ThreatIndexCard: React.FC<ThreatIndexCardProps> = ({
  severity,
  isCleanLight = false,
  isSage = false,
}) => {
  const isRed = severity.stageColor === 'red';
  const isOrange = severity.stageColor === 'orange';
  const isYellow = severity.stageColor === 'yellow';

  const alertBg = isRed
    ? 'bg-red-600 text-white border-red-700 shadow-sm'
    : isOrange
    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
    : isYellow
    ? 'bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm'
    : isSage
    ? 'bg-[#59705B] text-[#E2E2DB] border-[#BBBB9A] shadow-sm'
    : 'bg-emerald-600 text-white border-emerald-700 shadow-sm';

  const subHeaderColor = isRed
    ? 'text-red-100'
    : isOrange
    ? 'text-amber-100'
    : isYellow
    ? 'text-slate-900 font-bold'
    : isSage
    ? 'text-[#BBBB9A]'
    : 'text-emerald-100';

  const windColor = isSage
    ? severity.windThreat === 'CRITICAL'
      ? 'text-red-600'
      : severity.windThreat === 'ALERT'
      ? 'text-amber-600'
      : 'text-[#59705B]'
    : isCleanLight
    ? severity.windThreat === 'CRITICAL'
      ? 'text-red-600'
      : severity.windThreat === 'ALERT'
      ? 'text-amber-600'
      : severity.windThreat === 'WATCH'
      ? 'text-yellow-600'
      : 'text-emerald-600'
    : severity.windThreat === 'CRITICAL'
    ? 'text-red-400'
    : severity.windThreat === 'ALERT'
    ? 'text-amber-300'
    : severity.windThreat === 'WATCH'
    ? 'text-yellow-300'
    : 'text-emerald-300';

  const ltgColor = isSage
    ? severity.lightningThreat === 'CRITICAL' || severity.lightningThreat === 'HIGH'
      ? 'text-red-600'
      : 'text-[#59705B]'
    : isCleanLight
    ? severity.lightningThreat === 'CRITICAL' || severity.lightningThreat === 'HIGH'
      ? 'text-red-600'
      : severity.lightningThreat === 'WATCH'
      ? 'text-yellow-600'
      : 'text-emerald-600'
    : severity.lightningThreat === 'CRITICAL' || severity.lightningThreat === 'HIGH'
    ? 'text-red-400'
    : severity.lightningThreat === 'WATCH'
    ? 'text-yellow-300'
    : 'text-emerald-300';

  const precipColor = isSage
    ? severity.precipThreat === 'CRITICAL'
      ? 'text-red-600'
      : severity.precipThreat === 'ALERT'
      ? 'text-amber-600'
      : 'text-[#59705B]'
    : isCleanLight
    ? severity.precipThreat === 'CRITICAL'
      ? 'text-red-600'
      : severity.precipThreat === 'ALERT'
      ? 'text-amber-600'
      : severity.precipThreat === 'WATCH'
      ? 'text-yellow-600'
      : 'text-emerald-600'
    : severity.precipThreat === 'CRITICAL'
    ? 'text-red-400'
    : severity.precipThreat === 'ALERT'
    ? 'text-amber-300'
    : severity.precipThreat === 'WATCH'
    ? 'text-yellow-300'
    : 'text-emerald-300';

  if (isSage) {
    return (
      <div className="bg-[#E2E2DB]/90 backdrop-blur-xl border border-[#9AAEA3]/70 p-4 sm:p-5 rounded-2xl shadow-lg select-none">
        <div className="flex items-center justify-between border-b border-[#9AAEA3]/40 pb-2 mb-3">
          <h2 className="text-xs font-mono font-extrabold tracking-wider text-[#59705B] uppercase">
            CONVECTIVE THREAT INDEX
          </h2>
          <span className="text-[10px] font-mono bg-[#9AAEA3]/25 border border-[#9AAEA3] px-2 py-0.5 rounded-md text-[#59705B] font-extrabold">
            MET HAZARD
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Monospace score */}
          <div className="text-5xl font-mono font-extrabold text-[#59705B] tracking-tighter leading-none min-w-[70px]">
            {severity.compositeScore}
          </div>

          {/* Alert block */}
          <div className={`flex-1 p-3 border rounded-xl flex flex-col justify-center ${alertBg}`}>
            <span className={`text-[9px] font-mono uppercase tracking-widest font-extrabold ${subHeaderColor}`}>
              {severity.stageName}
            </span>
            <span className="text-xs font-mono font-extrabold leading-tight tracking-tight uppercase">
              {severity.alertTitle}
            </span>
          </div>
        </div>

        {/* Sub-threat breakdown */}
        <div className="mt-3.5 pt-3 border-t border-[#9AAEA3]/40 grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="border border-[#9AAEA3]/60 p-2 rounded-xl bg-[#9AAEA3]/15 shadow-xs">
            <div className="text-[10px] text-[#59705B] font-extrabold uppercase">WIND</div>
            <div className={`font-extrabold mt-0.5 text-sm ${windColor}`}>{severity.windThreat}</div>
          </div>
          <div className="border border-[#9AAEA3]/60 p-2 rounded-xl bg-[#9AAEA3]/15 shadow-xs">
            <div className="text-[10px] text-[#59705B] font-extrabold uppercase">LIGHTNING</div>
            <div className={`font-extrabold mt-0.5 text-sm ${ltgColor}`}>{severity.lightningThreat}</div>
          </div>
          <div className="border border-[#9AAEA3]/60 p-2 rounded-xl bg-[#9AAEA3]/15 shadow-xs">
            <div className="text-[10px] text-[#59705B] font-extrabold uppercase">PRECIP</div>
            <div className={`font-extrabold mt-0.5 text-sm ${precipColor}`}>{severity.precipThreat}</div>
          </div>
        </div>
      </div>
    );
  }

  if (isCleanLight) {
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-sky-200/90 p-4 sm:p-5 rounded-2xl shadow-lg select-none">
        <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
          <h2 className="text-xs font-mono font-extrabold tracking-wider text-sky-950 uppercase">
            CONVECTIVE THREAT INDEX
          </h2>
          <span className="text-[10px] font-mono bg-sky-50 border border-sky-300/80 px-2 py-0.5 rounded-md text-sky-900 font-extrabold">
            MET HAZARD
          </span>
        </div>

        <div className="flex items-center space-x-4">
          {/* Monospace score */}
          <div className="text-5xl font-mono font-extrabold text-slate-900 tracking-tighter leading-none min-w-[70px]">
            {severity.compositeScore}
          </div>

          {/* Alert block */}
          <div className={`flex-1 p-3 border rounded-xl flex flex-col justify-center ${alertBg}`}>
            <span className={`text-[9px] font-mono uppercase tracking-widest font-extrabold ${subHeaderColor}`}>
              {severity.stageName}
            </span>
            <span className="text-xs font-mono font-extrabold leading-tight tracking-tight uppercase">
              {severity.alertTitle}
            </span>
          </div>
        </div>

        {/* Sub-threat breakdown */}
        <div className="mt-3.5 pt-3 border-t border-sky-100 grid grid-cols-3 gap-2 text-center text-xs font-mono">
          <div className="border border-sky-200/80 p-2 rounded-xl bg-sky-50/50 shadow-xs">
            <div className="text-[10px] text-sky-800 font-extrabold uppercase">WIND</div>
            <div className={`font-extrabold mt-0.5 text-sm ${windColor}`}>{severity.windThreat}</div>
          </div>
          <div className="border border-sky-200/80 p-2 rounded-xl bg-sky-50/50 shadow-xs">
            <div className="text-[10px] text-sky-800 font-extrabold uppercase">LIGHTNING</div>
            <div className={`font-extrabold mt-0.5 text-sm ${ltgColor}`}>{severity.lightningThreat}</div>
          </div>
          <div className="border border-sky-200/80 p-2 rounded-xl bg-sky-50/50 shadow-xs">
            <div className="text-[10px] text-sky-800 font-extrabold uppercase">PRECIP</div>
            <div className={`font-extrabold mt-0.5 text-sm ${precipColor}`}>{severity.precipThreat}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0f1f38]/65 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-2xl shadow-xl select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <h2 className="text-xs font-mono font-extrabold tracking-wider text-sky-200 uppercase">
          CONVECTIVE THREAT INDEX
        </h2>
        <span className="text-[10px] font-mono bg-white/5 border border-sky-400/40 px-2 py-0.5 rounded-md text-sky-200 font-bold">
          MET HAZARD
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Monospace score */}
        <div className="text-5xl font-mono font-extrabold text-white tracking-tighter leading-none min-w-[70px] drop-shadow-sm">
          {severity.compositeScore}
        </div>

        {/* Alert block */}
        <div className={`flex-1 p-3 border rounded-xl flex flex-col justify-center shadow-sm ${alertBg}`}>
          <span className={`text-[9px] font-mono uppercase tracking-widest font-extrabold ${subHeaderColor}`}>
            {severity.stageName}
          </span>
          <span className="text-xs font-mono font-extrabold leading-tight tracking-tight uppercase">
            {severity.alertTitle}
          </span>
        </div>
      </div>

      {/* Sub-threat breakdown */}
      <div className="mt-3.5 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div className="border border-white/5 p-2 rounded-xl bg-black/20 shadow-sm">
          <div className="text-[10px] text-sky-200 font-extrabold uppercase">WIND</div>
          <div className={`font-extrabold mt-0.5 text-sm ${windColor}`}>{severity.windThreat}</div>
        </div>
        <div className="border border-white/5 p-2 rounded-xl bg-black/20 shadow-sm">
          <div className="text-[10px] text-sky-200 font-extrabold uppercase">LIGHTNING</div>
          <div className={`font-extrabold mt-0.5 text-sm ${ltgColor}`}>{severity.lightningThreat}</div>
        </div>
        <div className="border border-white/5 p-2 rounded-xl bg-black/20 shadow-sm">
          <div className="text-[10px] text-sky-200 font-extrabold uppercase">PRECIP</div>
          <div className={`font-extrabold mt-0.5 text-sm ${precipColor}`}>{severity.precipThreat}</div>
        </div>
      </div>
    </div>
  );
};
