import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ArrowLeftRight, Save, Copy, RotateCcw, BookOpen, Package, Ruler as RulerIcon } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import NumberRoll from '@/components/NumberRoll';
import { calculateMixture, reverseCalculateMixture } from '@/utils/calculations';
import { validateFiberPercentage, validatePaperChemical } from '@/utils/validation';
import type { FiberComponent, CalculationResult, PulpMixture } from '@/types';

const COLORS = ['#A85537', '#6B8E6B', '#C9A961', '#8B8680', '#2C2416'];

type FormulaSnapshot = {
  name: string;
  fiberComponents: FiberComponent[];
  paperChemicalId: string;
  paperChemicalDosage: number;
  targetGrammage: number;
  targetThickness: number;
  targetWidth: number;
  targetHeight: number;
};

export default function Mixture() {
  const {
    materials,
    paperChemicals,
    formulas,
    addMixture,
    updateMixture,
    currentMixture,
    setCurrentMixture,
    updateFormula,
    createFormulaFromMixture,
  } = useAppStore();
  const navigate = useNavigate();

  const [mixtureName, setMixtureName] = useState('');
  const [fiberComponents, setFiberComponents] = useState<FiberComponent[]>([]);
  const [selectedChemical, setSelectedChemical] = useState('');
  const [chemicalDosage, setChemicalDosage] = useState(0.8);
  const [targetGrammage, setTargetGrammage] = useState(38);
  const [targetThickness, setTargetThickness] = useState(65);
  const [targetWidth, setTargetWidth] = useState(700);
  const [targetHeight, setTargetHeight] = useState(1380);
  const [showReverse, setShowReverse] = useState(false);
  const [targetStrength, setTargetStrength] = useState(75);
  const [targetEvenness, setTargetEvenness] = useState(80);
  const [calculationResult, setCalculationResult] = useState<CalculationResult | null>(null);
  const [originalFormula, setOriginalFormula] = useState<FormulaSnapshot | null>(null);
  const [sourceFormulaId, setSourceFormulaId] = useState<string | undefined>(undefined);
  const [adjustmentNotes, setAdjustmentNotes] = useState<string | undefined>(undefined);
  const [adjustmentFromBatch, setAdjustmentFromBatch] = useState<string | undefined>(undefined);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [alertState, setAlertState] = useState<{ show: boolean; level: 'info' | 'success' | 'warning' | 'danger'; message: string; suggestion?: string } | null>(null);

  useEffect(() => {
    if (currentMixture) return;
    if (materials.length > 0 && fiberComponents.length === 0) {
      setFiberComponents([{
        materialId: materials[0].id,
        materialName: materials[0].name,
        percentage: 100,
        beatingDegree: 40,
      }]);
    }
    if (paperChemicals.length > 0 && !selectedChemical) {
      setSelectedChemical(paperChemicals[0].id);
    }
  }, [materials, paperChemicals, currentMixture, fiberComponents.length, selectedChemical]);

  useEffect(() => {
    if (!currentMixture) return;
    setMixtureName(currentMixture.name);
    setFiberComponents(currentMixture.fiberComponents.map(fc => ({ ...fc })));
    setSelectedChemical(currentMixture.paperChemicalId);
    setChemicalDosage(currentMixture.paperChemicalDosage);
    setTargetGrammage(currentMixture.targetGrammage);
    setTargetThickness(currentMixture.targetThickness);
    setTargetWidth(currentMixture.targetWidth);
    setTargetHeight(currentMixture.targetHeight);
    setSourceFormulaId(currentMixture.sourceFormulaId);
    setAdjustmentNotes(currentMixture.adjustmentNotes);
    setAdjustmentFromBatch(currentMixture.adjustmentFromBatch);
    setOriginalFormula({
      name: currentMixture.name,
      fiberComponents: currentMixture.fiberComponents.map(fc => ({ ...fc })),
      paperChemicalId: currentMixture.paperChemicalId,
      paperChemicalDosage: currentMixture.paperChemicalDosage,
      targetGrammage: currentMixture.targetGrammage,
      targetThickness: currentMixture.targetThickness,
      targetWidth: currentMixture.targetWidth,
      targetHeight: currentMixture.targetHeight,
    });
  }, [currentMixture]);

  const fiberLengthMap = useMemo(() => {
    const map: Record<string, number> = {};
    materials.forEach(m => { map[m.id] = m.fiberLength; });
    return map;
  }, [materials]);

  const doCalculate = useCallback((fc: FiberComponent[], grammage: number, thickness: number, width: number, height: number, dosage: number) => {
    return calculateMixture(fc, grammage, thickness, width, height, dosage, fiberLengthMap);
  }, [fiberLengthMap]);

  useEffect(() => {
    if (fiberComponents.length === 0) return;
    const totalPct = fiberComponents.reduce((s, fc) => s + fc.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.5) return;
    const result = doCalculate(fiberComponents, targetGrammage, targetThickness, targetWidth, targetHeight, chemicalDosage);
    setCalculationResult(result);
  }, [fiberComponents, targetGrammage, targetThickness, targetWidth, targetHeight, chemicalDosage, doCalculate]);

  const sourceFormulaName = sourceFormulaId
    ? formulas.find(f => f.id === sourceFormulaId)?.name
    : null;

  const addFiberComponent = () => {
    if (materials.length > fiberComponents.length) {
      const available = materials.filter(m => !fiberComponents.find(f => f.materialId === m.id));
      if (available.length > 0) {
        const newComponent: FiberComponent = {
          materialId: available[0].id,
          materialName: available[0].name,
          percentage: 0,
          beatingDegree: 40,
        };
        setFiberComponents([...fiberComponents, newComponent]);
      }
    }
  };

  const updateFiberComponent = (index: number, updates: Partial<FiberComponent>) => {
    const newComponents = [...fiberComponents];
    if (updates.materialId) {
      const material = materials.find(m => m.id === updates.materialId);
      if (material) {
        newComponents[index] = { ...newComponents[index], ...updates, materialName: material.name };
      }
    } else {
      newComponents[index] = { ...newComponents[index], ...updates };
    }
    setFiberComponents(newComponents);
  };

  const removeFiberComponent = (index: number) => {
    if (fiberComponents.length > 1) {
      setFiberComponents(fiberComponents.filter((_, i) => i !== index));
    }
  };

  const totalPercentage = useMemo(() => {
    return fiberComponents.reduce((sum, fc) => sum + fc.percentage, 0);
  }, [fiberComponents]);

  const percentageValidation = useMemo(() => {
    return validateFiberPercentage(fiberComponents.map(fc => fc.percentage));
  }, [fiberComponents]);

  const chemicalValidation = useMemo(() => {
    const avgLength = fiberComponents.reduce((sum, fc) => {
      const material = materials.find(m => m.id === fc.materialId);
      return sum + (material?.fiberLength || 0) * fc.percentage / 100;
    }, 0);
    return validatePaperChemical(chemicalDosage, calculationResult?.pulpConcentration || 0.5, avgLength);
  }, [chemicalDosage, calculationResult, fiberComponents, materials]);

  const handleReverseCalculate = () => {
    const availableMaterials = materials.map(m => ({ fiberLength: m.fiberLength }));
    const result = reverseCalculateMixture(targetStrength, targetEvenness, availableMaterials);
    setFiberComponents(prev => prev.map((fc, i) => ({
      ...fc,
      beatingDegree: result.suggestedBeatingDegree + (i * 5),
    })));
    setChemicalDosage(result.suggestedDosage);
    setAlertState({
      show: true,
      level: 'success',
      message: '反推计算完成',
      suggestion: `建议打浆度 ${result.suggestedBeatingDegree}°SR，纸药用量 ${result.suggestedDosage}%`
    });
    setTimeout(() => setAlertState(null), 3000);
  };

  const handleSaveClick = () => {
    if (!calculationResult || !percentageValidation.isValid) return;
    setShowSaveModal(true);
  };

  const buildMixtureData = (): PulpMixture | null => {
    if (!calculationResult) return null;
    return {
      id: currentMixture?.id || '',
      name: mixtureName || (currentMixture?.name ?? ''),
      fiberComponents,
      paperChemicalId: selectedChemical,
      paperChemicalDosage: chemicalDosage,
      targetGrammage,
      targetThickness,
      targetWidth,
      targetHeight,
      pulpConcentration: calculationResult.pulpConcentration,
      absoluteDryPulp: calculationResult.absoluteDryPulp,
      swingTimes: calculationResult.swingTimes,
      sourceFormulaId,
      adjustmentFromBatch,
      adjustmentNotes,
      createdAt: currentMixture?.createdAt || new Date().toISOString(),
    };
  };

  const handleSaveOverwrite = () => {
    if (!currentMixture || !calculationResult) return;
    const updated = updateMixture(currentMixture.id, {
      name: mixtureName || currentMixture.name,
      fiberComponents,
      paperChemicalId: selectedChemical,
      paperChemicalDosage: chemicalDosage,
      targetGrammage,
      targetThickness,
      targetWidth,
      targetHeight,
      pulpConcentration: calculationResult.pulpConcentration,
      absoluteDryPulp: calculationResult.absoluteDryPulp,
      swingTimes: calculationResult.swingTimes,
    });
    if (updated) {
      setCurrentMixture(updated);
      if (sourceFormulaId) {
        updateFormula(sourceFormulaId, {
          mixtureParams: {
            name: mixtureName || updated.name,
            fiberComponents: updated.fiberComponents,
            paperChemicalId: updated.paperChemicalId,
            paperChemicalDosage: updated.paperChemicalDosage,
            targetGrammage: updated.targetGrammage,
            targetThickness: updated.targetThickness,
            targetWidth: updated.targetWidth,
            targetHeight: updated.targetHeight,
            pulpConcentration: updated.pulpConcentration,
            absoluteDryPulp: updated.absoluteDryPulp,
            swingTimes: updated.swingTimes,
          },
        });
        setAlertState({ show: true, level: 'success', message: '已同步更新配方库', suggestion: `配方「${sourceFormulaName}」参数已更新` });
      } else {
        setAlertState({ show: true, level: 'success', message: '方案已覆盖保存' });
      }
      setOriginalFormula({
        name: mixtureName || updated.name,
        fiberComponents: updated.fiberComponents.map(fc => ({ ...fc })),
        paperChemicalId: updated.paperChemicalId,
        paperChemicalDosage: updated.paperChemicalDosage,
        targetGrammage: updated.targetGrammage,
        targetThickness: updated.targetThickness,
        targetWidth: updated.targetWidth,
        targetHeight: updated.targetHeight,
      });
    }
    setShowSaveModal(false);
    setTimeout(() => setAlertState(null), 3500);
  };

  const handleSaveNewOnly = () => {
    if (!calculationResult) return;
    addMixture({
      name: mixtureName || `配比方案 ${new Date().toLocaleDateString()}`,
      fiberComponents,
      paperChemicalId: selectedChemical,
      paperChemicalDosage: chemicalDosage,
      targetGrammage,
      targetThickness,
      targetWidth,
      targetHeight,
      pulpConcentration: calculationResult.pulpConcentration,
      absoluteDryPulp: calculationResult.absoluteDryPulp,
      swingTimes: calculationResult.swingTimes,
      ...(sourceFormulaId ? { sourceFormulaId } : {}),
      ...(adjustmentFromBatch ? { adjustmentFromBatch } : {}),
      ...(adjustmentNotes ? { adjustmentNotes } : {}),
    } as any);
    setShowSaveModal(false);
    setAlertState({ show: true, level: 'success', message: '已另存为新配比方案', suggestion: '配方库未新增配方，仅在配比方案列表中可见' });
    setTimeout(() => setAlertState(null), 3500);
  };

  const handleSaveNewWithFormula = () => {
    if (!calculationResult) return;
    const finalName = mixtureName || `新配方 ${new Date().toLocaleDateString()}`;
    addMixture({
      name: finalName,
      fiberComponents,
      paperChemicalId: selectedChemical,
      paperChemicalDosage: chemicalDosage,
      targetGrammage,
      targetThickness,
      targetWidth,
      targetHeight,
      pulpConcentration: calculationResult.pulpConcentration,
      absoluteDryPulp: calculationResult.absoluteDryPulp,
      swingTimes: calculationResult.swingTimes,
      ...(adjustmentFromBatch ? { adjustmentFromBatch } : {}),
      ...(adjustmentNotes ? { adjustmentNotes } : {}),
    } as any);
    const latest = getLatestMixture();
    if (latest) {
      createFormulaFromMixture(latest, finalName, adjustmentNotes || '由试算台另存生成');
      setAlertState({ show: true, level: 'success', message: '已生成新配方并保存配比', suggestion: `配方库和配比方案同时新增「${finalName}」` });
    } else {
      setAlertState({ show: true, level: 'success', message: '已保存' });
    }
    setShowSaveModal(false);
    setTimeout(() => setAlertState(null), 3500);
  };

  const getLatestMixture = (): PulpMixture | null => {
    const all = useAppStore.getState().mixtures;
    return all.length > 0 ? all[all.length - 1] : null;
  };

  const handleResetToOriginal = () => {
    if (!originalFormula) return;
    setMixtureName(originalFormula.name);
    setFiberComponents(originalFormula.fiberComponents.map(fc => ({ ...fc })));
    setSelectedChemical(originalFormula.paperChemicalId);
    setChemicalDosage(originalFormula.paperChemicalDosage);
    setTargetGrammage(originalFormula.targetGrammage);
    setTargetThickness(originalFormula.targetThickness);
    setTargetWidth(originalFormula.targetWidth);
    setTargetHeight(originalFormula.targetHeight);
  };

  const goToFormula = () => {
    if (sourceFormulaId) navigate('/formulas');
  };

  const goToThickness = () => {
    const mix = buildMixtureData();
    if (mix) {
      if (!currentMixture || currentMixture.id !== mix.id) {
        setCurrentMixture(mix);
      }
      navigate('/thickness');
    }
  };

  const hasDiffFromOriginal = useMemo(() => {
    if (!originalFormula) return false;
    return (
      mixtureName !== originalFormula.name ||
      targetGrammage !== originalFormula.targetGrammage ||
      targetThickness !== originalFormula.targetThickness ||
      targetWidth !== originalFormula.targetWidth ||
      targetHeight !== originalFormula.targetHeight ||
      chemicalDosage !== originalFormula.paperChemicalDosage ||
      selectedChemical !== originalFormula.paperChemicalId ||
      JSON.stringify(fiberComponents) !== JSON.stringify(originalFormula.fiberComponents)
    );
  }, [originalFormula, mixtureName, targetGrammage, targetThickness, targetWidth, targetHeight, chemicalDosage, selectedChemical, fiberComponents]);

  const originalCalcResult = useMemo(() => {
    if (!originalFormula) return null;
    return doCalculate(
      originalFormula.fiberComponents,
      originalFormula.targetGrammage,
      originalFormula.targetThickness,
      originalFormula.targetWidth,
      originalFormula.targetHeight,
      originalFormula.paperChemicalDosage
    );
  }, [originalFormula, doCalculate]);

  const diffValue = (orig: number | undefined, curr: number | undefined) => {
    if (orig === undefined || curr === undefined || orig === curr) return null;
    const diff = curr - orig;
    return diff > 0 ? `+${diff.toFixed(diff % 1 === 0 ? 0 : 2)}` : diff.toFixed(diff % 1 === 0 ? 0 : 2);
  };

  const pieData = useMemo(() => {
    return fiberComponents.map(fc => ({
      name: fc.materialName,
      value: fc.percentage,
    }));
  }, [fiberComponents]);

  const radarData = useMemo(() => {
    if (!calculationResult) return [];
    return [
      { subject: '强度', A: calculationResult.expectedStrength, fullMark: 100 },
      { subject: '匀度', A: calculationResult.expectedEvenness, fullMark: 100 },
      { subject: '韧性', A: 70, fullMark: 100 },
      { subject: '吸墨性', A: 85, fullMark: 100 },
      { subject: '耐久性', A: 90, fullMark: 100 },
    ];
  }, [calculationResult]);

  return (
    <div className="space-y-6">
      {alertState && alertState.show && (
        <Alert level={alertState.level} message={alertState.message} suggestion={alertState.suggestion} />
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold font-serif-cn text-ink-black">配方试算台</h2>
            {sourceFormulaName && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-ochre-red/10 text-ochre-red text-xs cursor-pointer hover:bg-ochre-red/20 transition" onClick={goToFormula}>
                <BookOpen size={14} />
                配方库来源：{sourceFormulaName}
              </span>
            )}
            {!sourceFormulaName && currentMixture && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bamboo-green/10 text-bamboo-green text-xs">
                <Package size={14} />
                配比方案来源：{currentMixture.name}
              </span>
            )}
          </div>
          <p className="text-ash-gray mt-1">
            {originalFormula ? `基于「${originalFormula.name}」试算 — 调参后实时对比原配方` : '按目标克重计算纸浆浓度与抄纸参数'}
          </p>
          {adjustmentNotes && (
            <p className="text-xs text-ochre-red mt-1 bg-ochre-red/5 inline-block px-2 py-0.5 rounded">
              💡 改进建议：{adjustmentNotes}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          {originalFormula && hasDiffFromOriginal && (
            <button
              className="btn-outline flex items-center gap-2"
              onClick={handleResetToOriginal}
            >
              <RotateCcw size={18} />
              还原配方
            </button>
          )}
          <button
            className={`btn-outline flex items-center gap-2 ${showReverse ? 'bg-ochre-red/10 text-ochre-red' : ''}`}
            onClick={() => setShowReverse(!showReverse)}
          >
            <ArrowLeftRight size={18} />
            反推计算
          </button>
          <button
            className="btn-outline flex items-center gap-2"
            onClick={goToThickness}
            disabled={!calculationResult || !percentageValidation.isValid}
          >
            <RulerIcon size={18} />
            去做厚薄检测
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleSaveClick}
            disabled={!calculationResult || !percentageValidation.isValid}
          >
            <Save size={18} />
            保存方案
          </button>
        </div>
      </div>

      {showSaveModal && (
        <Card title="保存方式">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              className={`p-6 rounded-lg border-2 transition-all text-left ${
                !currentMixture
                  ? 'opacity-50 cursor-not-allowed border-gray-200'
                  : 'border-gilt-gold/30 hover:border-ochre-red/50 hover:bg-ochre-red/5'
              }`}
              onClick={handleSaveOverwrite}
              disabled={!currentMixture}
            >
              <div className="flex items-center gap-3 mb-2">
                <Save size={20} className="text-ochre-red" />
                <span className="font-bold text-ink-black">覆盖当前方案</span>
              </div>
              <p className="text-sm text-ash-gray">
                {currentMixture
                  ? sourceFormulaId
                    ? `同步更新配方库「${sourceFormulaName}」和配比方案`
                    : `更新配比方案「${currentMixture.name}」`
                  : '请先加载或创建一个配比方案'}
              </p>
            </button>

            <button
              className="p-6 rounded-lg border-2 border-gilt-gold/30 hover:border-bamboo-green/50 hover:bg-bamboo-green/5 transition-all text-left"
              onClick={handleSaveNewOnly}
            >
              <div className="flex items-center gap-3 mb-2">
                <Copy size={20} className="text-bamboo-green" />
                <span className="font-bold text-ink-black">仅另存配比</span>
              </div>
              <p className="text-sm text-ash-gray">
                保留原方案不变，仅新增一个配比方案，配方库不会有变化
              </p>
            </button>

            <button
              className="p-6 rounded-lg border-2 border-gilt-gold/30 hover:border-gilt-gold/60 hover:bg-gilt-gold/10 transition-all text-left sm:col-span-2"
              onClick={handleSaveNewWithFormula}
            >
              <div className="flex items-center gap-3 mb-2">
                <BookOpen size={20} className="text-gilt-gold" />
                <span className="font-bold text-ink-black">另存为 + 生成新配方</span>
              </div>
              <p className="text-sm text-ash-gray">
                同时生成一份新的配比方案和一个新的配方库条目，后续可直接从配方库加载使用
              </p>
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-outline" onClick={() => setShowSaveModal(false)}>取消</button>
          </div>
        </Card>
      )}

      {showReverse && (
        <Card title="反推计算 - 按目标纸性反推参数">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label-text">目标强度指数 (0-100)</label>
              <input
                type="range"
                min="30"
                max="100"
                className="w-full"
                value={targetStrength}
                onChange={(e) => setTargetStrength(Number(e.target.value))}
              />
              <div className="text-right font-bold text-ochre-red">{targetStrength}</div>
            </div>
            <div>
              <label className="label-text">目标匀度指数 (0-100)</label>
              <input
                type="range"
                min="30"
                max="100"
                className="w-full"
                value={targetEvenness}
                onChange={(e) => setTargetEvenness(Number(e.target.value))}
              />
              <div className="text-right font-bold text-ochre-red">{targetEvenness}</div>
            </div>
            <div className="col-span-2 flex justify-end">
              <button className="btn-secondary" onClick={handleReverseCalculate}>
                开始反推
              </button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="目标纸张参数" subtitle="设置期望的成品纸张规格">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="label-text">方案名称</label>
                <input
                  type="text"
                  className="input-field"
                  value={mixtureName}
                  onChange={(e) => setMixtureName(e.target.value)}
                  placeholder="为该配比方案命名"
                />
              </div>
              <div>
                <label className="label-text">目标克重 (g/m²)</label>
                <input
                  type="number"
                  className="input-field"
                  value={targetGrammage}
                  onChange={(e) => setTargetGrammage(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label-text">目标厚度 (μm)</label>
                <input
                  type="number"
                  className="input-field"
                  value={targetThickness}
                  onChange={(e) => setTargetThickness(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="label-text">幅面尺寸 (mm)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="input-field flex-1"
                    value={targetWidth}
                    onChange={(e) => setTargetWidth(Number(e.target.value))}
                    placeholder="宽"
                  />
                  <span className="flex items-center text-ash-gray">×</span>
                  <input
                    type="number"
                    className="input-field flex-1"
                    value={targetHeight}
                    onChange={(e) => setTargetHeight(Number(e.target.value))}
                    placeholder="高"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card title="纤维配比" subtitle="设置各纤维原料的比例和打浆度">
            <div className="space-y-4">
              {fiberComponents.map((fc, index) => (
                <div key={index} className="p-4 bg-xuan-paper/50 rounded-lg border border-gilt-gold/20">
                  <div className="grid grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="label-text">纤维原料</label>
                      <select
                        className="input-field"
                        value={fc.materialId}
                        onChange={(e) => updateFiberComponent(index, { materialId: e.target.value })}
                      >
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label-text">配比比例 (%)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={fc.percentage}
                        onChange={(e) => updateFiberComponent(index, { percentage: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="label-text">打浆度 (°SR)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={fc.beatingDegree}
                        onChange={(e) => updateFiberComponent(index, { beatingDegree: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex gap-2">
                      {fiberComponents.length > 1 && (
                        <button
                          className="btn-outline px-3"
                          onClick={() => removeFiberComponent(index)}
                        >
                          删除
                        </button>
                      )}
                      {index === fiberComponents.length - 1 && fiberComponents.length < materials.length && (
                        <button
                          className="btn-secondary px-3"
                          onClick={addFiberComponent}
                        >
                          添加
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between">
                <span className="text-ash-gray">
                  配比总和：
                  <span className={`font-bold ml-2 ${Math.abs(totalPercentage - 100) > 0.1 ? 'text-vermilion' : 'text-bamboo-green'}`}>
                    {totalPercentage.toFixed(1)}%
                  </span>
                </span>
              </div>

              {!percentageValidation.isValid && (
                <Alert level="warning" message={percentageValidation.message} suggestion={percentageValidation.suggestion} />
              )}
            </div>
          </Card>

          <Card title="纸药配置" subtitle="选择纸药种类并设置用量">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="label-text">纸药种类</label>
                <select
                  className="input-field"
                  value={selectedChemical}
                  onChange={(e) => setSelectedChemical(e.target.value)}
                >
                  {paperChemicals.map(pc => (
                    <option key={pc.id} value={pc.id}>{pc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">纸药用量 (%)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    className="flex-1"
                    value={chemicalDosage}
                    onChange={(e) => setChemicalDosage(Number(e.target.value))}
                  />
                  <span className="w-16 text-right font-bold text-ochre-red">{chemicalDosage}%</span>
                </div>
              </div>
            </div>

            {!chemicalValidation.isValid && (
              <div className="mt-4">
                <Alert level="warning" message={chemicalValidation.message} suggestion={chemicalValidation.suggestion} />
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {originalFormula && originalCalcResult && (
            <Card title="原配方 vs 试算对比" subtitle="实时对比调整前后的关键参数">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2 pb-2 border-b border-gilt-gold/20 font-medium text-ash-gray">
                  <span>参数</span>
                  <span className="text-center">原配方</span>
                  <span className="text-center">试算</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">克重</span>
                  <span className="text-center">{originalFormula.targetGrammage}</span>
                  <span className="text-center font-bold">{targetGrammage}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">厚度</span>
                  <span className="text-center">{originalFormula.targetThickness}</span>
                  <span className="text-center font-bold">{targetThickness}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">幅面</span>
                  <span className="text-center">{originalFormula.targetWidth}×{originalFormula.targetHeight}</span>
                  <span className="text-center font-bold">{targetWidth}×{targetHeight}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">纸药</span>
                  <span className="text-center">{originalFormula.paperChemicalDosage}%</span>
                  <span className="text-center font-bold">{chemicalDosage}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gilt-gold/20">
                  <span className="text-ash-gray">浓度</span>
                  <span className="text-center">{originalCalcResult.pulpConcentration}%</span>
                  <span className="text-center font-bold">
                    {calculationResult?.pulpConcentration ?? '-'}%
                    {diffValue(originalCalcResult.pulpConcentration, calculationResult?.pulpConcentration) && (
                      <span className="ml-1 text-xs text-ochre-red">{diffValue(originalCalcResult.pulpConcentration, calculationResult?.pulpConcentration)}</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">荡料次数</span>
                  <span className="text-center">{originalCalcResult.swingTimes}</span>
                  <span className="text-center font-bold text-ochre-red">
                    {calculationResult?.swingTimes ?? '-'}
                    {diffValue(originalCalcResult.swingTimes, calculationResult?.swingTimes) && (
                      <span className="ml-1 text-xs">{diffValue(originalCalcResult.swingTimes, calculationResult?.swingTimes)}</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">绝干浆</span>
                  <span className="text-center">{originalCalcResult.absoluteDryPulp}g</span>
                  <span className="text-center font-bold">
                    {calculationResult?.absoluteDryPulp ?? '-'}g
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">强度</span>
                  <span className="text-center">{originalCalcResult.expectedStrength}</span>
                  <span className="text-center font-bold text-bamboo-green">
                    {calculationResult?.expectedStrength ?? '-'}
                    {diffValue(originalCalcResult.expectedStrength, calculationResult?.expectedStrength) && (
                      <span className="ml-1 text-xs">{diffValue(originalCalcResult.expectedStrength, calculationResult?.expectedStrength)}</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">匀度</span>
                  <span className="text-center">{originalCalcResult.expectedEvenness}</span>
                  <span className="text-center font-bold text-bamboo-green">
                    {calculationResult?.expectedEvenness ?? '-'}
                    {diffValue(originalCalcResult.expectedEvenness, calculationResult?.expectedEvenness) && (
                      <span className="ml-1 text-xs">{diffValue(originalCalcResult.expectedEvenness, calculationResult?.expectedEvenness)}</span>
                    )}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-ash-gray">收缩率</span>
                  <span className="text-center">{originalCalcResult.estimatedShrinkage}%</span>
                  <span className="text-center font-bold">
                    {calculationResult?.estimatedShrinkage ?? '-'}%
                  </span>
                </div>
                {originalFormula.fiberComponents.map((origFc, i) => {
                  const currFc = fiberComponents[i];
                  return (
                    <div key={i} className="grid grid-cols-3 gap-2 pt-2 border-t border-gilt-gold/10">
                      <span className="text-ash-gray">{origFc.materialName}</span>
                      <span className="text-center">{origFc.percentage}% / {origFc.beatingDegree}°</span>
                      <span className="text-center font-bold">
                        {currFc ? `${currFc.percentage}% / ${currFc.beatingDegree}°` : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card title="配比比例">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name} ${value}%`}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {calculationResult && (
            <>
              <Card title="试算结果">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">纸浆浓度</span>
                    <span className="value-display">
                      <NumberRoll value={calculationResult.pulpConcentration} decimals={3} suffix="%" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">绝干浆用量</span>
                    <span className="value-display">
                      <NumberRoll value={calculationResult.absoluteDryPulp} decimals={2} suffix="g" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">荡料次数</span>
                    <span className="value-display text-ochre-red">
                      <NumberRoll value={calculationResult.swingTimes} suffix="次" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-xuan-paper/50 rounded-lg">
                    <span className="text-ash-gray">预计收缩率</span>
                    <span className="value-display">
                      <NumberRoll value={calculationResult.estimatedShrinkage} decimals={1} suffix="%" />
                    </span>
                  </div>
                </div>

                {calculationResult.warnings.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {calculationResult.warnings.map((warning, i) => (
                      <Alert key={i} level="warning" message={warning} />
                    ))}
                  </div>
                )}
              </Card>

              <Card title="成纸性能预测" subtitle="基于纤维参数的模拟分析">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#8B8680" strokeOpacity={0.3} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#2C2416', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#8B8680', fontSize: 10 }} />
                      <Radar
                        name="性能"
                        dataKey="A"
                        stroke="#A85537"
                        fill="#A85537"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-ash-gray">预期强度</div>
                    <div className="text-2xl font-bold text-ochre-red">{calculationResult.expectedStrength}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-ash-gray">预期匀度</div>
                    <div className="text-2xl font-bold text-bamboo-green">{calculationResult.expectedEvenness}</div>
                  </div>
                </div>
              </Card>
            </>
          )}

          {!calculationResult && (
            <Card>
              <div className="text-center py-12 text-ash-gray">
                <Calculator size={48} className="mx-auto mb-4 opacity-30" />
                <p>设置参数后实时计算</p>
                <p className="text-sm mt-1">配比总和=100%时自动显示结果</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
