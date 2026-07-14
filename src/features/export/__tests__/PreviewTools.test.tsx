// M10-1 & M10-4: PreviewToolbar + ScanSeatFinder + findSeatByName
import { describe, expect, it, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import type { Guest, Table } from '@/types';
import { PreviewToolbar, ScanSeatFinder, findSeatByName } from '../PreviewTools';
import { useVenueStore } from '@/stores/venue';
import { useGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';

function makeGuest(id: string, name: string, extra: Partial<Guest> = {}): Guest {
  return {
    id,
    name,
    tags: [],
    seatPinned: false,
    satisfaction: 'high',
    ...extra,
  };
}

function makeTable(id: string, tableNumber: string): Table {
  return {
    id,
    type: 'round',
    x: 5,
    y: 5,
    width: 1.6,
    height: 1.6,
    rotation: 0,
    tableNumber,
    capacity: 8,
    seatSlots: [],
  };
}

describe('findSeatByName', () => {
  const guests = [
    makeGuest('g1', '张明远', { tableId: 't1', seatSlotId: 'slot-1' }),
    makeGuest('g2', '李四'),
  ];
  const tables = [makeTable('t1', 'A-1')];

  it('模糊匹配返回参会者与桌子', () => {
    const r = findSeatByName('张明', guests, tables);
    expect(r?.guest.id).toBe('g1');
    expect(r?.table?.tableNumber).toBe('A-1');
  });

  it('未找到返回 null', () => {
    expect(findSeatByName('王五', guests, tables)).toBeNull();
  });

  it('空字符串返回 null', () => {
    expect(findSeatByName('  ', guests, tables)).toBeNull();
  });
});

describe('PreviewToolbar', () => {
  beforeEach(() => {
    useUiStore.setState({ previewMode: false });
  });

  it('点击开关切换 previewMode', () => {
    render(<PreviewToolbar />);
    const sw = screen.getByRole('switch');
    fireEvent.click(sw);
    expect(useUiStore.getState().previewMode).toBe(true);
  });
});

describe('ScanSeatFinder', () => {
  beforeEach(() => {
    useGuestStore.setState({
      guests: [makeGuest('g1', '张明远', { tableId: 't1', seatSlotId: 'slot-1' })],
      relations: [],
      unassignedIds: [],
    });
    useVenueStore.setState((s) => {
      s.venue.tables = [makeTable('t1', 'A-1')];
    });
    useUiStore.setState({ selectedId: null });
  });

  it('输入"张明远" 后卡片显示桌号 + 高亮 seatSlotId', () => {
    const { container } = render(<ScanSeatFinder />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '张明远' } });
    // Input.Search enterButton onSearch on keydown Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    const result = screen.getByTestId('scan-result');
    expect(result.textContent).toContain('张明远');
    expect(result.textContent).toContain('A-1');
    expect(useUiStore.getState().selectedId).toBe('slot-1');
  });

  it('未找到显示 Empty', () => {
    const { container } = render(<ScanSeatFinder />);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '王五' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(screen.getByTestId('scan-empty')).toBeInTheDocument();
  });
});
