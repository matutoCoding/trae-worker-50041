import { useState } from 'react';
import { Plus, Edit2, Trash2, Leaf, Droplets, Scissors } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import type { FiberType, PaperChemicalType } from '@/types';
import { validateBeatingDegree, validatePaperChemical } from '@/utils/validation';

const fiberTypeLabels: Record<FiberType, string> = {
  bark: '树皮',
  straw: '稻草',
  cotton: '棉',
  bamboo: '竹',
  hemp: '麻',
  other: '其他',
};

const chemicalTypeLabels: Record<PaperChemicalType, string> = {
  mucilage: '粘液质',
  fixative: '固着剂',
  softener: '柔软剂',
  other: '其他',
};

export default function Materials() {
  const { materials, paperChemicals, addMaterial, updateMaterial, deleteMaterial, addPaperChemical, updatePaperChemical, deletePaperChemical, addBeatingRecord } = useAppStore();
  const [activeTab, setActiveTab] = useState<'fibers' | 'chemicals'>('fibers');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [chemicalTab, setChemicalTab] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'bark' as FiberType,
    fiberLength: 2,
    fiberWidth: 15,
    origin: '',
    description: '',
    beatingDegree: 40,
    beatingTime: 120,
  });

  const [chemicalForm, setChemicalForm] = useState({
    name: '',
    type: 'mucilage' as PaperChemicalType,
    dosageRatio: 0.8,
    suspensionEffect: 80,
    description: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'bark',
      fiberLength: 2,
      fiberWidth: 15,
      origin: '',
      description: '',
      beatingDegree: 40,
      beatingTime: 120,
    });
    setChemicalForm({
      name: '',
      type: 'mucilage',
      dosageRatio: 0.8,
      suspensionEffect: 80,
      description: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleSubmit = () => {
    if (chemicalTab) {
      if (editingId) {
        updatePaperChemical(editingId, chemicalForm);
      } else {
        addPaperChemical(chemicalForm);
      }
    } else {
      if (editingId) {
        updateMaterial(editingId, formData);
        if (formData.beatingDegree > 0) {
          addBeatingRecord({
            materialId: editingId,
            beatingDegree: formData.beatingDegree,
            beatingTime: formData.beatingTime,
            notes: `打浆度 ${formData.beatingDegree}°SR`,
          });
        }
      } else {
        addMaterial(formData);
      }
    }
    resetForm();
  };

  const handleEdit = (item: any, isChemical: boolean) => {
    if (isChemical) {
      setChemicalForm(item);
      setChemicalTab(true);
    } else {
      setFormData(item);
      setChemicalTab(false);
    }
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const beatingValidation = validateBeatingDegree(formData.beatingDegree, formData.type);
  const chemicalValidation = validatePaperChemical(chemicalForm.dosageRatio, 0.5, 2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-serif-cn text-ink-black">原料录入</h2>
          <p className="text-ash-gray mt-1">管理纤维原料、打浆度和纸药参数</p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={18} />
          新增原料
        </button>
      </div>

      <div className="flex gap-4 border-b border-gilt-gold/20">
        <button
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'fibers'
              ? 'text-ochre-red border-b-2 border-ochre-red'
              : 'text-ash-gray hover:text-ink-black'
          }`}
          onClick={() => setActiveTab('fibers')}
        >
          <span className="flex items-center gap-2">
            <Leaf size={18} />
            纤维原料
          </span>
        </button>
        <button
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'chemicals'
              ? 'text-ochre-red border-b-2 border-ochre-red'
              : 'text-ash-gray hover:text-ink-black'
          }`}
          onClick={() => setActiveTab('chemicals')}
        >
          <span className="flex items-center gap-2">
            <Droplets size={18} />
            纸药管理
          </span>
        </button>
      </div>

      {showAddForm && (
        <Card title={editingId ? '编辑原料' : '新增原料'}>
          <div className="space-y-6">
            <div className="flex gap-4 mb-4">
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  !chemicalTab
                    ? 'bg-ochre-red/10 text-ochre-red font-medium'
                    : 'text-ash-gray hover:bg-ink-black/5'
                }`}
                onClick={() => setChemicalTab(false)}
              >
                纤维原料
              </button>
              <button
                className={`px-4 py-2 rounded-md transition-colors ${
                  chemicalTab
                    ? 'bg-ochre-red/10 text-ochre-red font-medium'
                    : 'text-ash-gray hover:bg-ink-black/5'
                }`}
                onClick={() => setChemicalTab(true)}
              >
                纸药
              </button>
            </div>

            {!chemicalTab ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label-text">原料名称</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="如：青檀树皮"
                  />
                </div>
                <div>
                  <label className="label-text">纤维类型</label>
                  <select
                    className="input-field"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as FiberType })}
                  >
                    {Object.entries(fiberTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">纤维长度 (mm)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    value={formData.fiberLength}
                    onChange={(e) => setFormData({ ...formData, fiberLength: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label-text">纤维宽度 (μm)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.fiberWidth}
                    onChange={(e) => setFormData({ ...formData, fiberWidth: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label-text">产地</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="如：安徽泾县"
                  />
                </div>
                <div>
                  <label className="label-text flex items-center gap-2">
                    <Scissors size={16} className="text-ochre-red" />
                    打浆度 (°SR)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="80"
                      className="flex-1"
                      value={formData.beatingDegree}
                      onChange={(e) => setFormData({ ...formData, beatingDegree: Number(e.target.value) })}
                    />
                    <span className="w-16 text-right font-bold">{formData.beatingDegree}°</span>
                  </div>
                </div>
                <div>
                  <label className="label-text">打浆时间 (分钟)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={formData.beatingTime}
                    onChange={(e) => setFormData({ ...formData, beatingTime: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label-text">特性描述</label>
                  <textarea
                    className="input-field min-h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="描述该原料的特性和成纸影响..."
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="label-text">纸药名称</label>
                  <input
                    type="text"
                    className="input-field"
                    value={chemicalForm.name}
                    onChange={(e) => setChemicalForm({ ...chemicalForm, name: e.target.value })}
                    placeholder="如：杨桃藤汁"
                  />
                </div>
                <div>
                  <label className="label-text">纸药类型</label>
                  <select
                    className="input-field"
                    value={chemicalForm.type}
                    onChange={(e) => setChemicalForm({ ...chemicalForm, type: e.target.value as PaperChemicalType })}
                  >
                    {Object.entries(chemicalTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">推荐用量比例 (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-field"
                    value={chemicalForm.dosageRatio}
                    onChange={(e) => setChemicalForm({ ...chemicalForm, dosageRatio: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="label-text">悬浮效果 (0-100)</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="flex-1"
                      value={chemicalForm.suspensionEffect}
                      onChange={(e) => setChemicalForm({ ...chemicalForm, suspensionEffect: Number(e.target.value) })}
                    />
                    <span className="w-12 text-right font-bold">{chemicalForm.suspensionEffect}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="label-text">说明</label>
                  <textarea
                    className="input-field min-h-[80px]"
                    value={chemicalForm.description}
                    onChange={(e) => setChemicalForm({ ...chemicalForm, description: e.target.value })}
                    placeholder="描述该纸药的特性和使用注意事项..."
                  />
                </div>
              </div>
            )}

            {!chemicalTab && !beatingValidation.isValid && (
              <Alert level="warning" message={beatingValidation.message} suggestion={beatingValidation.suggestion} />
            )}

            {chemicalTab && !chemicalValidation.isValid && (
              <Alert level="warning" message={chemicalValidation.message} suggestion={chemicalValidation.suggestion} />
            )}

            <div className="flex justify-end gap-3">
              <button className="btn-outline" onClick={resetForm}>
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!formData.name && !chemicalForm.name}
              >
                {editingId ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'fibers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {materials.map((material) => (
            <Card key={material.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-bamboo-green/20 flex items-center justify-center flex-shrink-0">
                    <Leaf className="text-bamboo-green" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold font-serif-cn text-lg text-ink-black">{material.name}</h4>
                    <p className="text-sm text-ochre-red">{fiberTypeLabels[material.type]} · {material.origin}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-ash-gray">纤维长度：</span>
                        <span className="font-medium">{material.fiberLength} mm</span>
                      </div>
                      <div>
                        <span className="text-ash-gray">纤维宽度：</span>
                        <span className="font-medium">{material.fiberWidth} μm</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-ash-gray line-clamp-2">{material.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-2 text-ash-gray hover:text-ochre-red transition-colors"
                    onClick={() => handleEdit(material, false)}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="p-2 text-ash-gray hover:text-vermilion transition-colors"
                    onClick={() => deleteMaterial(material.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'chemicals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {paperChemicals.map((chemical) => (
            <Card key={chemical.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-ochre-red/20 flex items-center justify-center flex-shrink-0">
                    <Droplets className="text-ochre-red" size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold font-serif-cn text-lg text-ink-black">{chemical.name}</h4>
                    <p className="text-sm text-ochre-red">{chemicalTypeLabels[chemical.type]}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-ash-gray">推荐用量：</span>
                        <span className="font-medium">{chemical.dosageRatio}%</span>
                      </div>
                      <div>
                        <span className="text-ash-gray">悬浮效果：</span>
                        <span className="font-medium">{chemical.suspensionEffect}/100</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-ash-gray/20 rounded-full h-2">
                        <div
                          className="bg-bamboo-green h-2 rounded-full transition-all"
                          style={{ width: `${chemical.suspensionEffect}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-ash-gray line-clamp-2">{chemical.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="p-2 text-ash-gray hover:text-ochre-red transition-colors"
                    onClick={() => handleEdit(chemical, true)}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="p-2 text-ash-gray hover:text-vermilion transition-colors"
                    onClick={() => deletePaperChemical(chemical.id)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
