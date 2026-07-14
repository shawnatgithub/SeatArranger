// M7-2: ChairShape 测试 — 绑定/解绑分支
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { SeatSlot, Table } from '@/types';

vi.mock('react-konva', () => {
  const make =
    (name: string) =>
    ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => {
      const props: Record<string, unknown> = { 'data-konva': name };
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === 'function' || v == null) continue;
        props[`data-${k.toLowerCase()}`] = typeof v === 'object' ? JSON.stringify(v) : v;
      }
      return React.createElement('div', props, children as React.ReactNode);
    };
  return {
    Group: make('Group'),
    Circle: make('Circle'),
  };
});

import { ChairShape } from '../ChairShape';

const table: Table = {
  id: 't1',
  type: 'conference-long',
  x: 5,
  y: 3,
  width: 3,
  height: 1,
  rotation: 0,
  tableNumber: '1',
  capacity: 8,
  seatSlots: [],
};

const boundSlot: SeatSlot = {
  id: 's1',
  localX: 1,
  localY: 0.5,
  angle: 0,
  isFreeFloating: false,
};

describe('ChairShape', () => {
  it('绑定态：位置随桌子中心 + localX/Y', () => {
    const { container } = render(
      <ChairShape slot={boundSlot} table={table} scale={50} occupied={false} />,
    );
    const group = container.querySelector('[data-konva="Group"]');
    // 全局米坐标：(5+1, 3+0.5)=(6, 3.5)；scale=50 → (300, 175)
    expect(group?.getAttribute('data-x')).toBe('300');
    expect(group?.getAttribute('data-y')).toBe('175');
  });

  it('解绑态：使用 freeX/freeY 独立坐标', () => {
    const free: SeatSlot = {
      id: 's2',
      localX: 1,
      localY: 0.5,
      angle: 0,
      isFreeFloating: true,
      freeX: 2,
      freeY: 2,
      freeAngle: 0,
    };
    const { container } = render(<ChairShape slot={free} scale={50} occupied={false} />);
    const group = container.querySelector('[data-konva="Group"]');
    expect(group?.getAttribute('data-x')).toBe('100');
    expect(group?.getAttribute('data-y')).toBe('100');
    // 解绑态描边紫色
    expect(container.querySelector('[data-konva="Circle"]')?.getAttribute('data-stroke')).toBe(
      '#722ed1',
    );
  });

  it('occupied=true satisfaction=high 时填充绿色', () => {
    const { container } = render(
      <ChairShape slot={boundSlot} table={table} scale={50} occupied satisfaction="high" />,
    );
    expect(container.querySelector('[data-konva="Circle"]')?.getAttribute('data-fill')).toBe(
      '#52c41a',
    );
  });

  it('satisfaction=low 时填充红色', () => {
    const { container } = render(
      <ChairShape slot={boundSlot} table={table} scale={50} occupied satisfaction="low" />,
    );
    expect(container.querySelector('[data-konva="Circle"]')?.getAttribute('data-fill')).toBe(
      '#ff4d4f',
    );
  });
});
