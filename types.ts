export type Modality = 'PRESENZA' | 'DAD';

export interface Institute {
  id: string;
  name: string;
  color: string; // Hex code or tailwind class
  defaultRate?: number; // Costo
  rateType?: 'HOURLY' | 'PER_LESSON'; // Tipo di tariffa
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  instituteId?: string; // Link to the institute
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  modality: Modality;
  notes?: string;
  // New fields
  completed?: boolean;
  topics?: string;
}

export interface RawImportData {
  text: string;
}