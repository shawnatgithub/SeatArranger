import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// jsdom 中 Konva 依赖真实 canvas，App 使用了大量 Konva 组件，此处统一 mock
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
    Line: make('Line'),
    Text: make('Text'),
  };
});

import App from '../App';

describe('App smoke', () => {
  it('渲染左侧栏 + 演示数据按钮', () => {
    render(<App />);
    expect(screen.getByTestId('load-demo-btn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /加载中型模板/ })).toBeInTheDocument();
  });
});
