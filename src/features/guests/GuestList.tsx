// M8-2 & M8-3: GuestList — 参会者列表 + 搜索 + 筛选 + 分配辅助
import { useMemo, useState } from 'react';
import { Input, Radio, Space, Tag, Empty } from 'antd';
import type { Guest } from '@/types';
import { useGuestStore } from '@/stores/guest';

export type GuestFilter = 'all' | 'unassigned' | 'assigned' | 'vip' | 'conflict';

export function filterGuests(list: Guest[], query: string, filter: GuestFilter): Guest[] {
  const q = query.trim().toLowerCase();
  return list.filter((g) => {
    if (q) {
      if (!g.name.toLowerCase().includes(q) && !(g.department ?? '').toLowerCase().includes(q)) {
        return false;
      }
    }
    switch (filter) {
      case 'unassigned':
        return !g.seatSlotId;
      case 'assigned':
        return Boolean(g.seatSlotId);
      case 'vip':
        return g.tags.includes('vip');
      case 'conflict':
        return g.satisfaction === 'low';
      case 'all':
      default:
        return true;
    }
  });
}

export function GuestList() {
  const guests = useGuestStore((s) => s.guests);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<GuestFilter>('all');

  const visible = useMemo(() => filterGuests(guests, query, filter), [guests, query, filter]);

  return (
    <div data-testid="guest-list">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Input.Search
          aria-label="guest-search"
          placeholder="搜索姓名/部门"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
        />
        <Radio.Group
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          size="small"
          aria-label="guest-filter"
        >
          <Radio.Button value="all">全部</Radio.Button>
          <Radio.Button value="unassigned">未分配</Radio.Button>
          <Radio.Button value="assigned">已分配</Radio.Button>
          <Radio.Button value="vip">VIP</Radio.Button>
          <Radio.Button value="conflict">冲突</Radio.Button>
        </Radio.Group>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {visible.map((g) => (
            <li key={g.id} data-testid={`guest-${g.id}`} draggable style={{ padding: 4 }}>
              <span>{g.name}</span>
              {g.tags.includes('vip') && (
                <Tag color="gold" style={{ marginLeft: 4 }}>
                  VIP
                </Tag>
              )}
              {g.satisfaction === 'low' && (
                <Tag color="red" style={{ marginLeft: 4 }}>
                  ⚠
                </Tag>
              )}
            </li>
          ))}
          {visible.length === 0 && <Empty description="无匹配" />}
        </ul>
      </Space>
    </div>
  );
}

// M8-3: 分配/取消分配的辅助 action —— UI 层通过拖拽后调用
export interface AssignmentAction {
  guestId: string;
  tableId?: string;
  seatSlotId?: string;
}

/** 将参会者分配到桌子+座位；tableId 为空时取消分配 */
export function assignGuest(a: AssignmentAction): void {
  const store = useGuestStore.getState();
  store.updateGuest(a.guestId, {
    tableId: a.tableId,
    seatSlotId: a.seatSlotId,
  });
}
