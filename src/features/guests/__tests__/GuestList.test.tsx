// M8-2 & M8-3: GuestList 测试
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Guest } from '@/types';
import { GuestList, filterGuests, assignGuest } from '../GuestList';
import { useGuestStore, resetGuestStore } from '@/stores/guest';

const makeGuest = (id: string, name: string, overrides: Partial<Guest> = {}): Guest => ({
  id,
  name,
  tags: [],
  seatPinned: false,
  satisfaction: 'high',
  ...overrides,
});

describe('filterGuests', () => {
  const list: Guest[] = [
    makeGuest('1', '张三', { department: '技术部', tags: ['vip'] }),
    makeGuest('2', '李四', { department: '市场部', seatSlotId: 's1' }),
    makeGuest('3', '王五', { satisfaction: 'low' }),
    makeGuest('4', '赵六', { department: '技术部' }),
  ];

  it('搜索"张"仅匹配一项', () => {
    expect(filterGuests(list, '张', 'all')).toHaveLength(1);
  });
  it('筛选 unassigned 剔除已分配', () => {
    const out = filterGuests(list, '', 'unassigned');
    expect(out.every((g) => !g.seatSlotId)).toBe(true);
    expect(out).toHaveLength(3);
  });
  it('筛选 assigned', () => {
    expect(filterGuests(list, '', 'assigned')).toHaveLength(1);
  });
  it('筛选 vip', () => {
    expect(filterGuests(list, '', 'vip')).toHaveLength(1);
  });
  it('筛选 conflict', () => {
    expect(filterGuests(list, '', 'conflict')).toHaveLength(1);
  });
});

describe('GuestList component', () => {
  beforeEach(() => {
    resetGuestStore();
    useGuestStore.setState({
      guests: [
        makeGuest('1', '张三', { tags: ['vip'] }),
        makeGuest('2', '李四'),
      ],
    });
  });

  it('渲染两条列表项', () => {
    render(<GuestList />);
    expect(screen.getByTestId('guest-1')).toBeInTheDocument();
    expect(screen.getByTestId('guest-2')).toBeInTheDocument();
  });

  it('搜索框输入"张"只保留匹配', () => {
    render(<GuestList />);
    const input = screen.getByLabelText('guest-search');
    fireEvent.change(input, { target: { value: '张' } });
    expect(screen.getByTestId('guest-1')).toBeInTheDocument();
    expect(screen.queryByTestId('guest-2')).toBeNull();
  });
});

describe('assignGuest', () => {
  beforeEach(() => {
    resetGuestStore();
    useGuestStore.setState({
      guests: [makeGuest('1', '张三')],
    });
  });
  it('分配座位后 guest.seatSlotId 更新', () => {
    assignGuest({ guestId: '1', tableId: 'T1', seatSlotId: 'S1' });
    const g = useGuestStore.getState().guests[0];
    expect(g.tableId).toBe('T1');
    expect(g.seatSlotId).toBe('S1');
  });
  it('传入空 tableId 相当于取消分配', () => {
    assignGuest({ guestId: '1', tableId: 'T1', seatSlotId: 'S1' });
    assignGuest({ guestId: '1' });
    const g = useGuestStore.getState().guests[0];
    expect(g.tableId).toBeUndefined();
    expect(g.seatSlotId).toBeUndefined();
  });
});
