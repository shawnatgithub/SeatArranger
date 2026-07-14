// M6-1: RoomRect 组件测试
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
        props[`data-${k.toLowerCase()}`] = typeof v === 'object' ? JSON.stringify(v) : v;
      }
      return React.createElement('div', props, children as React.ReactNode);
    };
  return {
    Stage: make('Stage'),
    Layer: make('Layer'),
    Group: make('Group'),
    Rect: make('Rect'),
    Circle: make('Circle'),
    Line: make('Line'),
    Text: make('Text'),
  };
});

import { RoomRect } from '../RoomRect';
import { useVenueStore } from '@/stores/venue';

describe('RoomRect', () => {
  it('15×10 会议室渲染 750×500 rect', () => {
    useVenueStore.setState((s) => {
      s.venue.width = 15;
      s.venue.height = 10;
      s.venue.scale = 50;
    });
    const { container } = render(<RoomRect />);
    const rect = container.querySelector('[data-konva="Rect"]');
    expect(rect).not.toBeNull();
    expect(rect?.getAttribute('data-width')).toBe('750');
    expect(rect?.getAttribute('data-height')).toBe('500');
  });
});
