
import type { Timestamp } from "firebase/firestore";

export type MetodoRegistro = 'qr' | 'gps' | 'manual';
export type TipoRegistro = 'entrada' | 'salida';

export interface AsistenciaRecord {
  id: string; // Firestore document ID
  colaboradorId: string;
  colaboradorNombre: string;
  fecha: Timestamp;
  tipo: TipoRegistro;
  metodo: MetodoRegistro;
  // Opcional: para registros GPS
  coordenadas?: {
    latitud: number;
    longitud: number;
  } | null;
}
