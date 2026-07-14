// M9-1: RuleScenePanel 测试
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RuleScenePanel } from '../RuleScenePanel';
import { useGuestStore, resetGuestStore } from '@/stores/guest';

describe('RuleScenePanel', () => {
  beforeEach(() => {
    resetGuestStore();
  });

  it('默认企业场景 + 文案', () => {
    render(<RuleScenePanel />);
    expect(screen.getByTestId('scene-desc').textContent).toContain('企业场景');
  });

  it('切换到政府场景后文案更新 + store 变更', () => {
    render(<RuleScenePanel />);
    fireEvent.click(screen.getByLabelText('政府'));
    expect(useGuestStore.getState().ruleScene).toBe('government');
    expect(screen.getByTestId('scene-desc').textContent).toContain('政府场景');
  });

  it('切换到通用场景', () => {
    render(<RuleScenePanel />);
    fireEvent.click(screen.getByLabelText('通用'));
    expect(useGuestStore.getState().ruleScene).toBe('general');
    expect(screen.getByTestId('scene-desc').textContent).toContain('通用场景');
  });
});
