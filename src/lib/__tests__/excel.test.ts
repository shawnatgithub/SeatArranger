// M8-1: Excel 导入/导出测试
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { importXlsx, exportXlsx } from '../excel';

function buildFixtureBuffer(rows: Record<string, unknown>[]): Uint8Array {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'guests');
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}

describe('excel', () => {
  it('importXlsx 解析 20 行中文列名', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      姓名: `张${i + 1}`,
      部门: '技术部',
      级别: 'M3',
      标签: i % 5 === 0 ? 'vip' : '',
    }));
    const buf = buildFixtureBuffer(rows);
    const guests = importXlsx(buf);
    expect(guests.length).toBe(20);
    expect(guests[0].name).toBe('张1');
    expect(guests[0].tags).toContain('vip');
    expect(guests[1].tags.length).toBe(0);
  });

  it('importXlsx 兼容英文列名', () => {
    const rows = [{ name: 'Alice', gender: 'female', tags: 'vip,host' }];
    const buf = buildFixtureBuffer(rows);
    const guests = importXlsx(buf);
    expect(guests[0].name).toBe('Alice');
    expect(guests[0].gender).toBe('female');
    expect(guests[0].tags).toEqual(expect.arrayContaining(['vip', 'host']));
  });

  it('exportXlsx 生成 6 列顺序 header', () => {
    const buf = exportXlsx(
      [
        {
          id: 'g1',
          name: '甲',
          tags: ['vip'],
          seatPinned: false,
          satisfaction: 'high',
          tableId: 't1',
          seatSlotId: 's1',
          department: '技术',
          level: 'M3',
        },
      ],
      { t1: { tableNumber: 'A1' } },
    );
    // 解析回来
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const parsed: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    expect(parsed.length).toBe(1);
    expect(Object.keys(parsed[0])).toEqual(['桌号', '座位', '姓名', '部门', '级别', '标签']);
    expect(parsed[0]['桌号']).toBe('A1');
    expect(parsed[0]['姓名']).toBe('甲');
  });

  it('exportXlsx 按桌号排序', () => {
    const buf = exportXlsx(
      [
        {
          id: 'g1',
          name: '乙',
          tags: [],
          seatPinned: false,
          satisfaction: 'high',
          tableId: 't2',
        },
        {
          id: 'g2',
          name: '甲',
          tags: [],
          seatPinned: false,
          satisfaction: 'high',
          tableId: 't1',
        },
      ],
      { t1: { tableNumber: 'A1' }, t2: { tableNumber: 'A2' } },
    );
    const wb = XLSX.read(buf, { type: 'array' });
    const parsed: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    expect(parsed[0]['姓名']).toBe('甲');
    expect(parsed[1]['姓名']).toBe('乙');
  });
});
