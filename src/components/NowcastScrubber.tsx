import React from 'react';
import { NowcastStep } from '../types/weather';

interface NowcastScrubberProps {
  nowcastSteps: NowcastStep[];
  activeStepIndex: number;
  onSelectStep: (index: number) => void;
  isCleanLight?: boolean;
  isSage?: boolean;
}

export const NowcastScrubber: React.FC<NowcastScrubberProps> = ({
  nowcastSteps,
  activeStepIndex,
  onSelectStep,
  isCleanLight = false,
  isSage = false,
}) => {
  const currentStep = nowcastSteps[activeStepIndex] || nowcastSteps[0];

  const alertDotColor =
    currentStep.stageColor === 'red'
      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
      : currentStep.stageColor === 'orange'
      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
      : currentStep.stageColor === 'yellow'
      ? 'bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.8)]'
      : isSage
      ? 'bg-[#59705B] shadow-[0_0_8px_rgba(89,112,91,0.8)]'
      : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';

  if (isSage) {
    return (
      <footer className="bg-[#E2E2DB]/90 backdrop-blur-xl border border-[#9AAEA3]/70 p-4 sm:p-5 rounded-2xl select-none shadow-lg">
        <div className="max-w-full flex flex-col space-y-2.5">
          {/* Scrubber Header / Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#59705B]">
                RADAR NOWCAST TIMELINE • 0-3 HOUR SCRUBBER
              </span>
              <span className="text-[10px] font-mono text-[#59705B]/70 font-semibold hidden sm:inline">
                SIMULATION: 30 MIN INTERVALS
              </span>
            </div>
            <div className="text-xs font-mono text-[#59705B] font-semibold">
              ACTIVE STEP:{' '}
              <strong className="text-[#E2E2DB] bg-[#59705B] font-extrabold px-2.5 py-0.5 rounded-lg border border-[#BBBB9A] shadow-xs">
                {currentStep.label}
              </strong>
            </div>
          </div>

          {/* Connected Row of 6 Tabs */}
          <div className="flex items-center w-full border border-[#9AAEA3]/60 bg-[#9AAEA3]/15 rounded-xl overflow-hidden shadow-xs">
            {nowcastSteps.map((step, idx) => {
              const isSelected = idx === activeStepIndex;
              const isLast = idx === nowcastSteps.length - 1;

              return (
                <button
                  key={step.timeOffset}
                  onClick={() => onSelectStep(idx)}
                  className={`flex-1 py-2.5 px-2 sm:px-3 text-center font-mono text-xs font-extrabold uppercase cursor-pointer transition-colors ${
                    !isLast ? 'border-r border-[#9AAEA3]/60' : ''
                  } ${
                    isSelected
                      ? 'bg-[#59705B] text-[#E2E2DB] shadow-md'
                      : 'bg-[#E2E2DB]/80 text-[#59705B] hover:bg-[#9AAEA3]/30'
                  }`}
                >
                  [{step.timeOffset}]
                </button>
              );
            })}
          </div>

          {/* Step Telemetry Sub-row */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono pt-1 text-[#59705B]/80">
            <div className="flex items-center space-x-3 sm:space-x-5">
              <span className="flex items-center space-x-1.5 font-bold">
                <span className={`w-2 h-2 rounded-full ${alertDotColor}`}></span>
                <span>STATUS: {currentStep.stageAlert.replace(/_/g, ' ')}</span>
              </span>
              <span>·</span>
              <span>
                RAIN: <strong className="text-[#59705B] font-bold">{currentStep.forecastRain} mm/h</strong>
              </span>
              <span>·</span>
              <span>
                LIGHTNING RISK: <strong className="text-[#59705B] font-bold">{currentStep.lightningProb}%</strong>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span>CAPE: {currentStep.cape} J/kg</span>
              <span>·</span>
              <span>WIND GUSTS: {currentStep.windGust} km/h</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (isCleanLight) {
    return (
      <footer className="bg-white/85 backdrop-blur-xl border border-sky-200/90 p-4 sm:p-5 rounded-2xl select-none shadow-lg">
        <div className="max-w-full flex flex-col space-y-2.5">
          {/* Scrubber Header / Label */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-sky-950">
                RADAR NOWCAST TIMELINE // 0-3 HOUR SCRUBBER
              </span>
              <span className="text-[10px] font-mono text-sky-700 font-semibold hidden sm:inline">
                SIMULATION STEP: 30 MIN INTERVALS
              </span>
            </div>
            <div className="text-xs font-mono text-slate-700 font-semibold">
              ACTIVE STEP:{' '}
              <strong className="text-sky-950 font-extrabold bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-300 shadow-xs">
                {currentStep.label}
              </strong>
            </div>
          </div>

          {/* Connected Row of 6 Tabs */}
          <div className="flex items-center w-full border border-sky-200/90 bg-[#f4f9ff] rounded-xl overflow-hidden shadow-xs">
            {nowcastSteps.map((step, idx) => {
              const isSelected = idx === activeStepIndex;
              const isLast = idx === nowcastSteps.length - 1;

              return (
                <button
                  key={step.timeOffset}
                  onClick={() => onSelectStep(idx)}
                  className={`flex-1 py-2.5 px-2 sm:px-3 text-center font-mono text-xs font-extrabold uppercase cursor-pointer transition-colors ${
                    !isLast ? 'border-r border-sky-200/80' : ''
                  } ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 hover:bg-sky-50 hover:text-sky-950'
                  }`}
                >
                  [{step.timeOffset}]
                </button>
              );
            })}
          </div>

          {/* Step Telemetry Sub-row */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono pt-1 text-slate-600">
            <div className="flex items-center space-x-3 sm:space-x-5">
              <span className="flex items-center space-x-1.5 font-bold">
                <span className={`w-2 h-2 rounded-full ${alertDotColor}`}></span>
                <span className="text-slate-900">STATUS: {currentStep.stageAlert.replace(/_/g, ' ')}</span>
              </span>
              <span>·</span>
              <span>
                RAIN: <strong className="text-slate-900">{currentStep.forecastRain} mm/h</strong>
              </span>
              <span>·</span>
              <span>
                LIGHTNING RISK: <strong className="text-slate-900">{currentStep.lightningProb}%</strong>
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-4 text-slate-500">
              <span>CAPE: {currentStep.cape} J/kg</span>
              <span>·</span>
              <span>WIND GUSTS: {currentStep.windGust} km/h</span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#0f1f38]/65 backdrop-blur-xl border border-white/10 p-4 sm:p-5 rounded-2xl select-none shadow-xl">
      <div className="max-w-full flex flex-col space-y-2.5">
        {/* Scrubber Header / Label */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-sky-200">
              RADAR NOWCAST TIMELINE // 0-3 HOUR SCRUBBER
            </span>
            <span className="text-[10px] font-mono text-sky-400 font-semibold hidden sm:inline">
              SIMULATION STEP: 30 MIN INTERVALS
            </span>
          </div>
          <div className="text-xs font-mono text-sky-200 font-semibold">
            ACTIVE STEP:{' '}
            <strong className="text-white font-extrabold bg-[#1f3e6e] px-2.5 py-0.5 rounded-lg border border-sky-400/80 shadow-xs">
              {currentStep.label}
            </strong>
          </div>
        </div>

        {/* Connected Row of 6 Tabs */}
        <div className="flex items-center w-full border border-sky-400/50 bg-[#122442] rounded-xl overflow-hidden shadow-xs">
          {nowcastSteps.map((step, idx) => {
            const isSelected = idx === activeStepIndex;
            const isLast = idx === nowcastSteps.length - 1;

            return (
              <button
                key={step.timeOffset}
                onClick={() => onSelectStep(idx)}
                className={`flex-1 py-2.5 px-2 sm:px-3 text-center font-mono text-xs font-extrabold uppercase cursor-pointer transition-colors ${
                  !isLast ? 'border-r border-sky-400/50' : ''
                } ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'bg-[#173059] text-sky-200 hover:bg-[#204279] hover:text-white'
                }`}
              >
                [{step.timeOffset}]
              </button>
            );
          })}
        </div>

        {/* Step Telemetry Sub-row */}
        <div className="flex flex-wrap items-center justify-between text-[11px] font-mono pt-1 text-sky-300">
          <div className="flex items-center space-x-3 sm:space-x-5">
            <span className="flex items-center space-x-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${alertDotColor}`}></span>
              <span className="text-white">STATUS: {currentStep.stageAlert.replace(/_/g, ' ')}</span>
            </span>
            <span>·</span>
            <span>
              RAIN: <strong className="text-white">{currentStep.forecastRain} mm/h</strong>
            </span>
            <span>·</span>
            <span>
              LIGHTNING RISK: <strong className="text-white">{currentStep.lightningProb}%</strong>
            </span>
          </div>
          <div className="hidden md:flex items-center space-x-4 text-sky-400">
            <span>CAPE: {currentStep.cape} J/kg</span>
            <span>·</span>
            <span>WIND GUSTS: {currentStep.windGust} km/h</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
