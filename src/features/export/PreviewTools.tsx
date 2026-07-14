// M10-1 & M10-3 & M10-4: 预览工具栏 + 扫码查座 + 导出 PNG/Excel
import { Button, Card, Input, Space, Switch, Empty, message } from 'antd';
import { useState } from 'react';
import type Konva from 'konva';
import type { Guest, Table } from '@/types';
import { useVenueStore } from '@/stores/venue';
import { useGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';
import { exportStageToPNG, downloadDataUrl } from '@/lib/image';
import { exportXlsx } from '@/lib/excel';

/** 根据姓名（模糊匹配）查找参会者 + 桌子 */
export function findSeatByName(
  name: string,
  guests: Guest[],
  tables: Table[],
): { guest: Guest; table?: Table } | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const guest = guests.find((g) => g.name.toLowerCase().includes(q));
  if (!guest) return null;
  const table = tables.find((t) => t.id === guest.tableId);
  return { guest, table };
}

export function PreviewToolbar({ stage }: { stage?: Konva.Stage | null } = {}) {
  const previewMode = useUiStore((s) => s.previewMode);
  const setPreviewMode = useUiStore((s) => s.setPreviewMode);
  const guests = useGuestStore((s) => s.guests);
  const tables = useVenueStore((s) => s.venue.tables);

  const handleExportPNG = () => {
    if (!stage) {
      message.warning('画布未就绪');
      return;
    }
    const { dataUrl, fileName } = exportStageToPNG(stage);
    downloadDataUrl(dataUrl, fileName);
  };

  const handleExportExcel = () => {
    const tablesById: Record<string, { tableNumber: string }> = {};
    for (const t of tables) tablesById[t.id] = { tableNumber: t.tableNumber };
    const buf = exportXlsx(guests, tablesById);
    const blob = new Blob([new Uint8Array(buf).buffer as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(url, '参会名单.xlsx');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Space>
      <span>预览模式</span>
      <Switch
        checked={previewMode}
        onChange={setPreviewMode}
        aria-label="preview-mode"
        checkedChildren="预览"
        unCheckedChildren="编辑"
      />
      <Button onClick={handleExportPNG} data-testid="export-png">
        导出 PNG
      </Button>
      <Button onClick={handleExportExcel} data-testid="export-excel">
        导出名单
      </Button>
    </Space>
  );
}

export function ScanSeatFinder() {
  const guests = useGuestStore((s) => s.guests);
  const tables = useVenueStore((s) => s.venue.tables);
  const setSelectedId = useUiStore((s) => s.setSelectedId);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ guest: Guest; table?: Table } | null>(null);

  const handleSearch = () => {
    const r = findSeatByName(query, guests, tables);
    setResult(r);
    if (r?.guest.seatSlotId) setSelectedId(r.guest.seatSlotId);
  };

  return (
    <Card size="small" title="扫码查座" data-testid="scan-seat">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input.Search
          placeholder="输入姓名"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onSearch={handleSearch}
          enterButton={<Button type="primary">查询</Button>}
          aria-label="scan-input"
        />
        {result && result.guest ? (
          <div data-testid="scan-result">
            <p>
              <b>{result.guest.name}</b>
            </p>
            <p>桌号：{result.table?.tableNumber ?? '未分配'}</p>
            <p>座位：{result.guest.seatSlotId ?? '未分配'}</p>
          </div>
        ) : query ? (
          <Empty description="未找到" data-testid="scan-empty" />
        ) : null}
      </Space>
    </Card>
  );
}
