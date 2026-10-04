import React, { useState } from 'react';
import { INDIAN_MET_STATIONS } from '../data/stations';
import { StationInfo } from '../types/weather';

interface RadarMosaicViewProps {
  onSelectStation: (st: StationInfo) => void;
  currentStationId: string;
  isCleanLight?: boolean;
}

export const RadarMosaicView: React.FC<RadarMosaicViewProps> = ({
  onSelectStation,
  currentStationId,
  isCleanLight = false,
}) => {
  const [filterState, setFilterState] = useState<string>('ALL');

  const stations = INDIAN_MET_STATIONS;
  const filtered = filterState === 'ALL'
    ? stations
    : stations.filter(s => s.state.toLowerCase().includes(filterState.toLowerCase()));

  return (
    <div className="flex-1 p-4 flex flex-col space-y-4 font-mono select-none">
      {/* Header Banner */}
      <div className={`p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg border backdrop-blur-xl ${
        isCleanLight
          ? 'bg-[#E5F5E0]/90 border-[#C7E9C0] text-[#00441B]'
          : 'bg-[#00441B]/90 border-[#238B45]/50 text-[#F7FCF5]'
      }`}>
        <div>
          <h2 className={`text-sm font-bold uppercase tracking-wider ${
            isCleanLight ? 'text-[#00441B]' : 'text-[#A1D99B]'
          }`}>
            IMD NATIONAL DOPPLER RADAR NETWORK (DWR MOSAIC)
          </h2>
          <p className={`text-[11px] font-medium ${
            isCleanLight ? 'text-[#238B45]' : 'text-[#C7E9C0]'
          }`}>
            COMPOSITE SURVEILLANCE • S-BAND / C-BAND METEOROLOGICAL RADAR CLUSTER
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span className={isCleanLight ? 'text-[#238B45] font-bold' : 'text-[#A1D99B] font-semibold'}>
            NETWORK STATUS:
          </span>
          <span className={`px-2.5 py-0.5 rounded-lg border font-extrabold ${
            isCleanLight
              ? 'bg-[#C7E9C0] text-[#00441B] border-[#74C476]'
              : 'bg-[#006D2C] text-[#F7FCF5] border-[#41AB5D]'
          }`}>
            37/37 ONLINE
          </span>
          <span className={isCleanLight ? 'text-[#238B45] font-bold' : 'text-[#A1D99B] font-semibold'}>
            SWEEP REFRESH:
          </span>
          <span className={`px-2.5 py-0.5 rounded-lg border font-extrabold ${
            isCleanLight
              ? 'bg-[#C7E9C0] text-[#00441B] border-[#74C476]'
              : 'bg-[#002f13] text-[#A1D99B] border-[#238B45]'
          }`}>
            10 MIN COMPOSITE
          </span>
        </div>
      </div>

      {/* Grid of Stations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((st) => {
          const isSelected = st.id === currentStationId;
          return (
            <div
              key={st.id}
              onClick={() => onSelectStation(st)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all backdrop-blur-xl ${
                isSelected
                  ? 'bg-gradient-to-br from-[#41AB5D] to-[#238B45] text-[#F7FCF5] border-[#74C476] shadow-lg scale-[1.01]'
                  : isCleanLight
                  ? 'bg-[#E5F5E0]/80 hover:bg-[#C7E9C0]/60 border-[#C7E9C0] hover:border-[#74C476] text-[#00441B] shadow-sm'
                  : 'bg-[#002f13]/90 hover:bg-[#006D2C]/60 border-[#238B45]/40 hover:border-[#41AB5D] text-[#F7FCF5] shadow-md'
              }`}
            >
              <div className="flex items-center justify-between border-b pb-1.5 mb-2 border-current/20">
                <span className={`font-bold text-xs uppercase tracking-tight ${
                  isSelected ? 'text-[#F7FCF5]' : isCleanLight ? 'text-[#00441B] font-extrabold' : 'text-[#A1D99B]'
                }`}>
                  {st.radarStationCode}
                </span>
                <span className={`text-[10px] uppercase font-semibold ${
                  isSelected ? 'text-[#F7FCF5]/80' : isCleanLight ? 'text-[#238B45]' : 'text-[#C7E9C0]'
                }`}>
                  SYNOP: {st.synopId}
                </span>
              </div>
              <div className={`text-xs font-bold mb-1 ${
                isSelected ? 'text-[#F7FCF5]' : isCleanLight ? 'text-[#00441B]' : 'text-[#F7FCF5]'
              }`}>
                {st.name}
              </div>
              <div className={`text-[10px] flex justify-between ${
                isSelected ? 'text-[#F7FCF5]/80' : isCleanLight ? 'text-[#238B45]' : 'text-[#A1D99B]'
              }`}>
                <span>{st.state}</span>
                <span className="tabular-nums font-semibold">
                  {st.lat.toFixed(2)}°N, {st.lng.toFixed(2)}°E
                </span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-current/20 flex items-center justify-between text-[10px]">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#74C476] shadow-[0_0_8px_rgba(116,196,118,1)] inline-block"></span>
                  <span className={isSelected ? 'text-[#F7FCF5] font-bold' : isCleanLight ? 'text-[#006D2C] font-medium' : 'text-[#A1D99B] font-medium'}>
                    TX ONLINE (S-BAND)
                  </span>
                </span>
                <span className={`font-bold uppercase tracking-wider ${
                  isSelected ? 'text-[#F7FCF5]' : isCleanLight ? 'text-[#006D2C]' : 'text-[#74C476]'
                }`}>
                  {isSelected ? '● ACTIVE RADAR' : 'SELECT RADAR →'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
