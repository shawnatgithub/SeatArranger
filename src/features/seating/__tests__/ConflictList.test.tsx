// M9-4: ConflictList 测试
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictList, getConflicts } from '../ConflictList';
import { useGuestStore, resetGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';
import type { Guest } from '@/types';

const g = (
  id: string,
  name: string,
  overrides: Partial<Guest> = {},
): Guest => ({
  id,
  name,
  tags: [],
  seatPinned: false,
  satisfaction: 'high',
  ...overrides,
});

describe('getConflicts', () => {
  it('只返回 satisfaction=low 的参会者', () => {
    const list = [
      g('1', 'A', { satisfaction: 'high' }),
      g('2', 'B', { satisfaction: 'low' }),
      g('3', 'C', { satisfaction: 'medium' }),
      g('4', 'D', { satisfaction: 'low' }),
    ];
    expect(getConflicts(list).map((x) => x.id)).toEqual(['2', '4']);
  });
});

describe('ConflictList', () => {
  beforeEach(() => {
    resetGuestStore();
    useUiStore.getState().reset();
  });

  it('无冲突显示 Empty', () => {
    useGuestStore.setState({ guests: [g('1', 'A')] });
    render(<ConflictList />);
    expect(screen.getByTestId('conflict-empty')).toBeInTheDocument();
  });

  it('渲染冲突条目并支持定位', () => {
    useGuestStore.setState({
      guests: [g('c1', 'X', { satisfaction: 'low', seatSlotId: 'slot-x' })],
    });
    render(<ConflictList />);
    expect(screen.getByTestId('conflict-c1')).toBeInTheDocument();
    fireEvent.click(screen.getByText('定位'));
    expect(useUiStore.getState().selectedId).toBe('slot-x');
  });
});
