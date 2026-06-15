import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, FileText, ChevronDown, ChevronUp, GitCompare, Check, X, Gauge, Thermometer, AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import type { SheetRecord } from '@/types';

export default function Archives() {
  const { sheetRecords, mixtures, setCurrentMixture, addMixture } = useAppStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  const filteredRecords = useMemo(() => {
    return sheetRecords
      .filter(record => {
        const matchesSearch = record.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.notes.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const dangerCount = record.riskAlerts.filter(a => a.level === 'danger').length;
        const warningCount = record.riskAlerts.filter(a => a.level === 'warning').length;

        if (selectedType === 'normal') return dangerCount === 0 && warningCount === 0;
        if (selectedType === 'warning') return warningCount > 0 && dangerCount === 0;
        if (selectedType === 'danger') return dangerCount > 0;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sheetRecords, searchQuery, selectedType]);

  const compareRecords = useMemo(() => {
    return compareIds
      .map(id => sheetRecords.find(r => r.id === id))
      .filter((r): r is SheetRecord => !!r);
  }, [compareIds, sheetRecords]);

  const getMixtureName = (mixtureId: string) => {
    const mixture = mixtures.find(m => m.id === mixtureId);
    return mixture?.name || '未知配比';
  };

  const getFiberSummary = (mixtureId: string) => {
    const mixture = mixtures.find(m => m.id === mixtureId);
    if (!mixture) return '未知';
    return mixture.fiberComponents.map(fc => `${fc.materialName} ${fc.percentage}%`).join(', ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviationColor = (deviation: number) => {
    if (deviation > 10) return 'text-vermilion';
    if (deviation > 5) return 'text-amber-500';
    return 'text-bamboo-green';
  };

  const getAlertSummary = (record: SheetRecord) => {
    const dangerCount = record.riskAlerts.filter(a => a.level === 'danger').length;
    const warningCount = record.riskAlerts.filter(a => a.level === 'warning').length;
    return { dangerCount, warningCount };
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const clearCompare = () => {
    setCompareIds([]);
    setShowCompare(false);
  };

  const bestRecordId = useMemo(() => {
    if (compareRecords.length === 0) return null;
    return compareRecords.slice().sort((a, b) => {
      const scoreA = a.thicknessDeviation * 3 + a.cloudFlocPositions.length * 5 + a.riskAlerts.filter(r => r.level === 'danger').length * 20;
      const scoreB = b.thicknessDeviation * 3 + b.cloudFlocPositions.length * 5 + b.riskAlerts.filter(r => r.level === 'danger').length * 20;
      return scoreA - scoreB;
    })[0]?.id;
  }, [compareRecords]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-serif-cn text-ink-black">工艺档案</h2>
          <p className="text-ash-gray mt-1">记录每批纸的配比与抄造，建立工艺档案</p>
        </div>
        {compareIds.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ash-gray">
              已选 {compareIds.length}/3 批次
            </span>
            <button
              className={`btn-outline flex items-center gap-2 ${showCompare ? 'bg-ochre-red/10 text-ochre-red' : ''}`}
              onClick={() => setShowCompare(!showCompare)}
              disabled={compareIds.length < 2}
            >
              <GitCompare size={18} />
              批次复盘对比
            </button>
            <button
              className="btn-outline flex items-center gap-2 text-xs"
              onClick={clearCompare}
            >
              <X size={16} />
              清空
            </button>
          </div>
        )}
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash-gray" />
            <input
              type="text"
              className="input-field pl-10"
              placeholder="搜索批次号、备注..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <select
              className="input-field w-40"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">全部记录 ({sheetRecords.length})</option>
              <option value="normal">正常</option>
              <option value="warning">有预警</option>
              <option value="danger">有风险</option>
            </select>
          </div>
        </div>
      </Card>

      {showCompare && compareRecords.length >= 2 && (
        <Card title="📊 批次复盘对比" subtitle={`对比 ${compareRecords.length} 个批次的核心指标`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gilt-gold/30">
                  <th className="text-left py-3 px-2 text-ash-gray font-medium w-36">指标</th>
                  {compareRecords.map(r => {
                    const isBest = r.id === bestRecordId;
                    return (
                      <th key={r.id} className={`text-center py-3 px-2 font-serif-cn ${isBest ? 'text-bamboo-green' : 'text-ink-black'}`}>
                        <div className="flex items-center justify-center gap-2">
                          {isBest && <span>🏆</span>}
                          <span>批次 {r.batchNo}</span>
                        </div>
                        <div className="text-xs font-normal text-ash-gray mt-0.5">
                          {getMixtureName(r.mixtureId)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gilt-gold/15">
                  <td className="py-3 px-2 text-ash-gray">抄造时间</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-mono">{formatDate(r.createdAt)}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15 bg-xuan-paper/30">
                  <td className="py-3 px-2 text-ash-gray">厚度偏差率 ↓</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className={`py-3 px-2 text-center font-bold ${r.id === bestRecordId ? 'text-bamboo-green' : getDeviationColor(r.thicknessDeviation)}`}>
                      {r.thicknessDeviation.toFixed(2)}%
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15">
                  <td className="py-3 px-2 text-ash-gray">实际克重 (g/m²)</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.actualGrammage}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15 bg-xuan-paper/30">
                  <td className="py-3 px-2 text-ash-gray">实际厚度 (μm)</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.actualThickness}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15">
                  <td className="py-3 px-2 text-ash-gray">云絮数量 ↓</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className={`py-3 px-2 text-center font-bold ${r.cloudFlocPositions.length === 0 ? 'text-bamboo-green' : r.cloudFlocPositions.length > 2 ? 'text-vermilion' : 'text-ochre-red'}`}>
                      {r.cloudFlocPositions.length}
                      {r.cloudFlocPositions.length > 0 && (
                        <span className="ml-1 text-xs opacity-70">
                          ({r.cloudFlocPositions.map(f => f.severity === 'severe' ? '严重' : f.severity === 'moderate' ? '中' : '轻').join('、')})
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15 bg-xuan-paper/30">
                  <td className="py-3 px-2 text-ash-gray flex items-center gap-1"><Gauge size={14} />压榨压力 (kg)</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.pressPressure}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15">
                  <td className="py-3 px-2 text-ash-gray flex items-center gap-1"><Thermometer size={14} />晒纸温度 (°C)</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.dryingTemp}°</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15 bg-xuan-paper/30">
                  <td className="py-3 px-2 text-ash-gray">收缩率 ↓</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.shrinkageRate.toFixed(1)}%</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15">
                  <td className="py-3 px-2 text-ash-gray">平整度 ↑</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.smoothness}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15 bg-xuan-paper/30">
                  <td className="py-3 px-2 text-ash-gray">抗张强度 ↑</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.tensileStrength}</td>
                  ))}
                </tr>
                <tr className="border-b border-gilt-gold/15">
                  <td className="py-3 px-2 text-ash-gray">匀度 ↑</td>
                  {compareRecords.map(r => (
                    <td key={r.id} className="py-3 px-2 text-center font-bold">{r.evenness}</td>
                  ))}
                </tr>
                <tr className="bg-xuan-paper/30">
                  <td className="py-3 px-2 text-ash-gray flex items-center gap-1"><AlertTriangle size={14} />风险预警 ↓</td>
                  {compareRecords.map(r => {
                    const d = r.riskAlerts.filter(a => a.level === 'danger').length;
                    const w = r.riskAlerts.filter(a => a.level === 'warning').length;
                    return (
                      <td key={r.id} className="py-3 px-2 text-center font-bold">
                        {d === 0 && w === 0 && <span className="text-bamboo-green">无</span>}
                        {d > 0 && <span className="text-vermilion">{d} 风险</span>}
                        {d === 0 && w > 0 && <span className="text-amber-500">{w} 预警</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 pt-6 border-t border-gilt-gold/20">
            <h5 className="font-bold text-ink-black mb-4">云絮点位对比</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {compareRecords.map(r => (
                <div key={r.id} className="p-3 bg-xuan-paper/50 rounded-lg">
                  <div className="text-sm font-bold mb-2">批次 {r.batchNo}</div>
                  {r.cloudFlocPositions.length === 0 ? (
                    <div className="text-sm text-bamboo-green">✓ 无云絮</div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      {r.cloudFlocPositions.map((f, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-ash-gray">点位{i + 1}: ({f.x}, {f.y})</span>
                          <span className={`font-bold ${
                            f.severity === 'severe' ? 'text-vermilion' : f.severity === 'moderate' ? 'text-ochre-red' : 'text-gilt-gold'
                          }`}>
                            {f.severity === 'severe' ? '严重' : f.severity === 'moderate' ? '中等' : '轻微'} {f.size}px
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gilt-gold/20">
            <h5 className="font-bold text-ink-black mb-4">报告摘要对比</h5>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {compareRecords.map(r => (
                <div key={r.id} className="p-4 bg-xuan-paper/30 rounded-lg border border-gilt-gold/20">
                  <div className="text-sm font-bold mb-2 flex items-center gap-2">
                    批次 {r.batchNo} 检测报告
                    {r.id === bestRecordId && <span className="text-bamboo-green text-xs">🏆 最优</span>}
                  </div>
                  <div className="text-xs text-ink-black whitespace-pre-line font-mono leading-relaxed max-h-60 overflow-y-auto">
                    {r.reportSummary || '暂无报告摘要'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-6 text-sm text-ash-gray">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>共 {filteredRecords.length} 条记录</span>
        </div>
        {compareIds.length > 0 && !showCompare && (
          <div className="text-xs text-ochre-red">
            💡 已选 {compareIds.length} 条，至少选2条开启对比
          </div>
        )}
      </div>

      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-ash-gray">
              <FileText size={48} className="mx-auto mb-4 opacity-30" />
              <p>暂无工艺档案记录</p>
              <p className="text-sm mt-1">在抄纸厚薄页保存记录后将显示在这里</p>
            </div>
          </Card>
        ) : (
          filteredRecords.map((record) => {
            const alerts = getAlertSummary(record);
            const isExpanded = expandedId === record.id;
            const isInCompare = compareIds.includes(record.id);

            return (
              <Card key={record.id}>
                <div
                  className="flex items-start justify-between gap-3"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => toggleExpand(record.id)}
                  >
                    <div className="flex items-center gap-4 mb-2 flex-wrap">
                      <h4 className="font-bold font-serif-cn text-lg text-ink-black">
                        批次 {record.batchNo}
                      </h4>
                      <span className="text-sm text-ash-gray">
                        {getMixtureName(record.mixtureId)}
                      </span>
                      {alerts.dangerCount > 0 && (
                        <span className="px-2 py-0.5 bg-vermilion/10 text-vermilion text-xs rounded-full">
                          {alerts.dangerCount} 个风险
                        </span>
                      )}
                      {alerts.warningCount > 0 && alerts.dangerCount === 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-xs rounded-full">
                          {alerts.warningCount} 个预警
                        </span>
                      )}
                      {record.hasCloudFloc && (
                        <span className="px-2 py-0.5 bg-ochre-red/10 text-ochre-red text-xs rounded-full">
                          有云絮
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-ash-gray">实际克重</span>
                        <div className="font-bold">{record.actualGrammage} g/m²</div>
                      </div>
                      <div>
                        <span className="text-ash-gray">实际厚度</span>
                        <div className="font-bold">{record.actualThickness} μm</div>
                      </div>
                      <div>
                        <span className="text-ash-gray">厚度偏差</span>
                        <div className={`font-bold ${getDeviationColor(record.thicknessDeviation)}`}>
                          {record.thicknessDeviation.toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-ash-gray">抗张强度</span>
                        <div className="font-bold">{record.tensileStrength}</div>
                      </div>
                      <div>
                        <span className="text-ash-gray">匀度</span>
                        <div className="font-bold">{record.evenness}</div>
                      </div>
                      <div>
                        <span className="text-ash-gray">收缩率</span>
                        <div className="font-bold">{record.shrinkageRate.toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="mt-2 text-sm text-ash-gray">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>{formatDate(record.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className={`w-8 h-8 rounded flex items-center justify-center transition ${
                        isInCompare
                          ? 'bg-ochre-red/80 text-white hover:bg-ochre-red'
                          : 'bg-gilt-gold/15 text-ash-gray hover:bg-gilt-gold/25'
                      }`}
                      title={isInCompare ? '从对比中移除' : '加入对比'}
                      onClick={(e) => { e.stopPropagation(); toggleCompare(record.id); }}
                      disabled={!isInCompare && compareIds.length >= 3}
                    >
                      {isInCompare ? <Check size={16} /> : <GitCompare size={16} />}
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-ash-gray" />
                    ) : (
                      <ChevronDown size={20} className="text-ash-gray" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gilt-gold/20 space-y-6">
                    {record.reportSummary && (
                      <div>
                        <h5 className="font-bold text-ink-black mb-3">批次检测报告</h5>
                        <div className="bg-xuan-paper/50 p-4 rounded-lg border border-gilt-gold/20 text-sm text-ink-black whitespace-pre-line font-mono leading-relaxed">
                          {record.reportSummary}
                        </div>
                      </div>
                    )}

                    <div>
                      <h5 className="font-bold text-ink-black mb-3">纤维原料</h5>
                      <p className="text-sm text-ash-gray">{getFiberSummary(record.mixtureId)}</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-ash-gray text-sm">压榨压力</span>
                        <div className="font-bold">{record.pressPressure} kg</div>
                      </div>
                      <div>
                        <span className="text-ash-gray text-sm">晒纸温度</span>
                        <div className="font-bold">{record.dryingTemp}°C</div>
                      </div>
                      <div>
                        <span className="text-ash-gray text-sm">平整度</span>
                        <div className="font-bold">{record.smoothness}</div>
                      </div>
                      <div>
                        <span className="text-ash-gray text-sm">云絮数量</span>
                        <div className="font-bold">{record.cloudFlocPositions.length}</div>
                      </div>
                    </div>

                    {record.riskAlerts.length > 0 && (
                      <div>
                        <h5 className="font-bold text-ink-black mb-3">风险预警记录</h5>
                        <div className="space-y-2">
                          {record.riskAlerts.map((alert) => (
                            <Alert
                              key={alert.id}
                              level={alert.level as any}
                              message={alert.message}
                              suggestion={alert.suggestion}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {record.notes && (
                      <div>
                        <h5 className="font-bold text-ink-black mb-2">备注</h5>
                        <p className="text-sm text-ash-gray bg-xuan-paper/50 p-3 rounded-lg">
                          {record.notes}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-2">
                      <h5 className="font-bold text-ink-black col-span-5 mb-2">厚薄分布</h5>
                      {record.thicknessMap.map((point, index) => (
                        <div
                          key={index}
                          className={`aspect-square rounded flex flex-col items-center justify-center text-xs font-bold ${
                            point.isWarning
                              ? 'bg-vermilion/80 text-white'
                              : point.deviation > 5
                              ? 'bg-amber-400/80 text-white'
                              : 'bg-bamboo-green/80 text-white'
                          }`}
                        >
                          <span>{point.thickness}</span>
                          <span className="text-[10px] opacity-80">{point.deviation}%</span>
                        </div>
                      ))}
                    </div>

                    {record.riskAlerts.length > 0 && (
                      <div className="pt-4 border-t border-gilt-gold/20">
                        <div className="text-xs text-ochre-red mb-2">
                          💡 根据本次预警生成一份调整草案，去配方试算台改进参数
                        </div>
                        <button
                          className="btn-secondary flex items-center gap-2"
                          onClick={() => {
                            const mix = mixtures.find(m => m.id === record.mixtureId);
                            if (!mix) return;
                            const suggestions: string[] = [];
                            let adjustedChemical = mix.paperChemicalDosage;
                            let adjustedGrammage = mix.targetGrammage;
                            let adjustedThickness = mix.targetThickness;
                            record.riskAlerts.forEach(a => {
                              if (a.type === 'uneven_thickness') {
                                adjustedChemical = Math.min(2, adjustedChemical + 0.2);
                                suggestions.push('厚薄不均 → 增加纸药0.2%');
                              }
                              if (a.type === 'flocculation') {
                                adjustedChemical = Math.min(2.5, adjustedChemical + 0.3);
                                suggestions.push('纤维絮聚 → 增加纸药0.3%');
                              }
                              if (a.type === 'tearing') {
                                adjustedChemical = Math.min(2, adjustedChemical + 0.15);
                                suggestions.push('揭纸破损 → 增加纸药0.15%');
                              }
                              if (a.type === 'excessive_shrinkage') {
                                adjustedThickness = Math.round(adjustedThickness * 1.05);
                                adjustedGrammage = Math.round(adjustedGrammage * 1.03);
                                suggestions.push('收缩过大 → 增大目标厚度5%、克重3%');
                              }
                            });
                            const adjustNotes = `来自批次 ${record.batchNo} 改进：${suggestions.join('；')}`;
                            addMixture({
                              name: `${mix.name}·改进版`,
                              fiberComponents: mix.fiberComponents,
                              paperChemicalId: mix.paperChemicalId,
                              paperChemicalDosage: adjustedChemical,
                              targetGrammage: adjustedGrammage,
                              targetThickness: adjustedThickness,
                              targetWidth: mix.targetWidth,
                              targetHeight: mix.targetHeight,
                              pulpConcentration: mix.pulpConcentration,
                              absoluteDryPulp: mix.absoluteDryPulp,
                              swingTimes: mix.swingTimes,
                              sourceFormulaId: mix.sourceFormulaId,
                              adjustmentFromBatch: record.batchNo,
                              adjustmentNotes: adjustNotes,
                            } as any);
                            const latest = useAppStore.getState().mixtures;
                            if (latest.length > 0) {
                              setCurrentMixture(latest[latest.length - 1]);
                            }
                            navigate('/mixture');
                          }}
                        >
                          → 带回配方试算台，生成调整草案
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
