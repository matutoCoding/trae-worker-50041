import { create } from 'zustand';
import type {
  AppState,
  FiberMaterial,
  BeatingRecord,
  PaperChemical,
  PulpMixture,
  SheetRecord,
  Formula,
} from '@/types';
import {
  loadMaterials,
  loadBeatingRecords,
  loadPaperChemicals,
  loadMixtures,
  loadSheetRecords,
  loadFormulas,
  saveMaterials,
  saveBeatingRecords,
  savePaperChemicals,
  saveMixtures,
  saveSheetRecords,
  saveFormulas,
  generateId,
} from '@/utils/storage';
import { mockMaterials, mockPaperChemicals, mockFormulas } from '@/data/mockData';

interface AppStore extends AppState {
  initialize: () => void;
  addMaterial: (material: Omit<FiberMaterial, 'id' | 'createdAt'>) => void;
  updateMaterial: (id: string, material: Partial<FiberMaterial>) => void;
  deleteMaterial: (id: string) => void;
  addBeatingRecord: (record: Omit<BeatingRecord, 'id' | 'createdAt'>) => void;
  addPaperChemical: (chemical: Omit<PaperChemical, 'id'>) => void;
  updatePaperChemical: (id: string, chemical: Partial<PaperChemical>) => void;
  deletePaperChemical: (id: string) => void;
  addMixture: (mixture: Omit<PulpMixture, 'id' | 'createdAt'>) => void;
  updateMixture: (id: string, mixture: Partial<PulpMixture>) => void;
  setCurrentMixture: (mixture: PulpMixture | null) => void;
  addSheetRecord: (record: Omit<SheetRecord, 'id' | 'createdAt'>) => void;
  setCurrentSheet: (record: SheetRecord | null) => void;
  addFormula: (formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFormula: (id: string, formula: Partial<Formula>) => void;
  deleteFormula: (id: string) => void;
  toggleFavorite: (id: string) => void;
  loadFormula: (id: string) => PulpMixture | null;
}

export const useAppStore = create<AppStore>((set, get) => ({
  materials: [],
  beatingRecords: [],
  paperChemicals: [],
  mixtures: [],
  sheetRecords: [],
  formulas: [],
  currentMixture: null,
  currentSheet: null,

  initialize: () => {
    const storedMaterials = loadMaterials();
    const storedChemicals = loadPaperChemicals();
    const storedFormulas = loadFormulas();

    set({
      materials: storedMaterials.length > 0 ? storedMaterials : mockMaterials,
      paperChemicals: storedChemicals.length > 0 ? storedChemicals : mockPaperChemicals,
      beatingRecords: loadBeatingRecords(),
      mixtures: loadMixtures(),
      sheetRecords: loadSheetRecords(),
      formulas: storedFormulas.length > 0 ? storedFormulas : mockFormulas,
    });

    if (storedMaterials.length === 0) {
      saveMaterials(mockMaterials);
    }
    if (storedChemicals.length === 0) {
      savePaperChemicals(mockPaperChemicals);
    }
    if (storedFormulas.length === 0) {
      saveFormulas(mockFormulas);
    }
  },

  addMaterial: (material) => {
    const newMaterial: FiberMaterial = {
      ...material,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const materials = [...get().materials, newMaterial];
    set({ materials });
    saveMaterials(materials);
  },

  updateMaterial: (id, material) => {
    const materials = get().materials.map(m =>
      m.id === id ? { ...m, ...material } : m
    );
    set({ materials });
    saveMaterials(materials);
  },

  deleteMaterial: (id) => {
    const materials = get().materials.filter(m => m.id !== id);
    set({ materials });
    saveMaterials(materials);
  },

  addBeatingRecord: (record) => {
    const newRecord: BeatingRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const beatingRecords = [...get().beatingRecords, newRecord];
    set({ beatingRecords });
    saveBeatingRecords(beatingRecords);
  },

  addPaperChemical: (chemical) => {
    const newChemical: PaperChemical = {
      ...chemical,
      id: generateId(),
    };
    const paperChemicals = [...get().paperChemicals, newChemical];
    set({ paperChemicals });
    savePaperChemicals(paperChemicals);
  },

  updatePaperChemical: (id, chemical) => {
    const paperChemicals = get().paperChemicals.map(c =>
      c.id === id ? { ...c, ...chemical } : c
    );
    set({ paperChemicals });
    savePaperChemicals(paperChemicals);
  },

  deletePaperChemical: (id) => {
    const paperChemicals = get().paperChemicals.filter(c => c.id !== id);
    set({ paperChemicals });
    savePaperChemicals(paperChemicals);
  },

  addMixture: (mixture) => {
    const newMixture: PulpMixture = {
      ...mixture,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const mixtures = [...get().mixtures, newMixture];
    set({ mixtures, currentMixture: newMixture });
    saveMixtures(mixtures);
  },

  updateMixture: (id, mixture) => {
    const mixtures = get().mixtures.map(m =>
      m.id === id ? { ...m, ...mixture } : m
    );
    set({ mixtures });
    saveMixtures(mixtures);
  },

  setCurrentMixture: (mixture) => {
    set({ currentMixture: mixture });
  },

  addSheetRecord: (record) => {
    const newRecord: SheetRecord = {
      ...record,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    const sheetRecords = [...get().sheetRecords, newRecord];
    set({ sheetRecords, currentSheet: newRecord });
    saveSheetRecords(sheetRecords);
  },

  setCurrentSheet: (record) => {
    set({ currentSheet: record });
  },

  addFormula: (formula) => {
    const now = new Date().toISOString();
    const newFormula: Formula = {
      ...formula,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const formulas = [...get().formulas, newFormula];
    set({ formulas });
    saveFormulas(formulas);
  },

  updateFormula: (id, formula) => {
    const formulas = get().formulas.map(f =>
      f.id === id ? { ...f, ...formula, updatedAt: new Date().toISOString() } : f
    );
    set({ formulas });
    saveFormulas(formulas);
  },

  deleteFormula: (id) => {
    const formulas = get().formulas.filter(f => f.id !== id);
    set({ formulas });
    saveFormulas(formulas);
  },

  toggleFavorite: (id) => {
    const formulas = get().formulas.map(f =>
      f.id === id ? { ...f, isFavorite: !f.isFavorite, updatedAt: new Date().toISOString() } : f
    );
    set({ formulas });
    saveFormulas(formulas);
  },

  loadFormula: (id) => {
    const formula = get().formulas.find(f => f.id === id);
    if (formula) {
      const mixture: PulpMixture = {
        ...formula.mixtureParams,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      return mixture;
    }
    return null;
  },
}));
