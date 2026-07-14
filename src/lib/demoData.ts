// M11-3: 演示数据 — 中型会议室 + 20 人 + 4 组关系
import type { Guest, GuestRelation, PersonalTag } from '@/types';
import { useVenueStore } from '@/stores/venue';
import { useGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';

interface DemoGuestSeed {
  name: string;
  department: string;
  level: string;
  tags?: PersonalTag[];
}

const DEMO_GUESTS: DemoGuestSeed[] = [
  { name: '张明远', department: '总裁办', level: 'C', tags: ['vip'] },
  { name: '李慧兰', department: '总裁办', level: 'C', tags: ['vip'] },
  { name: '王大力', department: '总裁办', level: 'D', tags: ['host'] },
  { name: '刘倩', department: '战略部', level: 'D' },
  { name: '陈伟', department: '战略部', level: 'E' },
  { name: '赵敏', department: '战略部', level: 'E' },
  { name: '孙涛', department: '技术部', level: 'D', tags: ['speaker'] },
  { name: '周晓', department: '技术部', level: 'E' },
  { name: '吴磊', department: '技术部', level: 'E' },
  { name: '郑州', department: '技术部', level: 'F' },
  { name: '钱伟', department: '销售部', level: 'D' },
  { name: '冯芳', department: '销售部', level: 'E' },
  { name: '沈晨', department: '销售部', level: 'E' },
  { name: '韩梅', department: '销售部', level: 'F' },
  { name: '杨阳', department: '市场部', level: 'D' },
  { name: '朱丽', department: '市场部', level: 'E' },
  { name: '许可', department: '市场部', level: 'F' },
  { name: '何俊', department: '财务部', level: 'D' },
  { name: '罗芳', department: '财务部', level: 'E' },
  { name: '高峰', department: '人事部', level: 'D' },
];

/** 加载演示数据：中型模板 + 20 人 + 4 组关系，跳到步骤 2 */
export function loadDemoData(): { guestsCount: number; relationsCount: number } {
  useVenueStore.getState().loadTemplate('medium');

  const guests: Guest[] = DEMO_GUESTS.map((g, i) => ({
    id: `demo-guest-${i + 1}`,
    name: g.name,
    department: g.department,
    level: g.level,
    tags: g.tags ?? [],
    seatPinned: false,
    satisfaction: 'high',
  }));

  const relations: GuestRelation[] = [
    {
      id: 'demo-rel-1',
      guestAId: 'demo-guest-1',
      guestBId: 'demo-guest-2',
      type: 'must-adjacent',
      constraintLevel: 'hard',
    },
    {
      id: 'demo-rel-2',
      guestAId: 'demo-guest-7',
      guestBId: 'demo-guest-8',
      type: 'prefer-same-table',
      constraintLevel: 'soft',
    },
    {
      id: 'demo-rel-3',
      guestAId: 'demo-guest-11',
      guestBId: 'demo-guest-15',
      type: 'must-isolate',
      constraintLevel: 'hard',
    },
    {
      id: 'demo-rel-4',
      guestAId: 'demo-guest-3',
      guestBId: 'demo-guest-4',
      type: 'prefer-same-table',
      constraintLevel: 'soft',
    },
  ];

  useGuestStore.setState({
    guests,
    relations,
    ruleScene: 'corporate',
    unassignedIds: [],
  });
  useUiStore.setState({ currentStep: 2 });
  return { guestsCount: guests.length, relationsCount: relations.length };
}
