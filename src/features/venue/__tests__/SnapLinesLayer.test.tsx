// M6-8: SnapLinesLayer 测试
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
  return { Line: make('Line') };
});

import { SnapLinesLayer } from '../SnapLinesLayer';
import type { SnapLine } from '@/domain/geometry/snap';

describe('SnapLinesLayer', () => {
  it('渲染 1 条 vertical + 1 条 horizontal 辅助线', () => {
    const lines: SnapLine[] = [
      { position: 3, orientation: 'vertical' },
      { position: 2, orientation: 'horizontal' },
    ];
    const { container } = render(
      <SnapLinesLayer lines={lines} venueWidth={10} venueHeight={8} scale={50} />,
    );
    const rendered = container.querySelectorAll('[data-konva="Line"]');
    expect(rendered.length).toBe(2);
    // vertical: points [x, 0, x, hPx=400]
    const first = rendered[0];
    expect(first.getAttribute('data-points')).toBe('150,0,150,400');
    // horizontal: points [0, y, wPx=500, y]
    const second = rendered[1];
    expect(second.getAttribute('data-points')).toBe('0,100,500,100');
  });

  it('空数组不渲染任何线', () => {
    const { container } = render(
      <SnapLinesLayer lines={[]} venueWidth={10} venueHeight={8} scale={50} />,
    );
    expect(container.querySelectorAll('[data-konva="Line"]').length).toBe(0);
  });
});
