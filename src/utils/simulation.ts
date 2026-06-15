import type { SimulationResult } from '@/types';

export function simulatePressDrying(
  pressPressure: number,
  dryingTemp: number,
  initialThickness: number
): SimulationResult {
  const pressEffect = Math.max(0.6, 1 - pressPressure * 0.008);
  const dryingEffect = 1 - Math.min(dryingTemp - 20, 60) * 0.003;
  const finalThickness = Number((initialThickness * pressEffect * dryingEffect).toFixed(1));
  const shrinkageRate = Number(((1 - pressEffect * dryingEffect) * 100).toFixed(2));
  const smoothness = Math.min(100, Math.round(40 + pressPressure * 0.5 + dryingTemp * 0.3));
  const riskOfCracking = dryingTemp > 60 && pressPressure > 30;

  return {
    finalThickness,
    shrinkageRate,
    smoothness,
    riskOfCracking,
  };
}

export function simulateGrainPattern(
  swingTimes: number,
  fiberLength: number,
  isConsistent: boolean = true
): { patternType: string; description: string; quality: number } {
  let patternType: string;
  let description: string;
  let quality: number;

  const baseQuality = isConsistent ? 85 : 60;
  const swingFactor = Math.min(swingTimes / 8, 1) * 10;
  const lengthFactor = Math.min(fiberLength / 3, 1) * 10;
  quality = Math.round(baseQuality + swingFactor + lengthFactor);

  if (swingTimes < 3) {
    patternType = '稀帘纹';
    description = '荡料次数少，纤维层薄，帘纹清晰可见';
  } else if (swingTimes < 6) {
    patternType = '正常帘纹';
    description = '荡料适中，帘纹隐约，纸张匀度良好';
  } else if (swingTimes < 10) {
    patternType = '致密帘纹';
    description = '多次荡料，纤维层厚，帘纹细腻，纸张挺括';
  } else {
    patternType = '厚重帘纹';
    description = '荡料次数过多，纤维层过厚，可能影响透光度';
  }

  return { patternType, description, quality };
}

export function calculateTensileStrength(
  fiberLength: number,
  beatingDegree: number,
  pulpConcentration: number,
  pressPressure: number
): number {
  const lengthFactor = Math.min(fiberLength / 3, 1) * 35;
  const beatingFactor = Math.min(beatingDegree / 60, 1) * 30;
  const concentrationFactor = Math.min(pulpConcentration / 1.5, 1) * 15;
  const pressFactor = Math.min(pressPressure / 40, 1) * 20;

  return Math.round(lengthFactor + beatingFactor + concentrationFactor + pressFactor);
}

export function estimateProductionTime(
  swingTimes: number,
  pressPressure: number,
  dryingTemp: number
): { swingTime: number; pressTime: number; dryingTime: number; totalTime: number } {
  const swingTime = swingTimes * 8;
  const pressTime = Math.round(30 + pressPressure * 0.5);
  const baseDryingTime = 120;
  const tempFactor = Math.max(0.3, 1 - (dryingTemp - 25) * 0.015);
  const dryingTime = Math.round(baseDryingTime * tempFactor);
  const totalTime = swingTime + pressTime + dryingTime;

  return {
    swingTime,
    pressTime,
    dryingTime,
    totalTime,
  };
}
