// 共享 react-konva mock — 允许 jsdom 中渲染 Konva 组件为 div
import React from 'react';
import { vi } from 'vitest';

/**
 * 将 react-konva 所有导出替换为透明的 <div> 组件；
 * 保留组件名与 props 以便测试用 querySelector/data-* 断言。
 */
export function mockReactKonva() {
  vi.mock('react-konva', () => {
    const make = (name: string) =>
      // eslint-disable-next-line react/display-name
      ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(
          'div',
          { 'data-konva': name, ...serializeProps(rest) },
          children as React.ReactNode,
        );
    return {
      Stage: make('Stage'),
      Layer: make('Layer'),
      Group: make('Group'),
      Rect: make('Rect'),
      Circle: make('Circle'),
      Line: make('Line'),
      Text: make('Text'),
      Arc: make('Arc'),
      Path: make('Path'),
      RegularPolygon: make('RegularPolygon'),
    };
  });
}

function serializeProps(props: Record<string, unknown>): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'function') continue;
    if (v == null) continue;
    if (typeof v === 'object') {
      try {
        out[`data-${k}`] = JSON.stringify(v);
      } catch {
        /* skip */
      }
      continue;
    }
    out[`data-${k}`] = v as string | number | boolean;
  }
  return out;
}
