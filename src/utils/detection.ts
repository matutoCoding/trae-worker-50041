import type { ThicknessPoint, CloudFloc, RiskAlert } from '@/types';

export function detectThicknessDeviation(
  measurements: number[],
  target: number,
  threshold: number = 10
): { deviation: number; isWarning: boolean }[] {
  return measurements.map(m => {
    const deviation = Number((Math.abs((m - target) / target * 100)).toFixed(2));
    return {
      deviation,
      isWarning: deviation > threshold,
    };
  });
}

export function generateThicknessMap(
  targetThickness: number,
  gridSize: number = 5,
  errorRange: number = 0.15
): ThicknessPoint[] {
  const points: ThicknessPoint[] = [];
  const step = 1 / (gridSize - 1);

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const centerDistance = Math.sqrt(Math.pow(x * step - 0.5, 2) + Math.pow(y * step - 0.5, 2));
      const edgeFactor = 1 + centerDistance * 0.1;
      const randomFactor = 1 + (Math.random() - 0.5) * errorRange;
      const thickness = Number((targetThickness * edgeFactor * randomFactor).toFixed(1));
      const deviation = Number((Math.abs((thickness - targetThickness) / targetThickness * 100)).toFixed(2));

      points.push({
        x,
        y,
        thickness,
        deviation,
        isWarning: deviation > 10,
      });
    }
  }

  return points;
}

export function detectCloudFlocs(
  thicknessMap: ThicknessPoint[],
  gridSize: number = 5
): CloudFloc[] {
  const flocs: CloudFloc[] = [];
  const highDeviationPoints = thicknessMap.filter(p => p.deviation > 15);

  for (const point of highDeviationPoints) {
    if (Math.random() < 0.3) {
      const severity = point.deviation > 25 ? 'severe' : point.deviation > 18 ? 'moderate' : 'mild';
      flocs.push({
        x: point.x / (gridSize - 1),
        y: point.y / (gridSize - 1),
        size: Math.random() * 15 + 10,
        severity,
      });
    }
  }

  return flocs;
}

export function calculateOverallDeviation(thicknessMap: ThicknessPoint[]): number {
  if (thicknessMap.length === 0) return 0;
  const avgDeviation = thicknessMap.reduce((sum, p) => sum + p.deviation, 0) / thicknessMap.length;
  return Number(avgDeviation.toFixed(2));
}

export function checkThicknessAlerts(
  thicknessMap: ThicknessPoint[],
  threshold: number = 10
): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const warningPoints = thicknessMap.filter(p => p.isWarning);
  const overallDeviation = calculateOverallDeviation(thicknessMap);

  if (warningPoints.length > thicknessMap.length * 0.3) {
    alerts.push({
      id: generateId(),
      type: 'uneven_thickness',
      level: 'danger',
      message: `厚度偏差严重，${warningPoints.length}个点位偏差超过${threshold}%`,
      suggestion: '建议调整荡料手法，确保纸浆均匀分布，必要时增加纸药用量',
      timestamp: new Date().toISOString(),
    });
  } else if (warningPoints.length > 0) {
    alerts.push({
      id: generateId(),
      type: 'uneven_thickness',
      level: 'warning',
      message: `存在${warningPoints.length}个点位厚度偏差超过${threshold}%`,
      suggestion: '注意荡料时的力度和角度一致性',
      timestamp: new Date().toISOString(),
    });
  }

  if (overallDeviation > 8) {
    alerts.push({
      id: generateId(),
      type: 'uneven_thickness',
      level: 'warning',
      message: `整体偏差率达${overallDeviation.toFixed(1)}%，匀度欠佳`,
      suggestion: '检查打浆度是否合适，纸浆搅拌是否充分',
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

export function checkFlocculationAlerts(cloudFlocs: CloudFloc[]): RiskAlert[] {
  const alerts: RiskAlert[] = [];
  const severeFlocs = cloudFlocs.filter(f => f.severity === 'severe');
  const moderateFlocs = cloudFlocs.filter(f => f.severity === 'moderate');

  if (severeFlocs.length > 0) {
    alerts.push({
      id: generateId(),
      type: 'flocculation',
      level: 'danger',
      message: `检测到${severeFlocs.length}处严重云絮`,
      suggestion: '立即检查纸浆浓度，充分搅拌，必要时增加纸药用量',
      timestamp: new Date().toISOString(),
    });
  }

  if (moderateFlocs.length > 2) {
    alerts.push({
      id: generateId(),
      type: 'flocculation',
      level: 'warning',
      message: `检测到${cloudFlocs.length}处云絮瑕疵`,
      suggestion: '检查纤维分散情况，适当延长搅拌时间',
      timestamp: new Date().toISOString(),
    });
  } else if (cloudFlocs.length > 0) {
    alerts.push({
      id: generateId(),
      type: 'flocculation',
      level: 'info',
      message: `发现少量云絮，注意观察`,
      suggestion: '继续抄造，如云絮增多需检查纸药用量',
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
