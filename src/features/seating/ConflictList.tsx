// M9-4: ConflictList — 冲突列表 + 点击定位到画布座位
import { List, Empty, Button } from 'antd';
import type { Guest } from '@/types';
import { useGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';

export function getConflicts(guests: Guest[]): Guest[] {
  return guests.filter((g) => g.satisfaction === 'low');
}

export function ConflictList() {
  const guests = useGuestStore((s) => s.guests);
  const setSelectedId = useUiStore((s) => s.setSelectedId);
  const conflicts = getConflicts(guests);

  if (conflicts.length === 0) {
    return <Empty description="无冲突" data-testid="conflict-empty" />;
  }

  return (
    <List
      size="small"
      header={<b>冲突列表 ({conflicts.length})</b>}
      dataSource={conflicts}
      data-testid="conflict-list"
      renderItem={(g) => (
        <List.Item
          data-testid={`conflict-${g.id}`}
          actions={[
            <Button
              key="locate"
              size="small"
              type="link"
              onClick={() => setSelectedId(g.seatSlotId ?? g.id)}
            >
              定位
            </Button>,
          ]}
        >
          <span>⚠ {g.name}</span>
        </List.Item>
      )}
    />
  );
}
