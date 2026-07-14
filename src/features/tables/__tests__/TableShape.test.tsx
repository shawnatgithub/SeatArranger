// M7-1: TableShape 组件测试 — 4 种 type 快照 + rotation
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { Table } from '@/types';

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
    Rect: make('Rect'),
    Circle: make('Circle'),
    Text: make('Text'),
  };
});

import { TableShape } from '../TableShape';

const baseTable = (overrides: Partial<Table> = {}): Table => ({
  id: 't1',
  type: 'conference-long',
  x: 5,
  y: 3,
  width: 3,
  height: 1,
  rotation: 0,
  tableNumber: '1号桌',
  capacity: 8,
  seatSlots: [],
  locked: false,
  ...overrides,
});

describe('TableShape', () => {
  it('长桌类型渲染 Rect + 桌号 Text', () => {
    const { container } = render(<TableShape table={baseTable()} scale={50} />);
    expect(container.querySelector('[data-konva="Rect"]')).not.toBeNull();
    expect(container.querySelector('[data-konva="Text"]')?.getAttribute('data-text')).toBe('1号桌');
  });

  it('圆桌类型渲染 Circle', () => {
    const { container } = render(
      <TableShape table={baseTable({ type: 'round', width: 1.6, height: 1.6 })} scale={50} />,
    );
    expect(container.querySelector('[data-konva="Circle"]')).not.toBeNull();
    expect(container.querySelector('[data-konva="Rect"]')).toBeNull();
  });

  it('rotation=90 传给 Group', () => {
    const { container } = render(<TableShape table={baseTable({ rotation: 90 })} scale={50} />);
    const group = container.querySelector('[data-konva="Group"]');
    expect(group?.getAttribute('data-rotation')).toBe('90');
  });

  it('locked=true 时 draggable=false', () => {
    const { container } = render(<TableShape table={baseTable({ locked: true })} scale={50} />);
    const group = container.querySelector('[data-konva="Group"]');
    expect(group?.getAttribute('data-draggable')).toBe('false');
  });

  it('highlight=collision 时 Rect 描边红色', () => {
    const { container } = render(
      <TableShape table={baseTable()} scale={50} highlight="collision" />,
    );
    expect(container.querySelector('[data-konva="Rect"]')?.getAttribute('data-stroke')).toBe(
      '#ff4d4f',
    );
  });
});
