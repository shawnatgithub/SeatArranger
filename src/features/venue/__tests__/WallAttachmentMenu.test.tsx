// M6-4/5/6: WallAttachmentMenu 组件测试 — 悬浮 500ms + 自动收回 + 挂件添加
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

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
    Circle: make('Circle'),
    Text: make('Text'),
  };
});

import { WallAttachmentMenu } from '../WallAttachmentMenu';
import { resetVenueStore } from '@/stores/venue';
import type { VenueElement } from '@/types';

const WALL: VenueElement = {
  id: 'wall-1',
  type: 'wall',
  x: 5,
  y: 0,
  width: 2,
  height: 0.1,
  rotation: 0,
  locked: false,
};

describe('WallAttachmentMenu', () => {
  beforeEach(() => {
    resetVenueStore();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hovered=false 时不渲染', () => {
    const { container } = render(<WallAttachmentMenu wall={WALL} scale={50} hovered={false} />);
    expect(container.querySelector('[data-konva="Group"][data-name="wall-attach-menu"]')).toBeNull();
  });

  it('悬浮 500ms 后菜单出现', () => {
    const { container, rerender } = render(
      <WallAttachmentMenu wall={WALL} scale={50} hovered={false} />,
    );
    rerender(<WallAttachmentMenu wall={WALL} scale={50} hovered />);
    // 推进 500ms 触发出现
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const menu = container.querySelector('[data-konva="Group"]');
    expect(menu).not.toBeNull();
  });

  it('悬浮不足 500ms 时不出现', () => {
    const { container, rerender } = render(
      <WallAttachmentMenu wall={WALL} scale={50} hovered={false} />,
    );
    rerender(<WallAttachmentMenu wall={WALL} scale={50} hovered />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(container.querySelector('[data-konva="Group"]')).toBeNull();
  });
});
