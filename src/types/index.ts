export type FiberType = 'bark' | 'straw' | 'cotton' | 'bamboo' | 'hemp' | 'other';
export type PaperChemicalType = 'mucilage' | 'fixative' | 'softener' | 'other';
export type AlertLevel = 'info' | 'warning' | 'danger' | 'success';
export type AlertType = 'flocculation' | 'uneven_thickness' | 'tearing' | 'excessive_shrinkage';
export type CloudFlocSeverity = 'mild' | 'moderate' | 'severe';

export interface FiberMaterial {
  id: string;
  name: string;
  type: FiberType;
  fiberLength: number;
  fiberWidth: number;
  origin: string;
  description: string;
  createdAt: string;
}

export interface BeatingRecord {
  id: string;
  materialId: string;
  beatingDegree: number;
  beatingTime: number;
  notes: string;
  createdAt: string;
}

export interface PaperChemical {
  id: string;
  name: string;
  type: PaperChemicalType;
  dosageRatio: number;
  suspensionEffect: number;
  description: string;
}

export interface FiberComponent {
  materialId: string;
  materialName: string;
  percentage: number;
  beatingDegree: number;
}

export interface PulpMixture {
  id: string;
  name: string;
  fiberComponents: FiberComponent[];
  paperChemicalId: string;
  paperChemicalDosage: number;
  targetGrammage: number;
  targetThickness: number;
  targetWidth: number;
  targetHeight: number;
  pulpConcentration: number;
  absoluteDryPulp: number;
  swingTimes: number;
  createdAt: string;
}

export interface ThicknessPoint {
  x: number;
  y: number;
  thickness: number;
  deviation: number;
  isWarning: boolean;
}

export interface CloudFloc {
  x: number;
  y: number;
  size: number;
  severity: CloudFlocSeverity;
}

export interface RiskAlert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  message: string;
  suggestion: string;
  timestamp: string;
}

export interface SheetRecord {
  id: string;
  mixtureId: string;
  batchNo: string;
  actualGrammage: number;
  actualThickness: number;
  thicknessDeviation: number;
  thicknessMap: ThicknessPoint[];
  hasCloudFloc: boolean;
  cloudFlocPositions: CloudFloc[];
  pressPressure: number;
  dryingTemp: number;
  shrinkageRate: number;
  smoothness: number;
  tensileStrength: number;
  evenness: number;
  riskAlerts: RiskAlert[];
  notes: string;
  createdAt: string;
}

export interface Formula {
  id: string;
  name: string;
  paperType: string;
  description: string;
  mixtureParams: Omit<PulpMixture, 'id' | 'createdAt'>;
  sheetParams: Partial<SheetRecord>;
  riskWarnings: RiskAlert[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalculationResult {
  pulpConcentration: number;
  absoluteDryPulp: number;
  swingTimes: number;
  expectedStrength: number;
  expectedEvenness: number;
  estimatedShrinkage: number;
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  message: string;
  suggestion: string;
}

export interface SimulationResult {
  finalThickness: number;
  shrinkageRate: number;
  smoothness: number;
  riskOfCracking: boolean;
}

export interface AppState {
  materials: FiberMaterial[];
  beatingRecords: BeatingRecord[];
  paperChemicals: PaperChemical[];
  mixtures: PulpMixture[];
  sheetRecords: SheetRecord[];
  formulas: Formula[];
  currentMixture: PulpMixture | null;
  currentSheet: SheetRecord | null;
}
