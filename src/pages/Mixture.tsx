import { useState, useEffect, useMemo } from 'react';
import { Calculator, ArrowLeftRight, Save } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import NumberRoll from '@/components/NumberRoll';
import { calculateMixture, reverseCalculateMixture } from '@/utils/calculations';
import { validateFiberPercentage, validatePaperChemical } from '@/utils/validation';
import type { FiberComponent, CalculationResult } from '@/types';

const COLORS = ['#A85537', '#6B8E6B', '#C9A961', '#8B8680', '#2C2416'];

export default function Mixture() {
  const { materials, paperChemicals, addMixture, currentMixture, setCurrentMixture } = useAppStore();
  
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
    const fiberLengthMap: Record<string, number> = {};
    materials.forEach(m => { fiberLengthMap[m.id] = m.fiberLength; });
    const result = calculateMixture(
      currentMixture.fiberComponents,
      currentMixture.targetGrammage,
      currentMixture.targetThickness,
      currentMixture.targetWidth,
      currentMixture.targetHeight,
      currentMixture.paperChemicalDosage,
      fiberLengthMap
    );
    setCalculationResult(result);
  }, [currentMixture, materials]);

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

  const handleCalculate = () => {
    if (!percentageValidation.isValid) return;
    
    const fiberLengthMap: Record<string, number> = {};
    materials.forEach(m => { fiberLengthMap[m.id] = m.fiberLength; });

    const result = calculateMixture(
      fiberComponents,
      targetGrammage,
      targetThickness,
      targetWidth,
      targetHeight,
      chemicalDosage,
      fiberLengthMap
    );
    setCalculationResult(result);
  };

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

  const handleSave = () => {
    if (!calculationResult || !percentageValidation.isValid) return;
    
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
    });
    
    setAlertState({
      show: true,
      level: 'success',
      message: '配比方案已保存',
      suggestion: '可在工艺档案中查看历史记录'
    });
    setTimeout(() => setAlertState(null), 3000);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif-cn text-ink-black">纸浆配比</h2>
          <p className="text-ash-gray mt-1">按目标克重计算纸浆浓度与抄纸参数</p>
        </div>
        <div className="flex gap-3">
          <button
            className={`btn-outline flex items-center gap-2 ${showReverse ? 'bg-ochre-red/10 text-ochre-red' : ''}`}
            onClick={() => setShowReverse(!showReverse)}
          >
            <ArrowLeftRight size={18} />
            反推计算
          </button>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleSave}
            disabled={!calculationResult}
          >
            <Save size={18} />
            保存方案
          </button>
        </div>
      </div>

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

          <div className="flex justify-center">
            <button
              className="btn-primary text-lg px-8 py-3 flex items-center gap-2"
              onClick={handleCalculate}
              disabled={!percentageValidation.isValid}
            >
              <Calculator size={24} />
              计算配比参数
            </button>
          </div>
        </div>

        <div className="space-y-6">
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
              <Card title="计算结果">
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
                <p>设置参数后点击计算</p>
                <p className="text-sm mt-1">查看配比结果和性能预测</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
