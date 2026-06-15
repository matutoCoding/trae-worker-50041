import type { ValidationResult, RiskAlert } from '@/types';

export function validatePaperChemical(
  dosage: number,
  pulpConcentration: number,
  fiberLength: number
): ValidationResult {
  const optimalDosage = 0.3 + pulpConcentration * 0.02 + fiberLength * 0.05;
  const ratio = dosage / optimalDosage;

  if (ratio < 0.5) {
    return {
      isValid: false,
      message: '纸药用量不足，纤维悬浮效果差',
      suggestion: `建议增加用量至 ${optimalDosage.toFixed(2)}% 左右`,
    };
  } else if (ratio > 2) {
    return {
      isValid: false,
      message: '纸药用量过多，可能影响揭纸',
      suggestion: `建议减少用量至 ${optimalDosage.toFixed(2)}% 左右`,
    };
  }

  return {
    isValid: true,
    message: '纸药用量合理',
    suggestion: '保持当前用量',
  };
}

export function validateBeatingDegree(
  beatingDegree: number,
  fiberType: string
): ValidationResult {
  const ranges: Record<string, [number, number]> = {
    bark: [25, 55],
    straw: [30, 60],
    cotton: [20, 45],
    bamboo: [35, 65],
    hemp: [25, 50],
    other: [20, 70],
  };

  const [min, max] = ranges[fiberType] || [20, 70];

  if (beatingDegree < min) {
    return {
      isValid: false,
      message: `打浆度过低，纤维分丝帚化不足`,
      suggestion: `建议打浆度控制在 ${min}-${max}°SR`,
    };
  } else if (beatingDegree > max) {
    return {
      isValid: false,
      message: `打浆度过高，纤维过度切断`,
      suggestion: `建议打浆度控制在 ${min}-${max}°SR`,
    };
  }

  return {
    isValid: true,
    message: '打浆度合理',
    suggestion: '当前打浆度适合抄造',
  };
}

export function validateFiberPercentage(percentages: number[]): ValidationResult {
  const sum = percentages.reduce((s, p) => s + p, 0);

  if (Math.abs(sum - 100) > 0.1) {
    return {
      isValid: false,
      message: `纤维配比总和为 ${sum.toFixed(1)}%，不等于100%`,
      suggestion: '请调整各纤维比例，确保总和为100%',
    };
  }

  return {
    isValid: true,
    message: '配比比例正确',
    suggestion: '配比设置合理',
  };
}

export function checkTearingRisk(
  paperChemicalDosage: number,
  beatingDegree: number,
  dryingTemp: number
): RiskAlert | null {
  if (paperChemicalDosage > 1.8 && beatingDegree > 55 && dryingTemp > 55) {
    return {
      id: Math.random().toString(36).substring(2, 11),
      type: 'tearing',
      level: 'danger',
      message: '揭纸破损风险高',
      suggestion: '纸药用量过高且打浆度高，加上高温干燥，纸张极易粘帘破损。建议减少纸药用量或降低干燥温度',
      timestamp: new Date().toISOString(),
    };
  }

  if (paperChemicalDosage > 1.5 || dryingTemp > 60) {
    return {
      id: Math.random().toString(36).substring(2, 11),
      type: 'tearing',
      level: 'warning',
      message: '存在揭纸破损风险',
      suggestion: '注意揭纸手法，保持纸张湿度适中',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}

export function checkShrinkageRisk(
  beatingDegree: number,
  dryingTemp: number,
  pressPressure: number
): RiskAlert | null {
  const estimatedShrinkage = 8 + beatingDegree * 0.05 + (dryingTemp - 25) * 0.1 + Math.max(0, (pressPressure - 20)) * 0.08;

  if (estimatedShrinkage > 15) {
    return {
      id: Math.random().toString(36).substring(2, 11),
      type: 'excessive_shrinkage',
      level: 'danger',
      message: `预计收缩率达 ${estimatedShrinkage.toFixed(1)}%，超过安全范围`,
      suggestion: '降低打浆度或干燥温度，避免过度收缩',
      timestamp: new Date().toISOString(),
    };
  }

  if (estimatedShrinkage > 12) {
    return {
      id: Math.random().toString(36).substring(2, 11),
      type: 'excessive_shrinkage',
      level: 'warning',
      message: `预计收缩率约 ${estimatedShrinkage.toFixed(1)}%，略高于正常范围`,
      suggestion: '注意调整抄造参数，控制收缩率',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
}
