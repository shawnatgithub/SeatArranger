// M6-7: LockIcon 计时器测试
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
        props[`data-${k.toLowerCase()}`] = typeof v === 'object' ? JSON.stringify(v) : v;
      }
      return React.createElement('div', props, children as React.ReactNode);
    };
  return {
    Circle: make('Circle'),
    Group: make('Group'),
    Text: make('Text'),
  };
});

import { LockIcon } from '../LockIcon';

describe('LockIcon', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hovered=false 时不渲染', () => {
    const { container } = render(
      <LockIcon x={0} y={0} locked={false} hovered={false} onToggle={() => {}} />,
    );
    expect(container.querySelector('[data-konva="Group"]')).toBeNull();
  });

  it('hovered=true 500ms 后浮现', () => {
    const { container, rerender } = render(
      <LockIcon x={0} y={0} locked={false} hovered={false} onToggle={() => {}} />,
    );
    rerender(<LockIcon x={0} y={0} locked={false} hovered onToggle={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(container.querySelector('[data-konva="Group"]')).not.toBeNull();
  });

  it('浮现后 1.5s 自动隐藏', () => {
    const { container, rerender } = render(
      <LockIcon x={0} y={0} locked={false} hovered={false} onToggle={() => {}} />,
    );
    rerender(<LockIcon x={0} y={0} locked={false} hovered onToggle={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500); // 浮现
    });
    expect(container.querySelector('[data-konva="Group"]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(1500); // 自动隐藏
    });
    expect(container.querySelector('[data-konva="Group"]')).toBeNull();
  });

  it('locked=true 时图标显示 🔒', () => {
    const { container, rerender } = render(
      <LockIcon x={0} y={0} locked hovered={false} onToggle={() => {}} />,
    );
    rerender(<LockIcon x={0} y={0} locked hovered onToggle={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const text = container.querySelector('[data-konva="Text"]');
    expect(text?.getAttribute('data-text')).toBe('🔒');
  });
});
