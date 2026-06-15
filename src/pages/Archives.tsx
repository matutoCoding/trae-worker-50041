import { useState, useMemo } from 'react';
import { Search, Calendar, FileText, Eye, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Card from '@/components/Card';
import Alert from '@/components/Alert';
import type { SheetRecord } from '@/types';

export default function Archives() {
  const { sheetRecords, mixtures, materials, deleteFormula } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredRecords = useMemo(() => {
    return sheetRecords
      .filter(record => {
        const matchesSearch = record.batchNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          record.notes.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sheetRecords, searchQuery]);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif-cn text-ink-black">工艺档案</h2>
        <p className="text-ash-gray mt-1">记录每批纸的配比与抄造，建立工艺档案</p>
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
          <div className="flex gap-3">
            <select
              className="input-field w-40"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">全部记录</option>
              <option value="normal">正常</option>
              <option value="warning">有预警</option>
              <option value="danger">有风险</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-6 text-sm text-ash-gray">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>共 {filteredRecords.length} 条记录</span>
        </div>
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
            
            return (
              <Card key={record.id}>
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleExpand(record.id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
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

                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-ash-gray" />
                    ) : (
                      <ChevronDown size={20} className="text-ash-gray" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gilt-gold/20 space-y-6">
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
