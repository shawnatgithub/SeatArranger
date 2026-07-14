// M8-1: Excel 导入/导出 — 基于 SheetJS
import * as XLSX from 'xlsx';
import type { Guest, PersonalTag } from '@/types';

/**
 * 从 Excel 二进制读取参会者列表。
 * 支持列名（大小写不敏感）：姓名/name、手机/phone、性别/gender、部门/department、
 * 级别/level、标签/tags（逗号分隔）、饮食/diet、特殊需求/needs。
 */
export function importXlsx(data: ArrayBuffer | Uint8Array): Guest[] {
  const wb = XLSX.read(data, { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows.map((row, idx) => rowToGuest(row, idx));
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const val = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val).trim();
  }
  return '';
}

function rowToGuest(row: Record<string, unknown>, idx: number): Guest {
  const name = pick(row, ['姓名', 'name', 'Name']);
  const phone = pick(row, ['手机', '电话', 'phone', 'Phone']);
  const genderStr = pick(row, ['性别', 'gender']).toLowerCase();
  const gender = genderStr === '女' || genderStr === 'f' || genderStr === 'female' ? 'female'
    : genderStr === '男' || genderStr === 'm' || genderStr === 'male' ? 'male'
      : undefined;
  const department = pick(row, ['部门', 'department']);
  const level = pick(row, ['级别', '职级', 'level']);
  const tagsStr = pick(row, ['标签', 'tags']);
  const tags: PersonalTag[] = tagsStr
    ? tagsStr
        .split(/[,，\s]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t): t is PersonalTag => t === 'vip' || t === 'host' || t === 'speaker')
    : [];
  const dietaryRestrictions = pick(row, ['饮食', 'dietary', 'diet']);
  const specialNeeds = pick(row, ['特殊需求', 'needs', 'specialNeeds']);
  return {
    id: `guest-${idx + 1}`,
    name: name || `参会者${idx + 1}`,
    phone: phone || undefined,
    gender,
    department: department || undefined,
    level: level || undefined,
    tags,
    dietaryRestrictions: dietaryRestrictions || undefined,
    specialNeeds: specialNeeds || undefined,
    seatPinned: false,
    satisfaction: 'high',
  };
}

/**
 * 导出参会者名单为 xlsx 二进制（按桌号排序 6 列）。
 * 列：桌号 / 座位 / 姓名 / 部门 / 级别 / 标签
 */
export function exportXlsx(
  guests: Guest[],
  tablesById: Record<string, { tableNumber: string }>,
): Uint8Array {
  const rows = [...guests]
    .sort((a, b) => {
      const na = tablesById[a.tableId ?? '']?.tableNumber ?? '';
      const nb = tablesById[b.tableId ?? '']?.tableNumber ?? '';
      return na.localeCompare(nb, 'zh-Hans');
    })
    .map((g) => ({
      桌号: tablesById[g.tableId ?? '']?.tableNumber ?? '未分配',
      座位: g.seatSlotId ?? '',
      姓名: g.name,
      部门: g.department ?? '',
      级别: g.level ?? '',
      标签: g.tags.join(','),
    }));
  const ws = XLSX.utils.json_to_sheet(rows, {
    header: ['桌号', '座位', '姓名', '部门', '级别', '标签'],
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '参会者');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new Uint8Array(buf);
}
