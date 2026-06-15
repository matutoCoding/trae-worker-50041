import type {
  FiberMaterial,
  BeatingRecord,
  PaperChemical,
  PulpMixture,
  SheetRecord,
  Formula,
} from '@/types';

const STORAGE_KEYS = {
  MATERIALS: 'papermaking_materials',
  BEATING_RECORDS: 'papermaking_beating_records',
  PAPER_CHEMICALS: 'papermaking_chemicals',
  MIXTURES: 'papermaking_mixtures',
  SHEET_RECORDS: 'papermaking_sheet_records',
  FORMULAS: 'papermaking_formulas',
};

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(`Failed to load ${key} from localStorage:`, e);
  }
  return defaultValue;
}

export function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
}

export function loadMaterials(): FiberMaterial[] {
  return loadFromStorage<FiberMaterial[]>(STORAGE_KEYS.MATERIALS, []);
}

export function saveMaterials(materials: FiberMaterial[]): void {
  saveToStorage(STORAGE_KEYS.MATERIALS, materials);
}

export function loadBeatingRecords(): BeatingRecord[] {
  return loadFromStorage<BeatingRecord[]>(STORAGE_KEYS.BEATING_RECORDS, []);
}

export function saveBeatingRecords(records: BeatingRecord[]): void {
  saveToStorage(STORAGE_KEYS.BEATING_RECORDS, records);
}

export function loadPaperChemicals(): PaperChemical[] {
  return loadFromStorage<PaperChemical[]>(STORAGE_KEYS.PAPER_CHEMICALS, []);
}

export function savePaperChemicals(chemicals: PaperChemical[]): void {
  saveToStorage(STORAGE_KEYS.PAPER_CHEMICALS, chemicals);
}

export function loadMixtures(): PulpMixture[] {
  return loadFromStorage<PulpMixture[]>(STORAGE_KEYS.MIXTURES, []);
}

export function saveMixtures(mixtures: PulpMixture[]): void {
  saveToStorage(STORAGE_KEYS.MIXTURES, mixtures);
}

export function loadSheetRecords(): SheetRecord[] {
  return loadFromStorage<SheetRecord[]>(STORAGE_KEYS.SHEET_RECORDS, []);
}

export function saveSheetRecords(records: SheetRecord[]): void {
  saveToStorage(STORAGE_KEYS.SHEET_RECORDS, records);
}

export function loadFormulas(): Formula[] {
  return loadFromStorage<Formula[]>(STORAGE_KEYS.FORMULAS, []);
}

export function saveFormulas(formulas: Formula[]): void {
  saveToStorage(STORAGE_KEYS.FORMULAS, formulas);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function generateBatchNo(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `P${year}${month}${day}${random}`;
}
