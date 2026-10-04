import React from 'react';
import { AIBulletinResponse, CityWeatherData } from '../types/weather';

interface BulletinsArchiveViewProps {
  currentBulletin: AIBulletinResponse | null;
  weatherData: CityWeatherData;
  onRefreshBulletin: () => void;
  isLoading: boolean;
  onExportPdf?: () => void;
  isCleanLight?: boolean;
}

export const BulletinsArchiveView: React.FC<BulletinsArchiveViewProps> = ({
  currentBulletin,
  weatherData,
  onRefreshBulletin,
  isLoading,
  onExportPdf,
  isCleanLight = false,
}) => {
  const sampleArchives = [
    {
      id: 'NWC-06Z-DEL',
      station: 'DWR_DELHI_PALAM',
      type: 'STAGE-IV SEVERE SQUALL WARNING',
      time: '06:00 UTC',
      status: 'ACTIVE',
      color: isCleanLight
        ? 'border-red-400 bg-red-50 text-red-950'
        : 'border-red-500/50 bg-red-950/40 text-red-200',
    },
    {
      id: 'NWC-05Z-CCU',
      station: 'DWR_KOLKATA',
      type: 'STAGE-III SQUALL & THUNDERSTORM ALERT',
      time: '05:30 UTC',
      status: 'MONITORING',
      color: isCleanLight
        ? 'border-amber-400 bg-amber-50 text-amber-950'
        : 'border-amber-500/50 bg-amber-950/40 text-amber-200',
    },
    {
      id: 'NWC-05Z-BBI',
      station: 'DWR_BHUBANESWAR',
      type: 'STAGE-II CONVECTIVE WATCH',
      time: '05:15 UTC',
      status: 'EXPIRING',
      color: isCleanLight
        ? 'border-yellow-400 bg-yellow-50 text-yellow-950'
        : 'border-yellow-500/50 bg-yellow-950/40 text-yellow-200',
    },
    {
      id: 'NWC-04Z-BOM',
      station: 'DWR_MUMBAI',
      type: 'STAGE-I NORMAL ADVISORY',
      time: '04:45 UTC',
      status: 'ARCHIVED',
      color: isCleanLight
        ? 'border-[#74C476] bg-[#C7E9C0]/40 text-[#00441B]'
        : 'border-[#41AB5D]/50 bg-[#006D2C]/40 text-[#A1D99B]',
    },
  ];

  return (
    <div className="flex-1 p-4 flex flex-col space-y-4 font-mono select-none">
      {/* Banner */}
      <div className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border backdrop-blur-xl ${
        isCleanLight
          ? 'bg-[#E5F5E0]/90 border-[#C7E9C0] text-[#00441B]'
          : 'bg-[#00441B]/90 border-[#238B45]/50 text-[#F7FCF5]'
      }`}>
        <div>
          <h2 className={`text-sm font-bold uppercase tracking-wider ${
            isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
          }`}>
            IMD NOWCAST BULLETINS & SEVERE WEATHER DISPATCH LOGS
          </h2>
          <p className={`text-[11px] font-medium ${
            isCleanLight ? 'text-[#238B45]' : 'text-[#C7E9C0]'
          }`}>
            MINISTRY OF EARTH SCIENCES • NATIONAL EMERGENCY BROADCAST SERVICE (NEBS)
          </p>
        </div>
        <button
          onClick={onRefreshBulletin}
          disabled={isLoading}
          className="bg-gradient-to-r from-[#41AB5D] to-[#238B45] hover:from-[#74C476] hover:to-[#41AB5D] text-[#F7FCF5] text-xs px-4 py-2 rounded-xl font-bold uppercase disabled:opacity-50 cursor-pointer shadow-md transition-all"
        >
          {isLoading ? 'GENERATING...' : 'AUTHOR NEW NOWCAST BULLETIN'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Selected Bulletin */}
        <div className={`p-5 rounded-2xl flex flex-col justify-between shadow-lg border backdrop-blur-xl ${
          isCleanLight
            ? 'bg-[#E5F5E0]/80 border-[#C7E9C0] text-[#00441B]'
            : 'bg-[#00441B]/80 border-[#238B45]/50 text-[#F7FCF5]'
        }`}>
          <div>
            <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
              isCleanLight ? 'border-[#C7E9C0]' : 'border-[#238B45]/40'
            }`}>
              <span className={`text-xs font-bold uppercase ${
                isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
              }`}>
                STATION DISPATCH: {weatherData.station.name.toUpperCase()}
              </span>
              <span className="text-[10px] bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-md uppercase shadow-xs">
                {weatherData.severity.stageName}
              </span>
            </div>

            {currentBulletin ? (
              <div className="space-y-3 text-xs leading-relaxed uppercase">
                <p className={`font-extrabold text-sm ${
                  isCleanLight ? 'text-red-600' : 'text-rose-400'
                }`}>
                  {currentBulletin.headline}
                </p>
                <div className={`p-3.5 rounded-xl border space-y-1.5 text-[11px] shadow-xs ${
                  isCleanLight
                    ? 'bg-[#F7FCF5] border-[#C7E9C0] text-[#00441B]'
                    : 'bg-[#002f13] border-[#238B45]/40 text-[#F7FCF5]'
                }`}>
                  <div><strong className={isCleanLight ? 'text-[#006D2C]' : 'text-[#74C476]'}>MOVEMENT:</strong> {currentBulletin.movement}</div>
                  <div>
                    <strong className={isCleanLight ? 'text-[#006D2C]' : 'text-[#74C476]'}>THREATS:</strong>{' '}
                    {Array.isArray(currentBulletin.threats)
                      ? currentBulletin.threats.join(', ')
                      : currentBulletin.threats}
                  </div>
                  <div>
                    <strong className={isCleanLight ? 'text-[#006D2C]' : 'text-[#74C476]'}>ACTION DIRECTIVE:</strong> {currentBulletin.recommendedAction}
                  </div>
                </div>
                <div className={`text-[10px] font-medium border-t pt-2 ${
                  isCleanLight ? 'border-[#C7E9C0] text-[#238B45]' : 'border-[#238B45]/40 text-[#C7E9C0]'
                }`}>
                  {currentBulletin.source}
                </div>
              </div>
            ) : (
              <div className={`text-xs py-4 ${isCleanLight ? 'text-[#238B45]' : 'text-[#A1D99B]'}`}>
                LOADING ACTIVE BULLETIN...
              </div>
            )}
          </div>

          <div className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[10px] font-medium ${
            isCleanLight ? 'border-[#C7E9C0] text-[#238B45]' : 'border-[#238B45]/40 text-[#A1D99B]'
          }`}>
            <span>DISPATCH CHANNELS: NDMA, STATE SEOC, AIRPORT ATC</span>
            <div className="flex items-center space-x-2">
              <span className={`font-extrabold ${isCleanLight ? 'text-[#006D2C]' : 'text-[#74C476]'}`}>
                TRANSMISSION OK
              </span>
              {onExportPdf && (
                <button
                  type="button"
                  onClick={onExportPdf}
                  className="bg-[#41AB5D] hover:bg-[#74C476] text-[#F7FCF5] font-mono px-3 py-1.5 rounded-lg uppercase font-bold tracking-wider cursor-pointer shadow-sm transition-colors"
                >
                  DOWNLOAD PDF
                </button>
              )}
            </div>
          </div>
        </div>

        {/* National Archive Log */}
        <div className={`p-5 rounded-2xl space-y-3 shadow-lg border backdrop-blur-xl ${
          isCleanLight
            ? 'bg-[#E5F5E0]/80 border-[#C7E9C0] text-[#00441B]'
            : 'bg-[#00441B]/80 border-[#238B45]/50 text-[#F7FCF5]'
        }`}>
          <div className={`border-b pb-2 flex justify-between items-center ${
            isCleanLight ? 'border-[#C7E9C0]' : 'border-[#238B45]/40'
          }`}>
            <span className={`text-xs font-bold uppercase ${
              isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
            }`}>
              NATIONAL LOG // RECENT REGIONAL TRANSMISSIONS
            </span>
            <span className={`text-[10px] font-semibold ${
              isCleanLight ? 'text-[#238B45]' : 'text-[#C7E9C0]'
            }`}>
              ARCHIVE DEPTH: 24H
            </span>
          </div>

          <div className="space-y-2">
            {sampleArchives.map((b) => (
              <div key={b.id} className={`p-3 rounded-xl border ${b.color} text-xs shadow-xs`}>
                <div className="flex justify-between items-center font-bold mb-1">
                  <span>{b.id} // {b.station}</span>
                  <span className="text-[10px] font-semibold opacity-90">{b.time}</span>
                </div>
                <div className="text-[11px] font-extrabold">{b.type}</div>
                <div className="mt-1 text-[10px] flex justify-between font-medium">
                  <span>DISTRIBUTED TO STATE EMERGENCY OP CENTERS</span>
                  <span className="font-extrabold">STATUS: {b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
