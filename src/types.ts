
export type MarkingStatus = 'Answered' | 'Not Answered' | 'Not Answered 2' | 'Canceled' | 'Whatsapp Photo' | 'Scheduled' | 'None';

export interface Customer {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string;
  phone1: string;
  phone2: string;
  note: string;
  extra: string;
  status: MarkingStatus;
  answeredPhone: 'None' | '1st Number' | '2nd Number';
}

export const STATUS_COLORS: Record<MarkingStatus, { bg: string; text: string; excel: string }> = {
  'Answered': { bg: 'bg-green-500', text: 'text-white', excel: 'FF22C55E' },
  'Not Answered': { bg: 'bg-yellow-400', text: 'text-black', excel: 'FFFACC15' },
  'Not Answered 2': { bg: 'bg-orange-500', text: 'text-white', excel: 'FFF97316' },
  'Canceled': { bg: 'bg-red-500', text: 'text-white', excel: 'FFEF4444' },
  'Whatsapp Photo': { bg: 'bg-blue-500', text: 'text-white', excel: 'FF3B82F6' },
  'Scheduled': { bg: 'bg-sky-300', text: 'text-black', excel: 'FF7DD3FC' },
  'None': { bg: 'bg-gray-100', text: 'text-gray-500', excel: 'FFFFFFFF' }
};
