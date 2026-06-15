import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, RefreshCw, Thermometer, Gauge, Save, Eye, ArrowLeft, Lightbulb, GitBranch } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import NumberRoll from '@/components/NumberRoll';
import { generateThicknessMap, detectCloudFlocs, calculateOverallDeviation, checkThicknessAlerts, checkFlocculationAlerts } from '@/utils/detection';
import { simulatePressDrying, calculateTensileStrength, simulateGrainPattern, estimateProductionTime } from '@/utils/simulation';
import { checkTearingRisk, checkShrinkageRisk } from '@/utils/validation';
import { generateBatchNo } from '@/utils/storage';
import type { ThicknessPoint, CloudFloc, RiskAlert, SheetRecord, PulpMixture } from '@/types';

const GRID_SIZE = 5;

export default function Thickness() {
  const { mixtures, currentMixture, materials, addSheetRecord, addMixture, setCurrentMixture, formulas } = useAppStore();
  const navigate = useNavigate();

  const [selectedMixture, setSelectedMixture] = useState('');
  const [thicknessMap, setThicknessMap] = useState<ThicknessPoint[]>([]);
  const [cloudFlocs, setCloudFlocs] = useState<CloudFloc[]>([]);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [pressPressure, setPressPressure] = useState(25);
  const [dryingTemp, setDryingTemp] = useState(45);
  const [notes, setNotes] = useState('');
  const [batchNo, setBatchNo] = useState('');
  const [showSimulation, setShowSimulation] = useState(false);
  const [savedBatchNo, setSavedBatchNo] = useState<string | null>(null);

  useEffect(() => {
    setBatchNo(generateBatchNo());
  }, []);

  const activeMixture = useMemo(() => {
    return mixtures.find(m => m.id === selectedMixture) || currentMixture;
  }, [mixtures, selectedMixture, currentMixture]);

  useEffect(() => {
    if (mixtures.length > 0 && !selectedMixture && currentMixture) {
      setSelectedMixture(currentMixture.id);
      if (typeof currentMixture.suggestedPressPressure === 'number') {
        setPressPressure(currentMixture.suggestedPressPressure);
      }
      if (typeof currentMixture.suggestedDryingTemp === 'number') {
        setDryingTemp(currentMixture.suggestedDryingTemp);
      }
    } else if (mixtures.length > 0 && !selectedMixture) {
      setSelectedMixture(mixtures[0].id);
    }
  }, [mixtures, currentMixture, selectedMixture]);

  useEffect(() => {
    if (!activeMixture) return;
    if (typeof activeMixture.suggestedPressPressure === 'number') {
      setPressPressure(prev => prev === 25 ? (activeMixture.suggestedPressPressure as number) : prev);
    }
    if (typeof activeMixture.suggestedDryingTemp === 'number') {
      setDryingTemp(prev => prev === 45 ? (activeMixture.suggestedDryingTemp as number) : prev);
    }
  }, [activeMixture?.id]);

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

  const evenness = useMemo(() => Math.max(0, 100 - overallDeviation * 2), [overallDeviation]);

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

    const extraAlerts: RiskAlert[] = [];
    if (evenness < 70 && overallDeviation > 3) {
      extraAlerts.push({
        id: `evn-${Date.now()}`,
        type: 'low_evenness',
        level: overallDeviation > 7 ? 'danger' : 'warning',
        message: `匀度偏低（${evenness}分）`,
        suggestion: '增加荡料次数或提升纸药用量，改善纤维分散',
        timestamp: new Date().toISOString(),
      });
    }
    if (tensileStrength < 70 && tensileStrength > 0) {
      extraAlerts.push({
        id: `str-${Date.now()}`,
        type: 'low_strength',
        level: tensileStrength < 50 ? 'danger' : 'warning',
        message: `抗张强度偏低（${tensileStrength}）`,
        suggestion: '提升打浆度5-10°SR、或适当增加青檀/桑皮皮料比例',
        timestamp: new Date().toISOString(),
      });
    }
    if (overallDeviation > 6) {
      extraAlerts.push({
        id: `dev-${Date.now()}`,
        type: 'high_deviation',
        level: overallDeviation > 10 ? 'danger' : 'warning',
        message: `厚度偏差偏大（${overallDeviation.toFixed(2)}%）`,
        suggestion: '调整荡料节奏，保证帘床入料均匀，纸药略增',
        timestamp: new Date().toISOString(),
      });
    }

    setAlerts([...thicknessAlerts, ...flocAlerts, tearingAlert, shrinkageAlert, ...extraAlerts].filter(Boolean) as RiskAlert[]);
    setShowSimulation(true);
  };

  const handleReset = () => {
    setThicknessMap([]);
    setCloudFlocs([]);
    setAlerts([]);
    setShowSimulation(false);
    setSavedBatchNo(null);
    setBatchNo(generateBatchNo());
  };

  const buildAdjustmentPlan = () => {
    if (!activeMixture) return null;

    const suggestions: string[] = [];
    const params = {
      chemicalDosage: activeMixture.paperChemicalDosage,
      swingTimes: activeMixture.swingTimes,
      targetThickness: activeMixture.targetThickness,
      targetGrammage: activeMixture.targetGrammage,
      dryingTemp: dryingTemp,
      pressPressure: pressPressure,
      beatingAdjust: 0,
    };

    alerts.forEach(a => {
      switch (a.type) {
        case 'uneven_thickness':
          params.swingTimes = Math.min(12, params.swingTimes + 1);
          params.chemicalDosage = Math.min(2.5, +(params.chemicalDosage + 0.15).toFixed(2));
          suggestions.push('厚薄不均 → 荡料+1次，纸药+0.15%');
          break;
        case 'flocculation':
          params.chemicalDosage = Math.min(2.5, +(params.chemicalDosage + 0.25).toFixed(2));
          params.swingTimes = Math.min(12, params.swingTimes + 1);
          suggestions.push('纤维絮聚 → 纸药+0.25%，荡料+1次');
          break;
        case 'tearing':
          params.chemicalDosage = Math.min(2.5, +(params.chemicalDosage + 0.15).toFixed(2));
          params.dryingTemp = Math.max(25, params.dryingTemp - 5);
          suggestions.push('揭纸破损 → 纸药+0.15%，晒纸降温5°C');
          break;
        case 'excessive_shrinkage':
          params.pressPressure = Math.max(5, params.pressPressure - 4);
          params.dryingTemp = Math.max(25, params.dryingTemp - 8);
          params.targetThickness = Math.round(params.targetThickness * 1.04);
          params.targetGrammage = Math.round(params.targetGrammage * 1.02);
          suggestions.push('收缩过大 → 压榨降4kg、晒纸降8°C，目标厚度+4%、克重+2%');
          break;
        case 'high_deviation':
          params.swingTimes = Math.min(12, params.swingTimes + 1);
          params.chemicalDosage = Math.min(2.5, +(params.chemicalDosage + 0.1).toFixed(2));
          suggestions.push('偏差过大 → 荡料+1次，纸药+0.1%');
          break;
        case 'low_strength':
          params.beatingAdjust = Math.min(15, params.beatingAdjust + 8);
          params.pressPressure = Math.min(50, params.pressPressure + 3);
          suggestions.push('强度偏弱 → 打浆度+8°SR，压榨压力+3kg');
          break;
        case 'low_evenness':
          params.chemicalDosage = Math.min(2.5, +(params.chemicalDosage + 0.12).toFixed(2));
          params.swingTimes = Math.min(12, params.swingTimes + 1);
          suggestions.push('匀度偏低 → 纸药+0.12%，荡料+1次');
          break;
      }
    });

    if (suggestions.length === 0) return null;

    const adjustNotes = `来自批次 ${batchNo} 检测改进（${alerts.filter(a => a.level === 'danger').length}风险${alerts.filter(a => a.level === 'warning').length}预警）：${suggestions.join('；')}`;

    const improvedFiberComponents = activeMixture.fiberComponents.map(fc => ({
      ...fc,
      beatingDegree: Math.min(95, fc.beatingDegree + params.beatingAdjust),
    }));

    const improvedMixture: Omit<PulpMixture, 'id' | 'createdAt'> = {
      name: `${activeMixture.name}·调整草案`,
      fiberComponents: improvedFiberComponents,
      paperChemicalId: activeMixture.paperChemicalId,
      paperChemicalDosage: params.chemicalDosage,
      targetGrammage: params.targetGrammage,
      targetThickness: params.targetThickness,
      targetWidth: activeMixture.targetWidth,
      targetHeight: activeMixture.targetHeight,
      pulpConcentration: activeMixture.pulpConcentration,
      absoluteDryPulp: activeMixture.absoluteDryPulp,
      swingTimes: params.swingTimes,
      sourceFormulaId: activeMixture.sourceFormulaId,
      adjustmentFromBatch: batchNo,
      adjustmentNotes: adjustNotes,
      suggestedPressPressure: params.pressPressure,
      suggestedDryingTemp: params.dryingTemp,
    };

    return {
      improvedMixture,
      adjustNotes,
      summarySuggestions: suggestions,
      adjustedDryingTemp: params.dryingTemp,
      adjustedPressPressure: params.pressPressure,
    };
  };

  const handleGoToMixtureTrial = () => {
    if (!activeMixture) return;
    const plan = buildAdjustmentPlan();
    if (!plan) return;

    const { improvedMixture } = plan;
    addMixture(improvedMixture);

    setTimeout(() => {
      const latest = useAppStore.getState().mixtures;
      if (latest.length > 0) {
        setCurrentMixture(latest[latest.length - 1]);
      }
      navigate('/mixture');
    }, 30);
  };

  const handleSave = () => {
    if (!activeMixture || thicknessMap.length === 0) return;

    const parentBatchNo = activeMixture.adjustmentFromBatch;
    let improvementChain: string[] = [];
    if (parentBatchNo) {
      const parentRecord = useAppStore.getState().sheetRecords.find(r => r.batchNo === parentBatchNo);
      improvementChain = [...(parentRecord?.improvementChain || []), parentBatchNo];
    }

    const reportLines = [
      `批次 ${batchNo} 检测报告`,
      `配比方案：${activeMixture.name}`,
      `纤维：${activeMixture.fiberComponents.map(fc => `${fc.materialName} ${fc.percentage}%/${fc.beatingDegree}°SR`).join('，')}`,
      `平均纤维长度：${avgFiberLength.toFixed(2)}mm`,
      `目标克重：${activeMixture.targetGrammage}g/m² / 实际：${actualGrammage}g/m²`,
      `目标厚度：${activeMixture.targetThickness}μm / 实际：${avgActualThickness}μm`,
      `厚度偏差率：${overallDeviation}%`,
      `抗张强度：${tensileStrength}`,
      `匀度：${evenness}`,
      `云絮：${cloudFlocs.length > 0 ? cloudFlocs.length + '处（' + cloudFlocs.map(f => f.severity === 'severe' ? '严重' : f.severity === 'moderate' ? '中等' : '轻微').join('、') + '）' : '无'}`,
      `帘纹：${grainPattern ? grainPattern.patternType + '（' + grainPattern.description + '，质量' + grainPattern.quality + '分）' : '-'}`,
      `压榨${pressPressure}kg / 晒纸${dryingTemp}°C`,
      `收缩率：${simulationResult?.shrinkageRate ?? '-'}% / 平整度：${simulationResult?.smoothness ?? '-'}分`,
      ...(parentBatchNo ? [`改进链：${[...improvementChain, parentBatchNo].join(' → ')} → 本次`] : []),
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
      evenness,
      riskAlerts: alerts,
      notes,
      reportSummary: reportLines.join('\n'),
      parentBatchNo: parentBatchNo || undefined,
      improvementChain,
    };

    addSheetRecord(record);
    setSavedBatchNo(batchNo);
  };

  const plan = thicknessMap.length > 0 && alerts.length > 0 ? buildAdjustmentPlan() : null;

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-serif-cn text-ink-black">抄纸厚薄</h2>
          <p className="text-ash-gray mt-1">检测厚薄偏差、识别云絮瑕疵、模拟压榨晒纸</p>
        </div>
        <div className="flex gap-3 flex-wrap">
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

      {activeMixture?.adjustmentFromBatch && (
        <Card className="!p-3 border-l-4 !border-l-ochre-red">
          <div className="flex items-start gap-3">
            <GitBranch size={20} className="text-ochre-red shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <div className="font-bold text-ochre-red mb-1">
                改进链续接：本次配比由批次「{activeMixture.adjustmentFromBatch}」的预警优化而来
              </div>
              {activeMixture.adjustmentNotes && (
                <div className="text-ash-gray whitespace-pre-line">{activeMixture.adjustmentNotes}</div>
              )}
              <div className="mt-2 text-xs text-bamboo-green">
                💡 继续保存后，将自动串入批次改进链，便于复盘调参效果
              </div>
            </div>
          </div>
        </Card>
      )}

      {savedBatchNo && (
        <Card className="!p-3 border-l-4 !border-l-bamboo-green">
          <div className="flex items-start gap-3">
            <Save size={20} className="text-bamboo-green shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <div className="font-bold text-bamboo-green mb-1">
                批次 {savedBatchNo} 已存入工艺档案
              </div>
              <div className="flex gap-3 mt-2 flex-wrap">
                <button
                  className="btn-outline text-xs py-1.5 flex items-center gap-1"
                  onClick={() => navigate('/archives')}
                >
                  → 去工艺档案查看
                </button>
                {plan && (
                  <button
                    className="btn-secondary text-xs py-1.5 flex items-center gap-1"
                    onClick={handleGoToMixtureTrial}
                  >
                    <Lightbulb size={14} />
                    根据本次预警生成调整草案→试算台
                  </button>
                )}
                <button
                  className="btn-outline text-xs py-1.5 flex items-center gap-1"
                  onClick={() => {
                    setSavedBatchNo(null);
                    handleReset();
                  }}
                >
                  继续下一批
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

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
                    <option key={m.id} value={m.id}>{m.name}{m.adjustmentFromBatch ? ` (来自${m.adjustmentFromBatch})` : ''}</option>
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

              <div className="mt-4 flex items-center justify-center gap-6 text-sm flex-wrap">
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
                  <span className="deviation-warning">超标 {'(>10%)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-vermilion opacity-60 animate-pulse"></div>
                  <span>云絮</span>
                </div>
              </div>
            </Card>
          )}

          {alerts.length > 0 && (
            <Card
              title="风险预警"
              subtitle={
                plan ? (
                  <span className="text-ochre-red flex items-center gap-1">
                    <Lightbulb size={14} />
                    系统已生成调参建议，可一键带回试算台
                  </span>
                ) : undefined
              }
            >
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
              {plan && (
                <div className="mt-6 pt-5 border-t border-gilt-gold/20">
                  <div className="flex items-start gap-3 mb-4">
                    <Lightbulb size={20} className="text-gilt-gold shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-bold text-ink-black mb-2">📋 调整草案预览</div>
                      <div className="text-sm text-ash-gray space-y-1">
                        {plan.summarySuggestions.map((s, i) => (
                          <div key={i}>• {s}</div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-2 bg-xuan-paper/50 rounded">
                          <div className="text-ash-gray">纸药</div>
                          <div className="font-bold text-ochre-red">{activeMixture!.paperChemicalDosage}% → {plan.improvedMixture.paperChemicalDosage}%</div>
                        </div>
                        <div className="p-2 bg-xuan-paper/50 rounded">
                          <div className="text-ash-gray">荡料</div>
                          <div className="font-bold text-ochre-red">{activeMixture!.swingTimes} → {plan.improvedMixture.swingTimes} 次</div>
                        </div>
                        <div className="p-2 bg-xuan-paper/50 rounded">
                          <div className="text-ash-gray">压榨</div>
                          <div className="font-bold text-ochre-red">{pressPressure} → {plan.adjustedPressPressure} kg</div>
                        </div>
                        <div className="p-2 bg-xuan-paper/50 rounded">
                          <div className="text-ash-gray">晒纸</div>
                          <div className="font-bold text-ochre-red">{dryingTemp} → {plan.adjustedDryingTemp}°C</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      className="btn-primary flex items-center gap-2"
                      onClick={handleGoToMixtureTrial}
                    >
                      <ArrowLeft size={18} />
                      生成草案 → 回试算台
                    </button>
                    <button
                      className="btn-outline flex items-center gap-2"
                      onClick={() => {
                        setDryingTemp(plan.adjustedDryingTemp);
                        setPressPressure(plan.adjustedPressPressure);
                      }}
                    >
                      仅套用压榨/晒纸参数于本页
                    </button>
                  </div>
                </div>
              )}
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
            <Card
              title="当前配比参数"
              subtitle={
                activeMixture.sourceFormulaId ? (
                  <span className="text-ochre-red text-xs">
                    来源配方：{formulas.find(f => f.id === activeMixture.sourceFormulaId)?.name || '配方库'}
                  </span>
                ) : undefined
              }
            >
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
                <div className="flex justify-between">
                  <span className="text-ash-gray">目标克重</span>
                  <span className="font-bold">{activeMixture.targetGrammage}g/m²</span>
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
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">匀度</span>
                    <span className={`value-display ${evenness < 70 ? 'deviation-warning' : evenness < 80 ? 'text-amber-500' : 'text-bamboo-green'}`}>
                      <NumberRoll value={evenness} suffix="分" />
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
