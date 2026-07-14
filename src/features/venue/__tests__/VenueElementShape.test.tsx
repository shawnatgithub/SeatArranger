// M6-3 & M6-6: VenueElementShape 组件测试 — 拖拽计算 + 两次点击删除
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('react-konva', () => {
  const make =
    (name: string) =>
    ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) => {
      const props: Record<string, unknown> = { 'data-konva': name };
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === 'function' || v == null) continue;
        if (Array.isArray(v)) {
          props[`data-${k.toLowerCase()}`] = v.join(',');
          continue;
        }
        props[`data-${k.toLowerCase()}`] = typeof v === 'object' ? JSON.stringify(v) : v;
      }
      return React.createElement('div', props, children as React.ReactNode);
    };
  return {
    Stage: make('Stage'),
    Layer: make('Layer'),
    Group: make('Group'),
    Rect: make('Rect'),
    Text: make('Text'),
  };
});

import { VenueElementShape, computeDragEndPosition } from '../VenueElementShape';
import { useVenueStore, resetVenueStore } from '@/stores/venue';
import { useUiStore } from '@/stores/ui';

describe('VenueElementShape', () => {
  beforeEach(() => {
    resetVenueStore();
    useUiStore.getState().reset();
  });

  it('computeDragEndPosition: 拖拽坐标经 snap + constrain', () => {
    // 房间 10×8，scale=50；元素 1×1
    // 拖到 (177px, 179px) = (3.54m, 3.58m) → snap→3.5 / 3.5，constrain 内
    const pos = computeDragEndPosition(
      { x: 177, y: 179 },
      { width: 1, height: 1 },
      { scale: 50, width: 10, height: 8 },
    );
    expect(pos.x).toBeCloseTo(3.5);
    expect(pos.y).toBeCloseTo(3.5);
  });

  it('computeDragEndPosition: 越界坐标被 clamp 回房间内（含 margin 0.2）', () => {
    // 拖到远超右边界（1000px, 1000px）
    const pos = computeDragEndPosition(
      { x: 1000, y: 1000 },
      { width: 1, height: 1 },
      { scale: 50, width: 10, height: 8 },
    );
    // clamp 到 width - elWidth - margin = 10 - 1 - 0.2 = 8.8
    expect(pos.x).toBeCloseTo(8.8);
    expect(pos.y).toBeCloseTo(6.8);
  });

  it('渲染选中态时描边高亮', () => {
    useVenueStore.setState((s) => {
      s.venue.elements = [
        {
          id: 'e1',
          type: 'wall',
          x: 1,
          y: 1,
          width: 1,
          height: 1,
          rotation: 0,
          locked: false,
        },
      ];
    });
    useUiStore.setState({ selectedId: 'e1' });
    const el = useVenueStore.getState().venue.elements[0];
    const { container } = render(<VenueElementShape element={el} />);
    const rect = container.querySelector('[data-konva="Rect"]');
    expect(rect?.getAttribute('data-stroke')).toBe('#ff4d4f');
  });

  it('locked=true 时 draggable=false', () => {
    useVenueStore.setState((s) => {
      s.venue.elements = [
        {
          id: 'e2',
          type: 'wall',
          x: 1,
          y: 1,
          width: 1,
          height: 1,
          rotation: 0,
          locked: true,
        },
      ];
    });
    const el = useVenueStore.getState().venue.elements[0];
    const { container } = render(<VenueElementShape element={el} />);
    const group = container.querySelector('[data-konva="Group"]');
    expect(group?.getAttribute('data-draggable')).toBe('false');
  });
});
