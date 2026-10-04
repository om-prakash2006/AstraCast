import React from 'react';
import { StationInfo, CurrentTelemetry, DailyForecastItem } from '../types/weather';
import { MapPin, ArrowDown, ArrowUp, Wind, Droplets } from 'lucide-react';

interface WeatherHeroHeaderProps {
  station: StationInfo;
  current: CurrentTelemetry;
  todayDaily?: DailyForecastItem;
  isCleanLight: boolean;
  isSage?: boolean;
  tempUnit: 'C' | 'F';
  onToggleTempUnit: () => void;
  nextSweepSeconds: number;
}

export const WeatherHeroHeader: React.FC<WeatherHeroHeaderProps> = ({
  station,
  current,
  todayDaily,
  isCleanLight,
  isSage = false,
  tempUnit,
  onToggleTempUnit,
  nextSweepSeconds,
}) => {
  const displayTemp = tempUnit === 'C' ? current.temperature : Math.round((current.temperature * 9) / 5 + 32);
  const displayHeatIndex = tempUnit === 'C' ? current.heatIndex : Math.round((current.heatIndex * 9) / 5 + 32);

  const highTemp = todayDaily ? (tempUnit === 'C' ? todayDaily.maxTemp : Math.round((todayDaily.maxTemp * 9) / 5 + 32)) : Math.round(displayTemp + 4);
  const lowTemp = todayDaily ? (tempUnit === 'C' ? todayDaily.minTemp : Math.round((todayDaily.minTemp * 9) / 5 + 32)) : Math.round(displayTemp - 5);

  return (
    <div
      className={`rounded-3xl backdrop-blur-2xl transition-all p-6 sm:p-8 shadow-xl border relative overflow-hidden select-none ${
        isSage
          ? 'bg-[#E2E2DB]/90 border-[#9AAEA3]/70 text-[#59705B] shadow-[#59705B]/5'
          : isCleanLight
          ? 'bg-white/80 border-sky-200/90 text-slate-800 shadow-sky-950/5'
          : 'bg-[#0f1f38]/65 border-white/10 text-white shadow-black/40'
      }`}
    >
      {/* Decorative ambient subtle glow */}
      <div
        className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
          isSage ? 'bg-[#9AAEA3]/25' : 'bg-sky-500/10'
        }`}
      ></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Location & Conditions */}
        <div className="space-y-1.5">
          {/* Station breadcrumb / location */}
          <div className="flex items-center space-x-2 text-xs font-mono font-medium">
            <MapPin
              className={`w-3.5 h-3.5 ${
                isSage ? 'text-[#59705B]' : isCleanLight ? 'text-sky-600' : 'text-sky-400'
              }`}
            />
            <span
              className={
                isSage
                  ? 'text-[#59705B] font-extrabold'
                  : isCleanLight
                  ? 'text-sky-900 font-bold'
                  : 'text-sky-300 font-bold'
              }
            >
              {station.state.toUpperCase()} • INDIA
            </span>
            <span className={isSage ? 'text-[#59705B]/40' : 'text-slate-400'}>·</span>
            <span
              className={`font-mono text-[11px] ${
                isSage ? 'text-[#59705B]/70' : 'text-slate-400'
              }`}
            >
              {station.lat.toFixed(2)}°N, {station.lng.toFixed(2)}°E
            </span>
            <span className={isSage ? 'text-[#59705B]/40' : 'text-slate-400'}>·</span>
            <span
              className={`font-mono text-[11px] ${
                isSage ? 'text-[#59705B]/70' : 'text-slate-400'
              }`}
            >
              {station.elevationM}m MSL
            </span>
          </div>

          {/* City / Station Name */}
          <h1
            className={`text-2xl sm:text-4xl font-extrabold tracking-tight text-balance ${
              isSage ? 'text-[#59705B]' : ''
            }`}
          >
            {station.name}
          </h1>

          {/* Condition description & Kicker */}
          <p
            className={`text-sm sm:text-base font-medium capitalize ${
              isSage
                ? 'text-[#59705B]/80 font-semibold'
                : isCleanLight
                ? 'text-slate-600'
                : 'text-slate-300'
            }`}
          >
            {current.weatherDescription.toLowerCase()}
          </p>

          {/* Metadata Row (Feels like, Humidity, Wind) */}
          <div
            className={`flex flex-wrap items-center gap-3 pt-2 text-xs font-mono ${
              isSage ? 'text-[#59705B]/80' : 'text-slate-400'
            }`}
          >
            <span className="flex items-center space-x-1">
              <span>Feels like</span>
              <strong className={isSage ? 'text-[#59705B] font-bold' : isCleanLight ? 'text-slate-800' : 'text-white'}>
                {displayHeatIndex}°{tempUnit}
              </strong>
            </span>
            <span>·</span>
            <span className="flex items-center space-x-1">
              <Droplets className={`w-3 h-3 ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`} />
              <span>{current.relativeHumidity}% Humidity</span>
            </span>
            <span>·</span>
            <span className="flex items-center space-x-1">
              <Wind className={`w-3 h-3 ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`} />
              <span>
                {current.windSpeed} km/h {current.windDirectionCardinal}
              </span>
            </span>
          </div>
        </div>

        {/* Right: Giant Temperature, High/Low, and Unit Switcher */}
        <div className="flex flex-col items-start md:items-end justify-center shrink-0">
          <div className="flex items-baseline space-x-1">
            <span
              className={`text-6xl sm:text-7xl lg:text-8xl font-light tracking-tighter tabular-nums leading-none ${
                isSage ? 'text-[#59705B]' : ''
              }`}
            >
              {displayTemp}
            </span>
            <button
              onClick={onToggleTempUnit}
              title="Click to toggle Celsius / Fahrenheit"
              className={`text-2xl sm:text-3xl font-light cursor-pointer hover:opacity-85 transition-all ml-1 p-1 rounded-xl shadow-xs ${
                isSage
                  ? 'text-[#E2E2DB] bg-[#59705B] border border-[#BBBB9A]'
                  : isCleanLight
                  ? 'text-sky-700 bg-sky-50'
                  : 'text-sky-300 bg-white/5'
              }`}
            >
              °{tempUnit}
            </button>
          </div>

          {/* High / Low Range */}
          <div
            className={`flex items-center space-x-3 mt-2 text-xs font-mono font-medium ${
              isSage ? 'text-[#59705B]/80' : 'text-slate-400'
            }`}
          >
            <span className="flex items-center space-x-0.5">
              <ArrowUp className="w-3 h-3 text-rose-500" />
              <span>H:</span>
              <strong
                className={
                  isSage
                    ? 'text-[#59705B]'
                    : isCleanLight
                    ? 'text-slate-700'
                    : 'text-slate-200'
                }
              >
                {highTemp}°
              </strong>
            </span>
            <span className="flex items-center space-x-0.5">
              <ArrowDown className={`w-3 h-3 ${isSage ? 'text-[#59705B]' : 'text-sky-400'}`} />
              <span>L:</span>
              <strong
                className={
                  isSage
                    ? 'text-[#59705B]'
                    : isCleanLight
                    ? 'text-slate-700'
                    : 'text-slate-200'
                }
              >
                {lowTemp}°
              </strong>
            </span>
            <span>·</span>
            <span
              className={`text-[11px] font-mono font-bold flex items-center space-x-1 px-2 py-0.5 rounded-md ${
                isSage
                  ? 'text-[#59705B] bg-[#BBBB9A]/30 border border-[#BBBB9A]/50'
                  : 'text-emerald-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  isSage ? 'bg-[#59705B]' : 'bg-emerald-400'
                }`}
              ></span>
              <span>SWEEP {nextSweepSeconds}s</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
