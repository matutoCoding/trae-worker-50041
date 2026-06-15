import { useState, useEffect, useMemo } from 'react';
import { Ruler, RefreshCw, Thermometer, Gauge, Save, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import NumberRoll from '@/components/NumberRoll';
import { generateThicknessMap, detectCloudFlocs, calculateOverallDeviation, checkThicknessAlerts, checkFlocculationAlerts } from '@/utils/detection';
import { simulatePressDrying, calculateTensileStrength, simulateGrainPattern, estimateProductionTime } from '@/utils/simulation';
import { checkTearingRisk, checkShrinkageRisk } from '@/utils/validation';
import { generateBatchNo } from '@/utils/storage';
import type { ThicknessPoint, CloudFloc, RiskAlert, SheetRecord } from '@/types';

const GRID_SIZE = 5;

export default function Thickness() {
  const { mixtures, currentMixture, addSheetRecord, materials } = useAppStore();
  
  const [selectedMixture, setSelectedMixture] = useState('');
  const [thicknessMap, setThicknessMap] = useState<ThicknessPoint[]>([]);
  const [cloudFlocs, setCloudFlocs] = useState<CloudFloc[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [pressPressure, setPressPressure] = useState(25);
  const [dryingTemp, setDryingTemp] = useState(45);
  const [notes, setNotes] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [showSimulation, setShowSimulation] = useState(false);

  useEffect(() => {
    setBatchNo(generateBatchNo());
  }, []);

  useEffect(() => {
    if (mixtures.length > 0 && !selectedMixture && currentMixture) {
      setSelectedMixture(currentMixture.id);
    } else if (mixtures.length > 0 && !selectedMixture) {
      setSelectedMixture(mixtures[0].id);
    }
  }, [mixtures, currentMixture, selectedMixture]);

  const activeMixture = useMemo(() => {
    return mixtures.find(m => m.id === selectedMixture) || currentMixture;
  }, [mixtures, selectedMixture, currentMixture]);

  const avgFiberLength = useMemo(() => {
    if (!activeMixture) return 2;
    return activeMixture.fiberComponents.reduce((sum, fc) => {
      const material = materials.find(m => m.id === fc.materialId);
      return sum + (material?.fiberLength || 0) * fc.percentage / 100;
    }, 0);
  }, [activeMixture, materials]);

  const avgBeatingDegree = useMemo(() => {
    if (!activeMixture) return 40;
    return activeMixture.fiberComponents.reduce((sum, fc) => sum + fc.percentage * fc.beatingDegree / 100, 0);
  }, [activeMixture]);

  const simulationResult = useMemo(() => {
    if (!activeMixture || !showSimulation) return null;
    return simulatePressDrying(pressPressure, dryingTemp, activeMixture.targetThickness);
  }, [activeMixture, pressPressure, dryingTemp, showSimulation]);

  const grainPattern = useMemo(() => {
    if (!activeMixture) return null;
    return simulateGrainPattern(activeMixture.swingTimes, avgFiberLength, true);
  }, [activeMixture, avgFiberLength]);

  const tensileStrength = useMemo(() => {
    if (!activeMixture || !simulationResult) return 0;
    return calculateTensileStrength(avgFiberLength, avgBeatingDegree, activeMixture.pulpConcentration, pressPressure);
  }, [activeMixture, avgFiberLength, avgBeatingDegree, pressPressure, simulationResult]);

  const productionTime = useMemo(() => {
    if (!activeMixture) return null;
    return estimateProductionTime(activeMixture.swingTimes, pressPressure, dryingTemp);
  }, [activeMixture, pressPressure, dryingTemp]);

  const overallDeviation = useMemo(() => {
    return calculateOverallDeviation(thicknessMap);
  }, [thicknessMap]);

  const avgActualThickness = useMemo(() => {
    if (thicknessMap.length === 0) return 0;
    return Number((thicknessMap.reduce((sum, p) => sum + p.thickness, 0) / thicknessMap.length).toFixed(1));
  }, [thicknessMap]);

  const actualGrammage = useMemo(() => {
    if (!activeMixture || avgActualThickness === 0) return 0;
    return Number((activeMixture.targetGrammage * (avgActualThickness / activeMixture.targetThickness)).toFixed(1));
  }, [activeMixture, avgActualThickness]);

  const handleDetect = () => {
    if (!activeMixture) return;
    
    const map = generateThicknessMap(activeMixture.targetThickness, GRID_SIZE);
    setThicknessMap(map);
    
    const flocs = detectCloudFlocs(map, GRID_SIZE);
    setCloudFlocs(flocs);
    
    const thicknessAlerts = checkThicknessAlerts(map);
    const flocAlerts = checkFlocculationAlerts(flocs);
    const tearingAlert = checkTearingRisk(activeMixture.paperChemicalDosage, avgBeatingDegree, dryingTemp);
    const shrinkageAlert = checkShrinkageRisk(avgBeatingDegree, dryingTemp, pressPressure);
    
    const allAlerts = [...thicknessAlerts, ...flocAlerts];
    if (tearingAlert) allAlerts.push(tearingAlert);
    if (shrinkageAlert) allAlerts.push(shrinkageAlert);
    
    setAlerts(allAlerts);
    setShowSimulation(true);
  };

  const handleReset = () => {
    setThicknessMap([]);
    setCloudFlocs([]);
    setAlerts([]);
    setShowSimulation(false);
    setBatchNo(generateBatchNo());
  };

  const handleSave = () => {
    if (!activeMixture || thicknessMap.length === 0) return;
    
    const reportLines = [
      `批次 ${batchNo} 检测报告`,
      `配比方案：${activeMixture.name}`,
      `纤维：${activeMixture.fiberComponents.map(fc => `${fc.materialName} ${fc.percentage}%/${fc.beatingDegree}°SR`).join('，')}`,
      `平均纤维长度：${avgFiberLength.toFixed(2)}mm`,
      `目标克重：${activeMixture.targetGrammage}g/m² / 实际：${actualGrammage}g/m²`,
      `目标厚度：${activeMixture.targetThickness}μm / 实际：${avgActualThickness}μm`,
      `厚度偏差率：${overallDeviation}%`,
      `抗张强度：${tensileStrength}`,
      `匀度：${Math.max(0, 100 - overallDeviation * 2)}`,
      `云絮：${cloudFlocs.length > 0 ? cloudFlocs.length + '处（' + cloudFlocs.map(f => f.severity === 'severe' ? '严重' : f.severity === 'moderate' ? '中等' : '轻微').join('、') + '）' : '无'}`,
      `帘纹：${grainPattern ? grainPattern.patternType + '（' + grainPattern.description + '，质量' + grainPattern.quality + '分）' : '-'}`,
      `压榨${pressPressure}kg / 晒纸${dryingTemp}°C`,
      `收缩率：${simulationResult?.shrinkageRate ?? '-'}% / 平整度：${simulationResult?.smoothness ?? '-'}分`,
      ...(simulationResult?.riskOfCracking ? ['⚠ 存在开裂风险'] : []),
      ...(alerts.length > 0 ? alerts.map(a => `[${a.level === 'danger' ? '风险' : a.level === 'warning' ? '预警' : '提示'}] ${a.message}`) : []),
    ];
    
    const record: Omit<SheetRecord, 'id' | 'createdAt'> = {
      mixtureId: activeMixture.id,
      batchNo,
      actualGrammage,
      actualThickness: avgActualThickness,
      thicknessDeviation: overallDeviation,
      thicknessMap,
      hasCloudFloc: cloudFlocs.length > 0,
      cloudFlocPositions: cloudFlocs,
      pressPressure,
      dryingTemp,
      shrinkageRate: simulationResult?.shrinkageRate || 0,
      smoothness: simulationResult?.smoothness || 0,
      tensileStrength,
      evenness: Math.max(0, 100 - overallDeviation * 2),
      riskAlerts: alerts,
      notes,
      reportSummary: reportLines.join('\n'),
    };
    
    addSheetRecord(record);
    handleReset();
  };

  const getThicknessColor = (point: ThicknessPoint) => {
    if (point.isWarning) return 'bg-vermilion/80 text-white';
    if (point.deviation > 5) return 'bg-amber-400/80 text-white';
    return 'bg-bamboo-green/80 text-white';
  };

  const getCloudFlocColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-vermilion';
      case 'moderate': return 'bg-ochre-red';
      default: return 'bg-gilt-gold';
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'danger': return 'danger';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif-cn text-ink-black">抄纸厚薄</h2>
          <p className="text-ash-gray mt-1">检测厚薄偏差、识别云絮瑕疵、模拟压榨晒纸</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-outline flex items-center gap-2" onClick={handleReset}>
            <RefreshCw size={18} />
            重置
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={thicknessMap.length === 0}
          >
            <Save size={18} />
            保存记录
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="抄纸参数">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="label-text">批次号</label>
                <div className="input-field font-mono text-ochre-red font-bold">{batchNo}</div>
              </div>
              <div>
                <label className="label-text">选择配比方案</label>
                <select
                  className="input-field"
                  value={selectedMixture}
                  onChange={(e) => setSelectedMixture(e.target.value)}
                >
                  {mixtures.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              {activeMixture && (
                <>
                  <div>
                    <label className="label-text">目标厚度 (μm)</label>
                    <div className="input-field font-bold text-ink-black">{activeMixture.targetThickness} μm</div>
                  </div>
                  <div>
                    <label className="label-text">荡料次数</label>
                    <div className="input-field font-bold text-ochre-red">{activeMixture.swingTimes} 次</div>
                  </div>
                  <div>
                    <label className="label-text flex items-center gap-2">
                      <Gauge size={16} />
                      压榨压力 (kg)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="5"
                        max="50"
                        className="flex-1"
                        value={pressPressure}
                        onChange={(e) => setPressPressure(Number(e.target.value))}
                      />
                      <span className="w-12 text-right font-bold">{pressPressure}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label-text flex items-center gap-2">
                      <Thermometer size={16} />
                      晒纸温度 (°C)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="20"
                        max="80"
                        className="flex-1"
                        value={dryingTemp}
                        onChange={(e) => setDryingTemp(Number(e.target.value))}
                      />
                      <span className="w-12 text-right font-bold">{dryingTemp}°</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              <button
                className="btn-primary text-lg px-8 py-3 flex items-center gap-2"
                onClick={handleDetect}
                disabled={!activeMixture}
              >
                <Eye size={24} />
                检测厚薄与云絮
              </button>
            </div>
          </Card>

          {thicknessMap.length > 0 && (
            <Card title="厚薄分布图" subtitle="点击网格可查看详细数据">
              <div className="relative">
                <div
                  className="grid gap-2 mx-auto"
                  style={{
                    gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                    maxWidth: '400px',
                    aspectRatio: '1',
                  }}
                >
                  {thicknessMap.map((point, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold cursor-pointer transition-all hover:scale-105 ${getThicknessColor(point)} ${point.isWarning ? 'animate-pulse-slow' : ''}`}
                      title={`位置(${point.x},${point.y}): ${point.thickness}μm, 偏差${point.deviation}%`}
                    >
                      <span>{point.thickness}</span>
                      <span className={`text-[10px] ${point.isWarning ? 'text-white' : 'opacity-80'}`}>
                        {point.deviation}%
                      </span>
                    </div>
                  ))}
                </div>

                {cloudFlocs.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    {cloudFlocs.map((floc, index) => (
                      <div
                        key={index}
                        className={`absolute rounded-full ${getCloudFlocColor(floc.severity)} opacity-60 animate-pulse`}
                        style={{
                          width: `${floc.size}px`,
                          height: `${floc.size}px`,
                          left: `${floc.x * 100}%`,
                          top: `${floc.y * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                        title={`云絮 - ${floc.severity === 'severe' ? '严重' : floc.severity === 'moderate' ? '中等' : '轻微'}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-bamboo-green/80"></div>
                  <span>正常 (≤5%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-400/80"></div>
                  <span>注意 (5-10%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-vermilion/80"></div>
                  <span className="deviation-warning">超标 (>10%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-vermilion opacity-60 animate-pulse"></div>
                  <span>云絮</span>
                </div>
              </div>
            </Card>
          )}

          {alerts.length > 0 && (
            <Card title="风险预警">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    level={getAlertLevelColor(alert.level) as any}
                    message={alert.message}
                    suggestion={alert.suggestion}
                  />
                ))}
              </div>
            </Card>
          )}

          {thicknessMap.length > 0 && (
            <Card title="备注">
              <textarea
                className="input-field min-h-[80px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="记录本次抄造的特殊情况、调整措施等..."
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {activeMixture && (
            <Card title="当前配比参数">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ash-gray">纸浆浓度</span>
                  <span className="font-bold">{activeMixture.pulpConcentration}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">绝干浆用量</span>
                  <span className="font-bold">{activeMixture.absoluteDryPulp}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">纤维组分</span>
                  <span className="font-bold">{activeMixture.fiberComponents.length}种</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">平均纤维长度</span>
                  <span className="font-bold">{avgFiberLength.toFixed(2)}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">平均打浆度</span>
                  <span className="font-bold">{avgBeatingDegree.toFixed(1)}°SR</span>
                </div>
              </div>
            </Card>
          )}

          {thicknessMap.length > 0 && (
            <>
              <Card title="检测结果">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">平均厚度</span>
                    <span className="value-display">
                      <NumberRoll value={avgActualThickness} decimals={1} suffix="μm" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">实际克重</span>
                    <span className="value-display">
                      <NumberRoll value={actualGrammage} decimals={1} suffix="g/m²" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">整体偏差率</span>
                    <span className={`value-display ${overallDeviation > 8 ? 'deviation-warning' : overallDeviation > 5 ? 'text-amber-500' : 'text-bamboo-green'}`}>
                      <NumberRoll value={overallDeviation} decimals={2} suffix="%" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">云絮数量</span>
                    <span className={`value-display ${cloudFlocs.length > 0 ? 'deviation-warning' : 'text-bamboo-green'}`}>
                      <NumberRoll value={cloudFlocs.length} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">抗张强度</span>
                    <span className="value-display text-ochre-red">
                      <NumberRoll value={tensileStrength} />
                    </span>
                  </div>
                </div>
              </Card>

              {simulationResult && (
                <Card title="压榨晒纸模拟">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                      <span className="text-ash-gray">最终厚度</span>
                      <span className="value-display">
                        <NumberRoll value={simulationResult.finalThickness} decimals={1} suffix="μm" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                      <span className="text-ash-gray">收缩率</span>
                      <span className={`value-display ${simulationResult.shrinkageRate > 12 ? 'deviation-warning' : ''}`}>
                        <NumberRoll value={simulationResult.shrinkageRate} decimals={2} suffix="%" />
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                      <span className="text-ash-gray">平整度</span>
                      <span className="value-display text-bamboo-green">
                        <NumberRoll value={simulationResult.smoothness} suffix="分" />
                      </span>
                    </div>
                    {simulationResult.riskOfCracking && (
                      <Alert level="danger" message="存在开裂风险" suggestion="高温加高压力易导致纸张开裂，建议降低温度或压力" />
                    )}
                  </div>
                </Card>
              )}

              {grainPattern && (
                <Card title="帘纹预测">
                  <div className="text-center space-y-2">
                    <div className="text-xl font-bold font-serif-cn text-ochre-red">
                      {grainPattern.patternType}
                    </div>
                    <p className="text-sm text-ash-gray">{grainPattern.description}</p>
                    <div className="mt-2">
                      <span className="text-ash-gray">帘纹质量：</span>
                      <span className="font-bold text-bamboo-green">{grainPattern.quality}分</span>
                    </div>
                  </div>
                </Card>
              )}

              {productionTime && (
                <Card title="生产工时估算">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ash-gray">荡料</span>
                      <span className="font-bold">{productionTime.swingTime}秒</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ash-gray">压榨</span>
                      <span className="font-bold">{productionTime.pressTime}分钟</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ash-gray">晒纸</span>
                      <span className="font-bold">{productionTime.dryingTime}分钟</span>
                    </div>
                    <div className="pt-2 border-t border-gilt-gold/20 flex justify-between">
                      <span className="text-ash-gray font-medium">总计</span>
                      <span className="font-bold text-ochre-red">{Math.round(productionTime.totalTime / 60)}分钟</span>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}

          {thicknessMap.length === 0 && (
            <Card>
              <div className="text-center py-12 text-ash-gray">
                <Ruler size={48} className="mx-auto mb-4 opacity-30" />
                <p>点击检测按钮开始</p>
                <p className="text-sm mt-1">系统将模拟厚薄分布和云絮检测</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
