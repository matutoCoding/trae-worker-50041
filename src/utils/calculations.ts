import type { FiberComponent, CalculationResult } from '@/types';

export function calculatePulpConcentration(
  targetGrammage: number,
  area: number,
  efficiency: number = 0.8
): number {
  return Number(((targetGrammage * area) / (1000 * efficiency) * 100).toFixed(3));
}

export function calculateSwingTimes(
  targetThickness: number,
  concentration: number,
  density: number = 0.8
): number {
  const k = 0.12;
  return Math.ceil((targetThickness * density) / (concentration * k));
}

export function calculateAbsoluteDryPulp(
  targetGrammage: number,
  area: number,
  efficiency: number = 0.8
): number {
  return Number(((targetGrammage * area) / efficiency).toFixed(2));
}

export function calculateStrength(
  fiberLength: number,
  beatingDegree: number,
  fiberRatio: number
): number {
  const lengthFactor = Math.min(fiberLength / 3, 1) * 40;
  const beatingFactor = Math.min(beatingDegree / 60, 1) * 35;
  const ratioFactor = fiberRatio * 25;
  return Math.round(lengthFactor + beatingFactor + ratioFactor);
}

export function calculateEvenness(
  beatingDegree: number,
  chemicalDosage: number,
  fiberLengthVariation: number
): number {
  const beatingFactor = Math.min(beatingDegree / 50, 1) * 40;
  const chemicalFactor = Math.min(chemicalDosage / 1.5, 1) * 30;
  const variationFactor = Math.max(0, 1 - fiberLengthVariation / 50) * 30;
  return Math.round(beatingFactor + chemicalFactor + variationFactor);
}

export function calculateMixture(
  fiberComponents: FiberComponent[],
  targetGrammage: number,
  targetThickness: number,
  targetWidth: number,
  targetHeight: number,
  paperChemicalDosage: number,
  fiberLengthMap?: Record<string, number>
): CalculationResult {
  const area = (targetWidth / 1000) * (targetHeight / 1000);
  const pulpConcentration = calculatePulpConcentration(targetGrammage, area);
  const absoluteDryPulp = calculateAbsoluteDryPulp(targetGrammage, area);
  const swingTimes = calculateSwingTimes(targetThickness, pulpConcentration);

  const avgFiberLength = fiberComponents.reduce((sum, fc) => {
    const length = fiberLengthMap?.[fc.materialId] ?? 2;
    return sum + fc.percentage * length * 0.01;
  }, 0);
  const avgBeatingDegree = fiberComponents.reduce((sum, fc) => sum + fc.percentage * fc.beatingDegree * 0.01, 0);
  const fiberRatio = Math.max(...fiberComponents.map(fc => fc.percentage)) / 100;

  const expectedStrength = calculateStrength(avgFiberLength, avgBeatingDegree, fiberRatio);
  
  const lengthVariation = Math.max(...fiberComponents.map(fc => fc.percentage)) - 
                         Math.min(...fiberComponents.map(fc => fc.percentage));
  const expectedEvenness = calculateEvenness(avgBeatingDegree, paperChemicalDosage, lengthVariation);

  const estimatedShrinkage = Number((8 + avgBeatingDegree * 0.05).toFixed(1));

  const warnings: string[] = [];
  if (pulpConcentration < 0.3) {
    warnings.push('纸浆浓度过低，可能导致抄纸效率低下');
  }
  if (pulpConcentration > 2) {
    warnings.push('纸浆浓度过高，纤维分散困难，易产生云絮');
  }
  if (avgFiberLength < 1) {
    warnings.push('平均纤维长度较短，成纸强度可能不足');
  }
  if (avgBeatingDegree > 70) {
    warnings.push('打浆度过高，纤维切断严重，可能影响成纸强度');
  }

  return {
    pulpConcentration,
    absoluteDryPulp,
    swingTimes,
    expectedStrength,
    expectedEvenness,
    estimatedShrinkage,
    warnings,
  };
}

export function reverseCalculateMixture(
  targetStrength: number,
  targetEvenness: number,
  availableMaterials: { fiberLength: number }[]
): { suggestedBeatingDegree: number; suggestedDosage: number } {
  const avgLength = availableMaterials.reduce((sum, m) => sum + m.fiberLength, 0) / availableMaterials.length;
  
  const suggestedBeatingDegree = Math.round(Math.min(70, Math.max(20, (targetStrength - 40 * Math.min(avgLength / 3, 1) - 12.5) / 0.35)));
  const suggestedDosage = Number(Math.min(2, Math.max(0.3, (targetEvenness - 40 * Math.min(suggestedBeatingDegree / 50, 1)) / 30 * 1.5)).toFixed(2));

  return {
    suggestedBeatingDegree,
    suggestedDosage,
  };
}
