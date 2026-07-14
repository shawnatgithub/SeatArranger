// M5-2: CanvasStage 快照测试 — 断言 4 个 Layer 存在
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

// Mock react-konva → 输出 data-name Div，避免 jsdom 里 Konva 依赖真实 canvas
vi.mock('react-konva', () => {
  const R = require('react') as typeof import('react');
  const Stage = ({ children, ...rest }: React.PropsWithChildren<Record<string, unknown>>) =>
    R.createElement('div', { 'data-testid': 'stage', ...rest }, children);
  const Layer = ({ name, children, ...rest }: React.PropsWithChildren<{ name?: string }>) =>
    R.createElement('div', { 'data-layer': name ?? '', ...rest }, children);
  return { Stage, Layer };
});

import { CanvasStage } from '../CanvasStage';

describe('CanvasStage', () => {
  it('renders 4 layers: grid/venue/furniture/overlay', () => {
    const { container } = render(<CanvasStage />);
    const layers = container.querySelectorAll('[data-layer]');
    expect(layers.length).toBe(4);
    const names = Array.from(layers).map((l) => (l as HTMLElement).dataset.layer);
    expect(names).toEqual(['grid', 'venue', 'furniture', 'overlay']);
  });
});
