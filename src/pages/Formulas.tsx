import { useState, useMemo } from 'react';
import { BookOpen, Star, Plus, Trash2, Download, GitCompare, Heart, HeartOff, Search, X, AlertTriangle, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import type { Formula } from '@/types';

export default function Formulas() {
  const { formulas, mixtures, currentMixture, addFormula, updateFormula, deleteFormula, toggleFavorite, loadFormula, setCurrentMixture } = useAppStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorite, setFilterFavorite] = useState(false);
  
  const [newFormula, setNewFormula] = useState({
    name: '',
    paperType: '书画纸',
    description: '',
  });
  const [alertState, setAlertState] = useState<{ show: boolean; level: 'info' | 'success' | 'warning' | 'danger'; message: string; suggestion?: string } | null>(null);

  const filteredFormulas = useMemo(() => {
    return formulas.filter(f => {
      const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.paperType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFavorite = !filterFavorite || f.isFavorite;
      return matchesSearch && matchesFavorite;
    }).sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [formulas, searchQuery, filterFavorite]);

  const compareFormulas = useMemo(() => {
    return formulas.filter(f => selectedForCompare.includes(f.id));
  }, [formulas, selectedForCompare]);

  const handleCreateFromCurrent = () => {
    if (!currentMixture && mixtures.length === 0) {
      alert('请先在配比页创建配比方案');
      return;
    }

    const mixture = currentMixture || mixtures[mixtures.length - 1];
    if (!mixture) return;

    setNewFormula({
      name: mixture.name + ' 配方',
      paperType: '书画纸',
      description: `基于配比方案 ${mixture.name} 创建`,
    });
    setShowAddForm(true);
  };

  const handleSaveFormula = () => {
    if (!newFormula.name.trim()) {
      alert('请输入配方名称');
      return;
    }

    const mixture = currentMixture || mixtures[mixtures.length - 1];
    if (!mixture) return;

    addFormula({
      name: newFormula.name,
      paperType: newFormula.paperType,
      description: newFormula.description,
      mixtureParams: {
        name: mixture.name,
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
      sheetParams: {
        pressPressure: 25,
        dryingTemp: 45,
      },
      riskWarnings: [],
      isFavorite: false,
    });

    setNewFormula({ name: '', paperType: '书画纸', description: '' });
    setShowAddForm(false);
    
    setAlertState({
      show: true,
      level: 'success',
      message: '配方已保存到配方库',
      suggestion: '可以在需要时一键加载使用'
    });
    setTimeout(() => setAlertState(null), 3000);
  };

  const handleLoadFormula = (formula: Formula) => {
    const mixture = loadFormula(formula.id);
    if (mixture) {
      setCurrentMixture(mixture);
      setAlertState({
        show: true,
        level: 'success',
        message: `已加载配方：${formula.name}`,
        suggestion: '可在配比页查看和调整参数'
      });
      setTimeout(() => setAlertState(null), 3000);
    }
  };

  const toggleCompare = (id: string) => {
    setSelectedForCompare(prev => 
      prev.includes(id) 
        ? prev.filter(f => f !== id)
        : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  const paperTypes = ['书画纸', '古籍修复纸', '包装纸', '文房用纸', '特种纸', '其他'];

  return (
    <div className="space-y-6">
      {alertState && alertState.show && (
        <Alert level={alertState.level} message={alertState.message} suggestion={alertState.suggestion} />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif-cn text-ink-black">配方库</h2>
          <p className="text-ash-gray mt-1">保存和管理不同纸品的抄造方案</p>
        </div>
        <div className="flex gap-3">
          {selectedForCompare.length >= 2 && (
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => setShowCompare(true)}
            >
              <GitCompare size={18} />
              对比 ({selectedForCompare.length})
            </button>
          )}
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleCreateFromCurrent}
          >
            <Plus size={18} />
            保存当前配比为配方
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash-gray" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="搜索配方名称、类型..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className={`btn-outline flex items-center gap-2 ${filterFavorite ? 'bg-gilt-gold/10 text-gilt-gold border-gilt-gold/50' : ''}`}
            onClick={() => setFilterFavorite(!filterFavorite)}
          >
            <Star size={18} className={filterFavorite ? 'fill-gilt-gold' : ''} />
            {filterFavorite ? '显示全部' : '仅显示收藏'}
          </button>
        </div>
      </Card>

      {showAddForm && (
        <Card title="新建配方">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="label-text">配方名称</label>
              <input
                type="text"
                className="input-field"
                value={newFormula.name}
                onChange={(e) => setNewFormula({ ...newFormula, name: e.target.value })}
                placeholder="如：净皮宣标准配方"
              />
            </div>
            <div>
              <label className="label-text">纸张类型</label>
              <select
                className="input-field"
                value={newFormula.paperType}
                onChange={(e) => setNewFormula({ ...newFormula, paperType: e.target.value })}
              >
                {paperTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label-text">配方描述</label>
              <textarea
                className="input-field min-h-[80px]"
                value={newFormula.description}
                onChange={(e) => setNewFormula({ ...newFormula, description: e.target.value })}
                placeholder="描述该配方的特点、适用场景、注意事项..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button className="btn-outline" onClick={() => setShowAddForm(false)}>
              取消
            </button>
            <button className="btn-primary" onClick={handleSaveFormula}>
              保存配方
            </button>
          </div>
        </Card>
      )}

      {showCompare && compareFormulas.length >= 2 && (
        <Card title="配方对比">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gilt-gold/20">
                  <th className="text-left py-3 px-4 text-ash-gray font-medium">参数</th>
                  {compareFormulas.map(f => (
                    <th key={f.id} className="text-center py-3 px-4 font-bold font-serif-cn text-ink-black">
                      {f.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gilt-gold/10">
                  <td className="py-3 px-4 text-ash-gray">纸张类型</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4">{f.paperType}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/10">
                  <td className="py-3 px-4 text-ash-gray">目标克重</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4 font-bold">
                      {f.mixtureParams.targetGrammage} g/m²
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/10">
                  <td className="py-3 px-4 text-ash-gray">目标厚度</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4 font-bold">
                      {f.mixtureParams.targetThickness} μm
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/10">
                  <td className="py-3 px-4 text-ash-gray">纸浆浓度</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4 font-bold text-ochre-red">
                      {f.mixtureParams.pulpConcentration}%
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/10">
                  <td className="py-3 px-4 text-ash-gray">荡料次数</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4 font-bold">
                      {f.mixtureParams.swingTimes}次
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/10">
                  <td className="py-3 px-4 text-ash-gray">纤维组分</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4">
                      {f.mixtureParams.fiberComponents.map(fc => (
                        <div key={fc.materialId}>{fc.materialName} {fc.percentage}%</div>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-3 px-4 text-ash-gray">更新时间</td>
                  {compareFormulas.map(f => (
                    <td key={f.id} className="text-center py-3 px-4">
                      {formatDate(f.updatedAt)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="btn-outline flex items-center gap-2" onClick={() => {
              setShowCompare(false);
              setSelectedForCompare([]);
            }}>
              <X size={18} />
              关闭对比
            </button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFormulas.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <div className="text-center py-12 text-ash-gray">
                <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                <p>暂无配方</p>
                <p className="text-sm mt-1">点击上方按钮保存配比为配方</p>
              </div>
            </Card>
          </div>
        ) : (
          filteredFormulas.map((formula) => (
            <Card key={formula.id} className="relative group">
              <div className="absolute top-4 right-4 flex gap-1">
                <button
                  className="p-1.5 text-ash-gray hover:text-gilt-gold transition-colors"
                  onClick={() => toggleFavorite(formula.id)}
                >
                  {formula.isFavorite ? (
                    <Star size={18} className="fill-gilt-gold text-gilt-gold" />
                  ) : (
                    <Star size={18} />
                  )}
                </button>
              </div>

              <div
                className={`absolute top-4 left-4 p-1.5 rounded cursor-pointer transition-colors ${
                  selectedForCompare.includes(formula.id)
                    ? 'bg-ochre-red/20 text-ochre-red'
                    : 'text-ash-gray hover:text-ochre-red opacity-0 group-hover:opacity-100'
                }`}
                onClick={() => toggleCompare(formula.id)}
                title={selectedForCompare.includes(formula.id) ? '取消选择' : '添加对比'}
              >
                <GitCompare size={18} />
              </div>

              <div className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-bamboo-green/10 text-bamboo-green text-xs rounded-full">
                    {formula.paperType}
                  </span>
                  {formula.isFavorite && (
                    <span className="px-2 py-0.5 bg-gilt-gold/10 text-gilt-gold text-xs rounded-full">
                      已收藏
                    </span>
                  )}
                </div>
                <h4 className="font-bold font-serif-cn text-xl text-ink-black mb-2">
                  {formula.name}
                </h4>
                <p className="text-sm text-ash-gray line-clamp-2 mb-4">
                  {formula.description}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-ash-gray">克重</span>
                    <div className="font-bold">{formula.mixtureParams.targetGrammage} g/m²</div>
                  </div>
                  <div>
                    <span className="text-ash-gray">厚度</span>
                    <div className="font-bold">{formula.mixtureParams.targetThickness} μm</div>
                  </div>
                  <div>
                    <span className="text-ash-gray">浓度</span>
                    <div className="font-bold text-ochre-red">{formula.mixtureParams.pulpConcentration}%</div>
                  </div>
                  <div>
                    <span className="text-ash-gray">荡料</span>
                    <div className="font-bold">{formula.mixtureParams.swingTimes}次</div>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-xs text-ash-gray">纤维配比</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {formula.mixtureParams.fiberComponents.map((fc, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-ink-black/5 text-ink-black text-xs rounded-full"
                      >
                        {fc.materialName} {fc.percentage}%
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-ash-gray mb-4">
                  更新于 {formatDate(formula.updatedAt)}
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                    onClick={() => handleLoadFormula(formula)}
                  >
                    <Download size={16} />
                    加载使用
                  </button>
                  <button
                    className="btn-outline px-3 text-sm"
                    onClick={() => {
                      if (confirm('确定删除该配方吗？')) {
                        deleteFormula(formula.id);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card title="风险预警规则配置" subtitle="配置纸浆絮聚、揭纸破损等风险的预警阈值">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-xuan-paper/50 rounded-lg border border-gilt-gold/20">
            <h5 className="font-bold text-ink-black mb-3 flex items-center gap-2">
              <AlertCircle className="text-vermilion" size={18} />
              厚度偏差预警
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">轻微偏差阈值</span>
                <span className="font-bold text-amber-500">5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">严重偏差阈值</span>
                <span className="font-bold text-vermilion">10%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">偏差点位比例预警</span>
                <span className="font-bold text-ochre-red">30%</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-xuan-paper/50 rounded-lg border border-gilt-gold/20">
            <h5 className="font-bold text-ink-black mb-3 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              云絮检测预警
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">轻微云絮数量</span>
                <span className="font-bold text-amber-500">1-2个</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">中等云絮数量</span>
                <span className="font-bold text-ochre-red">3-5个</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">严重云絮数量</span>
                <span className="font-bold text-vermilion">≥6个</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-xuan-paper/50 rounded-lg border border-gilt-gold/20">
            <h5 className="font-bold text-ink-black mb-3 flex items-center gap-2">
              <AlertCircle className="text-vermilion" size={18} />
              揭纸破损风险
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">纸药用量阈值</span>
                <span className="font-bold text-ochre-red">1.8%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">打浆度阈值</span>
                <span className="font-bold text-ochre-red">55°SR</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">干燥温度阈值</span>
                <span className="font-bold text-ochre-red">55°C</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-xuan-paper/50 rounded-lg border border-gilt-gold/20">
            <h5 className="font-bold text-ink-black mb-3 flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              收缩率预警
            </h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">收缩率注意值</span>
                <span className="font-bold text-amber-500">12%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">收缩率危险值</span>
                <span className="font-bold text-vermilion">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ash-gray">开裂风险条件</span>
                <span className="font-bold text-ochre-red">高温+高压</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
