import React from 'react';
import { CurrentTelemetry, NowcastStep, StationInfo } from '../types/weather';

interface SurfaceTelemetryGridProps {
  station: StationInfo;
  current: CurrentTelemetry;
  activeStep: NowcastStep;
  isCleanLight?: boolean;
  isSage?: boolean;
}

export const SurfaceTelemetryGrid: React.FC<SurfaceTelemetryGridProps> = ({
  station,
  current,
  activeStep,
  isCleanLight = false,
  isSage = false,
}) => {
  // If active step is T+00m, show live analysis values; otherwise show interpolated nowcast values
  const isNowcastStep = activeStep.stepIndex > 0;

  const displayTemp = isNowcastStep ? activeStep.temperature : current.temperature;
  const displayRh = isNowcastStep ? activeStep.humidity : current.relativeHumidity;
  const displayGust = isNowcastStep ? activeStep.windGust : current.windGusts;
  const displayRain = isNowcastStep ? activeStep.forecastRain : current.rainRate;

  // Humidity state label
  const humidityStatus =
    displayRh >= 85
      ? 'SATURATION PEAK'
      : displayRh >= 70
      ? 'ELEVATED MOISTURE'
      : displayRh >= 50
      ? 'MODERATE HUMIDITY'
      : 'DRY BOUNDARY LAYER';

  const humidityColor = isSage
    ? 'text-[#59705B] font-bold'
    : isCleanLight
    ? displayRh >= 85
      ? 'text-amber-600 font-extrabold'
      : displayRh >= 70
      ? 'text-yellow-600 font-extrabold'
      : 'text-sky-700 font-bold'
    : displayRh >= 85
      ? 'text-amber-300 font-extrabold'
      : displayRh >= 70
      ? 'text-yellow-300 font-extrabold'
      : 'text-sky-200 font-bold';

  const gustColor = isSage
    ? 'text-[#59705B] font-extrabold'
    : isCleanLight
    ? displayGust >= 65
      ? 'text-red-600 font-extrabold'
      : displayGust >= 45
      ? 'text-amber-600 font-extrabold'
      : 'text-slate-900 font-extrabold'
    : displayGust >= 65
      ? 'text-red-400'
      : displayGust >= 45
      ? 'text-amber-300'
      : 'text-white';

  if (isSage) {
    return (
      <div className="bg-[#E2E2DB]/90 border border-[#9AAEA3]/70 p-0 rounded-2xl overflow-hidden shadow-lg select-none">
        <div className="bg-[#59705B] px-3.5 py-2.5 border-b border-[#BBBB9A]/50 flex justify-between items-center text-[#E2E2DB]">
          <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#E2E2DB]">
            SURFACE TELEMETRY (AWS) {isNowcastStep && `// [${activeStep.timeOffset}]`}
          </span>
          <span className="text-[10px] font-mono font-bold text-[#BBBB9A]">
            SYNOP ID: {station.synopId}
          </span>
        </div>

        {/* 2x2 Grid with exact 1px sage borders between cells */}
        <div className="grid grid-cols-2 divide-x divide-y divide-[#9AAEA3]/50 border-b border-[#9AAEA3]/50">
          {/* Cell 1: Temperature */}
          <div className="p-3.5 bg-[#E2E2DB]">
            <div className="text-[10px] font-mono uppercase text-[#59705B] font-extrabold">
              TEMPERATURE
            </div>
            <div className="text-2xl font-mono font-extrabold text-[#59705B] mt-1 tabular-nums">
              {displayTemp.toFixed(1)}
              <span className="text-base text-[#59705B]/80 font-bold ml-0.5">°C</span>
            </div>
            <div className="text-[10px] font-mono text-[#59705B]/70 mt-0.5 font-medium">
              DP: {current.dewPoint.toFixed(1)}°C | HI: {current.heatIndex.toFixed(1)}°C
            </div>
          </div>

          {/* Cell 2: Humidity */}
          <div className="p-3.5 bg-[#E2E2DB]">
            <div className="text-[10px] font-mono uppercase text-[#59705B] font-extrabold">
              HUMIDITY
            </div>
            <div className="text-2xl font-mono font-extrabold text-[#59705B] mt-1 tabular-nums">
              {Math.round(displayRh)}
              <span className="text-base text-[#59705B]/80 font-bold ml-0.5">%</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${humidityColor}`}>
              {humidityStatus}
            </div>
          </div>

          {/* Cell 3: Gust */}
          <div className="p-3.5 bg-[#E2E2DB]">
            <div className="text-[10px] font-mono uppercase text-[#59705B] font-extrabold">
              MAX GUST
            </div>
            <div className={`text-2xl font-mono font-extrabold mt-1 tabular-nums ${gustColor}`}>
              {Math.round(displayGust)}{' '}
              <span className="text-xs text-[#59705B]/80 font-bold">km/h</span>
            </div>
            <div className="text-[10px] font-mono text-[#59705B]/70 mt-0.5 font-medium">
              SUSTAINED: {current.windSpeed.toFixed(1)} km/h
            </div>
          </div>

          {/* Cell 4: Rain Rate */}
          <div className="p-3.5 bg-[#E2E2DB]">
            <div className="text-[10px] font-mono uppercase text-[#59705B] font-extrabold">
              RAIN RATE
            </div>
            <div className="text-2xl font-mono font-extrabold text-[#59705B] mt-1 tabular-nums">
              {displayRain.toFixed(1)}{' '}
              <span className="text-xs text-[#59705B]/80 font-bold">mm/h</span>
            </div>
            <div className="text-[10px] font-mono text-[#59705B]/70 mt-0.5 font-medium">
              24H ACCUM: {current.accum24h.toFixed(1)} mm
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCleanLight) {
    return (
      <div className="bg-white border border-sky-200/90 p-0 rounded-none overflow-hidden shadow-sm select-none">
        <div className="bg-[#0c2242] px-3.5 py-2 border-b border-sky-900/60 flex justify-between items-center text-white">
          <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-sky-200">
            SURFACE TELEMETRY (AWS) {isNowcastStep && `// [${activeStep.timeOffset}]`}
          </span>
          <span className="text-[10px] font-mono font-bold text-sky-300">
            SYNOP ID: {station.synopId}
          </span>
        </div>

        {/* 2x2 Grid with exact 1px sky-blue borders between cells */}
        <div className="grid grid-cols-2 divide-x divide-y divide-sky-200/70 border-b border-sky-200/70">
          {/* Cell 1: Temperature */}
          <div className="p-3.5 bg-[#f8fbfe]">
            <div className="text-[10px] font-mono uppercase text-sky-900 font-extrabold">
              TEMPERATURE
            </div>
            <div className="text-2xl font-mono font-extrabold text-[#0c2242] mt-1 tabular-nums">
              {displayTemp.toFixed(1)}
              <span className="text-base text-sky-600 font-bold ml-0.5">°C</span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5 font-medium">
              DP: {current.dewPoint.toFixed(1)}°C | HI: {current.heatIndex.toFixed(1)}°C
            </div>
          </div>

          {/* Cell 2: Humidity */}
          <div className="p-3.5 bg-[#f8fbfe]">
            <div className="text-[10px] font-mono uppercase text-sky-900 font-extrabold">
              HUMIDITY
            </div>
            <div className="text-2xl font-mono font-extrabold text-[#0c2242] mt-1 tabular-nums">
              {Math.round(displayRh)}
              <span className="text-base text-sky-600 font-bold ml-0.5">%</span>
            </div>
            <div className={`text-[10px] font-mono mt-0.5 ${humidityColor}`}>
              {humidityStatus}
            </div>
          </div>

          {/* Cell 3: Gust */}
          <div className="p-3.5 bg-[#f8fbfe]">
            <div className="text-[10px] font-mono uppercase text-sky-900 font-extrabold">
              MAX GUST
            </div>
            <div className={`text-2xl font-mono font-extrabold mt-1 tabular-nums ${gustColor}`}>
              {Math.round(displayGust)}{' '}
              <span className="text-xs text-sky-600 font-bold">km/h</span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5 font-medium">
              DIR: {current.windDirection}° {current.windDirectionCardinal}{' '}
              {current.windGusts >= 55 ? '(SQUALL)' : ''}
            </div>
          </div>

          {/* Cell 4: Rain Rate */}
          <div className="p-3.5 bg-[#f8fbfe]">
            <div className="text-[10px] font-mono uppercase text-sky-900 font-extrabold">
              {isNowcastStep ? 'PROJECTED RAIN' : 'RAIN INTENSITY'}
            </div>
            <div className="text-2xl font-mono font-extrabold text-[#0c2242] mt-1 tabular-nums">
              {displayRain.toFixed(1)}{' '}
              <span className="text-xs text-sky-600 font-bold">mm/h</span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-0.5 font-medium">
              ACCUM 24H: {current.accum24h.toFixed(1)} mm
            </div>
          </div>
        </div>

        {/* Additional Utilitarian Barometric & Atmospheric Readout */}
        <div className="p-2.5 bg-[#eef6ff] grid grid-cols-2 gap-2 text-[11px] font-mono text-sky-950 font-medium">
          <div>
            QNH:{' '}
            <strong className="text-[#0c2242] font-extrabold font-mono">
              {current.surfacePressure.toFixed(1)} hPa
            </strong>{' '}
            <span
              className={`font-bold ${
                current.pressureTrend < 0 ? 'text-red-600' : 'text-emerald-700'
              }`}
            >
              ({current.pressureTrend > 0 ? '+' : ''}
              {current.pressureTrend.toFixed(1)})
            </span>
          </div>
          <div>
            VISIBILITY:{' '}
            <strong className="text-[#0c2242] font-extrabold font-mono">
              {current.visibility} M
            </strong>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#173059] border border-sky-400/60 p-0 rounded-none overflow-hidden shadow-lg select-none">
      <div className="bg-[#1e3c6a] px-3.5 py-2 border-b border-sky-400/50 flex justify-between items-center">
        <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-sky-200">
          SURFACE TELEMETRY (AWS) {isNowcastStep && `// [${activeStep.timeOffset}]`}
        </span>
        <span className="text-[10px] font-mono font-bold text-sky-200">
          SYNOP ID: {station.synopId}
        </span>
      </div>

      {/* 2x2 Grid with exact 1px sky-blue borders between cells */}
      <div className="grid grid-cols-2 divide-x divide-y divide-sky-400/40 border-b border-sky-400/40">
        {/* Cell 1: Temperature */}
        <div className="p-3.5 bg-[#152c4e]">
          <div className="text-[10px] font-mono uppercase text-sky-200 font-extrabold">
            TEMPERATURE
          </div>
          <div className="text-2xl font-mono font-extrabold text-white mt-1 tabular-nums">
            {displayTemp.toFixed(1)}
            <span className="text-base text-sky-300 font-bold ml-0.5">°C</span>
          </div>
          <div className="text-[10px] font-mono text-sky-100 mt-0.5 font-medium">
            DP: {current.dewPoint.toFixed(1)}°C | HI: {current.heatIndex.toFixed(1)}°C
          </div>
        </div>

        {/* Cell 2: Humidity */}
        <div className="p-3.5 bg-[#152c4e]">
          <div className="text-[10px] font-mono uppercase text-sky-200 font-extrabold">
            HUMIDITY
          </div>
          <div className="text-2xl font-mono font-extrabold text-white mt-1 tabular-nums">
            {Math.round(displayRh)}
            <span className="text-base text-sky-300 font-bold ml-0.5">%</span>
          </div>
          <div className={`text-[10px] font-mono mt-0.5 ${humidityColor}`}>
            {humidityStatus}
          </div>
        </div>

        {/* Cell 3: Gust */}
        <div className="p-3.5 bg-[#152c4e]">
          <div className="text-[10px] font-mono uppercase text-sky-200 font-extrabold">
            MAX GUST
          </div>
          <div className={`text-2xl font-mono font-extrabold mt-1 tabular-nums ${gustColor}`}>
            {Math.round(displayGust)}{' '}
            <span className="text-xs text-sky-300 font-bold">km/h</span>
          </div>
          <div className="text-[10px] font-mono text-sky-100 mt-0.5 font-medium">
            DIR: {current.windDirection}° {current.windDirectionCardinal}{' '}
            {current.windGusts >= 55 ? '(SQUALL)' : ''}
          </div>
        </div>

        {/* Cell 4: Rain Rate */}
        <div className="p-3.5 bg-[#152c4e]">
          <div className="text-[10px] font-mono uppercase text-sky-200 font-extrabold">
            {isNowcastStep ? 'PROJECTED RAIN' : 'RAIN INTENSITY'}
          </div>
          <div className="text-2xl font-mono font-extrabold text-white mt-1 tabular-nums">
            {displayRain.toFixed(1)}{' '}
            <span className="text-xs text-sky-300 font-bold">mm/h</span>
          </div>
          <div className="text-[10px] font-mono text-sky-100 mt-0.5 font-medium">
            ACCUM 24H: {current.accum24h.toFixed(1)} mm
          </div>
        </div>
      </div>

      {/* Additional Utilitarian Barometric & Atmospheric Readout */}
      <div className="p-2.5 bg-[#122442] grid grid-cols-2 gap-2 text-[11px] font-mono text-sky-100">
        <div>
          QNH:{' '}
          <strong className="text-white font-extrabold font-mono">
            {current.surfacePressure.toFixed(1)} hPa
          </strong>{' '}
          <span
            className={`font-bold ${
              current.pressureTrend < 0 ? 'text-red-400' : 'text-emerald-300'
            }`}
          >
            ({current.pressureTrend > 0 ? '+' : ''}
            {current.pressureTrend.toFixed(1)})
          </span>
        </div>
        <div>
          VISIBILITY:{' '}
          <strong className="text-white font-extrabold font-mono">
            {current.visibility} M
          </strong>
        </div>
      </div>
    </div>
  );
};
