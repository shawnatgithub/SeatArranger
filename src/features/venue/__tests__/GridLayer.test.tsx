// M6-2: GridLayer 组件测试 — 15×10 房间生成 31×21 条虚线
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
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
    Line: make('Line'),
    Text: make('Text'),
  };
});

import { GridLayer } from '../GridLayer';
import { useVenueStore } from '@/stores/venue';
import { useUiStore } from '@/stores/ui';

describe('GridLayer', () => {
  it('15×10 房间生成 31 条垂直 + 21 条水平网格线', () => {
    useVenueStore.setState((s) => {
      s.venue.width = 15;
      s.venue.height = 10;
      s.venue.scale = 50;
    });
    useUiStore.setState({ showGrid: true });
    const { container } = render(<GridLayer />);
    const lines = container.querySelectorAll('[data-konva="Line"]');
    // 15m / 0.5m + 1 = 31 vertical；10m / 0.5m + 1 = 21 horizontal
    expect(lines.length).toBe(31 + 21);
  });

  it('showGrid=false 时不渲染', () => {
    useUiStore.setState({ showGrid: false });
    const { container } = render(<GridLayer />);
    const lines = container.querySelectorAll('[data-konva="Line"]');
    expect(lines.length).toBe(0);
  });

  it('M10-1: previewMode=true 时隐藏网格', () => {
    useVenueStore.setState((s) => {
      s.venue.width = 15;
      s.venue.height = 10;
      s.venue.scale = 50;
    });
    useUiStore.setState({ showGrid: true, previewMode: true });
    const { container } = render(<GridLayer />);
    const lines = container.querySelectorAll('[data-konva="Line"]');
    expect(lines.length).toBe(0);
    useUiStore.setState({ previewMode: false });
  });
});
