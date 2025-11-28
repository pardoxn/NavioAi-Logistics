import { User, UserRole } from './types';

export const MOCK_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@navio.ai',
    role: UserRole.ADMIN,
    isActive: true,
  },
  {
    id: '2',
    username: 'dispo',
    email: 'dispo@navio.ai',
    role: UserRole.DISPO,
    isActive: true,
  },
  {
    id: '3',
    username: 'lager',
    email: 'lager@navio.ai',
    role: UserRole.LAGER,
    isActive: true,
  },
];

export const CSV_HEADERS_MAPPING = {
  vorgang: 'Vorgang',
  belegnummer: 'Belegnummer',
  jahr: 'Jahr',
  belegart: 'Belegart',
  datum: 'Belegdatum',
  kundeNr: 'Auftraggeber',
  name1: 'Name 1 Auftraggeber',
  name2: 'Name 2 Auftraggeber',
  plz: 'PLZ Lieferanschrift',
  ort: 'Ort Lieferanschrift',
  land: 'Land Lieferanschrift_Wert',
  gewicht: 'Gesamtgewicht in kg',
};

// Depot: Ostring 3, 33181 Bad Wünnenberg
export const DEPOT_COORDS = {
  plz: '33181',
  lat: 51.5204,
  lng: 8.7037
};

// Approximate Center Coordinates for German PLZ Regions (00-99)
export const PLZ_REGION_COORDS: Record<string, { lat: number, lng: number }> = {
  '01': { lat: 51.05, lng: 13.74 }, '02': { lat: 51.16, lng: 14.98 }, '03': { lat: 51.76, lng: 14.33 }, '04': { lat: 51.34, lng: 12.37 }, '05': { lat: 51.50, lng: 11.95 },
  '06': { lat: 51.48, lng: 11.97 }, '07': { lat: 50.87, lng: 11.58 }, '08': { lat: 50.71, lng: 12.50 }, '09': { lat: 50.83, lng: 12.92 },
  '10': { lat: 52.52, lng: 13.40 }, '12': { lat: 52.45, lng: 13.54 }, '13': { lat: 52.56, lng: 13.35 }, '14': { lat: 52.40, lng: 13.06 }, '15': { lat: 52.33, lng: 14.22 },
  '16': { lat: 52.93, lng: 13.82 }, '17': { lat: 53.53, lng: 13.43 }, '18': { lat: 54.09, lng: 12.13 }, '19': { lat: 53.63, lng: 11.41 },
  '20': { lat: 53.55, lng: 9.99 }, '21': { lat: 53.40, lng: 10.05 }, '22': { lat: 53.58, lng: 10.02 }, '23': { lat: 53.86, lng: 10.68 }, '24': { lat: 54.32, lng: 10.13 },
  '25': { lat: 54.34, lng: 9.04 }, '26': { lat: 53.53, lng: 8.09 }, '27': { lat: 53.50, lng: 8.70 }, '28': { lat: 53.07, lng: 8.80 }, '29': { lat: 52.95, lng: 10.59 },
  '30': { lat: 52.37, lng: 9.73 }, '31': { lat: 52.15, lng: 9.95 }, '32': { lat: 52.20, lng: 8.70 }, '33': { lat: 51.72, lng: 8.75 }, '34': { lat: 51.31, lng: 9.49 },
  '35': { lat: 50.58, lng: 8.67 }, '36': { lat: 50.55, lng: 9.68 }, '37': { lat: 51.53, lng: 9.93 }, '38': { lat: 52.26, lng: 10.52 }, '39': { lat: 52.13, lng: 11.62 },
  '40': { lat: 51.22, lng: 6.78 }, '41': { lat: 51.19, lng: 6.44 }, '42': { lat: 51.25, lng: 7.15 }, '44': { lat: 51.51, lng: 7.46 }, '45': { lat: 51.45, lng: 7.01 },
  '46': { lat: 51.65, lng: 6.80 }, '47': { lat: 51.43, lng: 6.76 }, '48': { lat: 51.96, lng: 7.62 }, '49': { lat: 52.27, lng: 8.04 },
  '50': { lat: 50.93, lng: 6.95 }, '51': { lat: 51.02, lng: 7.56 }, '52': { lat: 50.77, lng: 6.08 }, '53': { lat: 50.73, lng: 7.09 }, '54': { lat: 49.75, lng: 6.64 },
  '55': { lat: 49.92, lng: 7.92 }, '56': { lat: 50.35, lng: 7.59 }, '57': { lat: 50.87, lng: 8.01 }, '58': { lat: 51.36, lng: 7.69 }, '59': { lat: 51.50, lng: 8.10 },
  '60': { lat: 50.11, lng: 8.68 }, '61': { lat: 50.22, lng: 8.61 }, '63': { lat: 49.98, lng: 9.15 }, '64': { lat: 49.86, lng: 8.65 }, '65': { lat: 50.10, lng: 8.54 },
  '66': { lat: 49.23, lng: 7.00 }, '67': { lat: 49.48, lng: 8.46 }, '68': { lat: 49.48, lng: 8.48 }, '69': { lat: 49.40, lng: 8.67 },
  '70': { lat: 48.77, lng: 9.18 }, '71': { lat: 48.80, lng: 9.20 }, '72': { lat: 48.45, lng: 9.00 }, '73': { lat: 48.80, lng: 9.80 }, '74': { lat: 49.14, lng: 9.22 },
  '75': { lat: 48.89, lng: 8.70 }, '76': { lat: 49.00, lng: 8.40 }, '77': { lat: 48.46, lng: 7.94 }, '78': { lat: 47.95, lng: 8.50 }, '79': { lat: 47.99, lng: 7.85 },
  '80': { lat: 48.13, lng: 11.58 }, '81': { lat: 48.13, lng: 11.45 }, '82': { lat: 47.88, lng: 11.30 }, '83': { lat: 47.85, lng: 12.12 }, '84': { lat: 48.53, lng: 12.15 },
  '85': { lat: 48.40, lng: 11.75 }, '86': { lat: 48.37, lng: 10.89 }, '87': { lat: 47.72, lng: 10.31 }, '88': { lat: 47.78, lng: 9.61 }, '89': { lat: 48.40, lng: 9.99 },
  '90': { lat: 49.45, lng: 11.07 }, '91': { lat: 49.60, lng: 11.00 }, '92': { lat: 49.20, lng: 12.00 }, '93': { lat: 49.01, lng: 12.10 }, '94': { lat: 48.56, lng: 13.43 },
  '95': { lat: 50.30, lng: 11.90 }, '96': { lat: 50.25, lng: 10.96 }, '97': { lat: 49.79, lng: 9.95 }, '98': { lat: 50.59, lng: 10.70 }, '99': { lat: 50.98, lng: 11.02 },
};