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
  updateMixture: (id: string, mixture: Partial<PulpMixture>) => PulpMixture | null;
  setCurrentMixture: (mixture: PulpMixture | null) => void;
  addSheetRecord: (record: Omit<SheetRecord, 'id' | 'createdAt'>) => void;
  setCurrentSheet: (record: SheetRecord | null) => void;
  addFormula: (formula: Omit<Formula, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFormula: (id: string, formula: Partial<Formula>) => void;
  createFormulaFromMixture: (mixture: PulpMixture, name: string, description?: string) => void;
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
    const storedMixtures = loadMixtures();
    const storedSheetRecords = loadSheetRecords();

    const knownMaterialNameToId: Record<string, string> = {};
    const knownChemicalNameToId: Record<string, string> = {};
    mockMaterials.forEach(m => { knownMaterialNameToId[m.name] = m.id; });
    mockPaperChemicals.forEach(c => { knownChemicalNameToId[c.name] = c.id; });

    const materialsNeedMigration = (() => {
      if (storedMaterials.length === 0) return false;
      return storedMaterials.some(m => !mockMaterials.find(mm => mm.id === m.id) && mockMaterials.find(mm => mm.name === m.name));
    })();

    let materials: FiberMaterial[] = storedMaterials;
    let paperChemicals: PaperChemical[] = storedChemicals;

    if (storedMaterials.length === 0) {
      materials = mockMaterials;
    } else if (materialsNeedMigration) {
      const merged: FiberMaterial[] = mockMaterials.map(mm => {
        const existing = storedMaterials.find(sm => sm.id === mm.id || sm.name === mm.name);
        return existing ? { ...mm, createdAt: existing.createdAt } : mm;
      });
      storedMaterials.forEach(sm => {
        if (!mockMaterials.find(mm => mm.id === sm.id || mm.name === sm.name)) {
          merged.push(sm);
        }
      });
      materials = merged;
    }

    if (storedChemicals.length === 0) {
      paperChemicals = mockPaperChemicals;
    } else {
      const chemMerged: PaperChemical[] = mockPaperChemicals.map(mc => {
        const existing = storedChemicals.find(sc => sc.id === mc.id || sc.name === mc.name);
        return existing || mc;
      });
      storedChemicals.forEach(sc => {
        if (!mockPaperChemicals.find(mc => mc.id === sc.id || mc.name === sc.name)) {
          chemMerged.push(sc);
        }
      });
      paperChemicals = chemMerged;
    }

    const knownMaterialIds = new Set(materials.map(m => m.id));
    const knownChemicalIds = new Set(paperChemicals.map(c => c.id));

    const materialIdByKey: Record<string, string> = {};
    materials.forEach(m => {
      materialIdByKey[m.id] = m.id;
      materialIdByKey[m.name] = m.id;
      if (m.name.includes('青檀')) materialIdByKey['1'] = m.id;
      if (m.name.includes('稻草')) materialIdByKey['2'] = m.id;
      if (m.name.includes('桑皮')) materialIdByKey['3'] = m.id;
      if (m.name.includes('毛竹')) materialIdByKey['4'] = m.id;
      if (m.name.includes('构树')) materialIdByKey['5'] = m.id;
    });
    const chemicalIdByKey: Record<string, string> = {};
    paperChemicals.forEach(c => {
      chemicalIdByKey[c.id] = c.id;
      chemicalIdByKey[c.name] = c.id;
      if (c.name.includes('杨桃')) chemicalIdByKey['1'] = c.id;
      if (c.name.includes('黄蜀葵')) chemicalIdByKey['2'] = c.id;
      if (c.name.includes('仙人掌')) chemicalIdByKey['3'] = c.id;
    });

    const resolveMaterialId = (id: string, fallbackName?: string): string => {
      if (knownMaterialIds.has(id)) return id;
      const resolved = materialIdByKey[id]
        || (fallbackName && materialIdByKey[fallbackName])
        || knownMaterialNameToId[fallbackName || ''];
      return resolved || id;
    };
    const resolveChemicalId = (id: string, fallbackName?: string): string => {
      if (knownChemicalIds.has(id)) return id;
      const resolved = chemicalIdByKey[id]
        || (fallbackName && chemicalIdByKey[fallbackName])
        || knownChemicalNameToId[fallbackName || ''];
      return resolved || id;
    };
    const resolveMaterialName = (id: string, fallbackName: string): string => {
      if (knownMaterialIds.has(id)) {
        return materials.find(m => m.id === id)?.name || fallbackName;
      }
      const rid = resolveMaterialId(id, fallbackName);
      return materials.find(m => m.id === rid)?.name || fallbackName;
    };

    const fixFiberComponents = (fcs: any[]) => fcs.map((fc: any) => {
      const newId = resolveMaterialId(fc.materialId, fc.materialName);
      return {
        ...fc,
        materialId: newId,
        materialName: resolveMaterialName(newId, fc.materialName),
      };
    });

    const fixMixture = (m: any) => ({
      ...m,
      fiberComponents: fixFiberComponents(m.fiberComponents || []),
      paperChemicalId: resolveChemicalId(m.paperChemicalId),
    });

    const fixFormula = (f: any) => ({
      ...f,
      mixtureParams: {
        ...f.mixtureParams,
        fiberComponents: fixFiberComponents(f.mixtureParams?.fiberComponents || []),
        paperChemicalId: resolveChemicalId(f.mixtureParams?.paperChemicalId),
      },
    });

    const formulas = (storedFormulas.length > 0 ? storedFormulas : mockFormulas).map(fixFormula);
    const mixtures = storedMixtures.map(fixMixture);
    const sheetRecords = storedSheetRecords;

    set({
      materials,
      paperChemicals,
      beatingRecords: loadBeatingRecords(),
      mixtures,
      sheetRecords,
      formulas,
    });

    saveMaterials(materials);
    savePaperChemicals(paperChemicals);
    saveMixtures(mixtures);
    saveFormulas(formulas);
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
    const prevState = get();
    const newMixture: PulpMixture = {
      ...mixture,
      id: generateId(),
      sourceFormulaId: (mixture as any).sourceFormulaId || prevState.currentMixture?.sourceFormulaId,
      adjustmentFromBatch: (mixture as any).adjustmentFromBatch,
      adjustmentNotes: (mixture as any).adjustmentNotes,
      createdAt: new Date().toISOString(),
    };
    const mixtures = [...prevState.mixtures, newMixture];
    set({ mixtures, currentMixture: newMixture });
    saveMixtures(mixtures);
  },

  updateMixture: (id, mixture) => {
    let updated: PulpMixture | null = null;
    const mixtures = get().mixtures.map(m => {
      if (m.id === id) {
        updated = { ...m, ...mixture };
        return updated;
      }
      return m;
    });
    set({ mixtures });
    saveMixtures(mixtures);
    return updated;
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

  createFormulaFromMixture: (mixture, name, description) => {
    const now = new Date().toISOString();
    const paperTypeMap: Record<string, string> = {
      '宣纸': '书画纸',
      '书画': '书画纸',
      '桑皮': '传统用纸',
      '构皮': '传统用纸',
      '毛边': '传统用纸',
    };
    let paperType = '通用纸';
    for (const key of Object.keys(paperTypeMap)) {
      if (name.includes(key)) { paperType = paperTypeMap[key]; break; }
    }
    const newFormula: Formula = {
      id: generateId(),
      name,
      paperType,
      description: description || '由配比方案生成',
      mixtureParams: {
        name,
        fiberComponents: mixture.fiberComponents,
        paperChemicalId: mixture.paperChemicalId,
        paperChemicalDosage: mixture.paperChemicalDosage,
        targetGrammage: mixture.targetGrammage,
        targetThickness: mixture.targetThickness,
        targetWidth: mixture.targetWidth,
        targetHeight: mixture.targetHeight,
        pulpConcentration: mixture.pulpConcentration,
        absoluteDryPulp: mixture.absoluteDryPulp,
        swingTimes: mixture.swingTimes,
      },
      sheetParams: {},
      riskWarnings: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
    };
    const formulas = [...get().formulas, newFormula];
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
        sourceFormulaId: formula.id,
        createdAt: new Date().toISOString(),
      };
      return mixture;
    }
    return null;
  },
}));
