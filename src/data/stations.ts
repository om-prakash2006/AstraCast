import { StationInfo } from '../types/weather';

export const INDIAN_MET_STATIONS: StationInfo[] = [
  {
    id: 'kolkata',
    name: 'Kolkata DWR (Alipore)',
    state: 'West Bengal',
    lat: 22.57,
    lng: 88.36,
    radarStationCode: 'DWR_KOLKATA',
    synopId: '42809',
    elevationM: 6,
  },
  {
    id: 'delhi',
    name: 'New Delhi DWR (Palam HQ)',
    state: 'Delhi NCR',
    lat: 28.61,
    lng: 77.23,
    radarStationCode: 'DWR_DELHI',
    synopId: '42182',
    elevationM: 214,
  },
  {
    id: 'guwahati',
    name: 'Guwahati DWR (Borjhar)',
    state: 'Assam',
    lat: 26.14,
    lng: 91.73,
    radarStationCode: 'DWR_GUWAHATI',
    synopId: '42410',
    elevationM: 55,
  },
  {
    id: 'mumbai',
    name: 'Mumbai DWR (Colaba)',
    state: 'Maharashtra',
    lat: 19.07,
    lng: 72.87,
    radarStationCode: 'DWR_MUMBAI',
    synopId: '43057',
    elevationM: 14,
  },
  {
    id: 'chennai',
    name: 'Chennai DWR (Meenambakkam)',
    state: 'Tamil Nadu',
    lat: 13.08,
    lng: 80.27,
    radarStationCode: 'DWR_CHENNAI',
    synopId: '43279',
    elevationM: 16,
  },
  {
    id: 'bhubaneswar',
    name: 'Bhubaneswar DWR',
    state: 'Odisha',
    lat: 20.29,
    lng: 85.82,
    radarStationCode: 'DWR_BHUBANESWAR',
    synopId: '42971',
    elevationM: 45,
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru (HAL)',
    state: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    radarStationCode: 'DWR_BENGALURU',
    synopId: '43295',
    elevationM: 920,
  },
  {
    id: 'hyderabad',
    name: 'Hyderabad (Begumpet)',
    state: 'Telangana',
    lat: 17.3850,
    lng: 78.4867,
    radarStationCode: 'DWR_HYDERABAD',
    synopId: '43128',
    elevationM: 545,
  },
  {
    id: 'patna',
    name: 'Patna (Airport)',
    state: 'Bihar',
    lat: 25.5941,
    lng: 85.1376,
    radarStationCode: 'DWR_PATNA',
    synopId: '42492',
    elevationM: 53,
  },
  {
    id: 'jaipur',
    name: 'Jaipur (Sanganer)',
    state: 'Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
    radarStationCode: 'DWR_JAIPUR',
    synopId: '42348',
    elevationM: 390,
  },
];

export function findStationByCoords(lat: number, lng: number): StationInfo {
  // Find nearest station
  let nearest = INDIAN_MET_STATIONS[0];
  let minDistance = Infinity;

  for (const st of INDIAN_MET_STATIONS) {
    const dLat = st.lat - lat;
    const dLng = st.lng - lng;
    const distSq = dLat * dLat + dLng * dLng;
    if (distSq < minDistance) {
      minDistance = distSq;
      nearest = st;
    }
  }

  // If very close, use the predefined station, otherwise create dynamic station
  if (minDistance < 0.25) {
    return nearest;
  }

  return {
    id: `custom-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    name: `Observation Point (${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E)`,
    state: 'Field Node',
    lat,
    lng,
    radarStationCode: `DWR_${nearest.radarStationCode.replace('DWR_', '')}`,
    synopId: `${Math.floor(40000 + Math.random() * 9000)}`,
    elevationM: nearest.elevationM,
  };
}
