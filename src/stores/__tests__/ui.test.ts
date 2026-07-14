// M4-3: UI Store 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '../ui';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('has default step 1 and preview off', () => {
    const s = useUiStore.getState();
    expect(s.currentStep).toBe(1);
    expect(s.previewMode).toBe(false);
    expect(s.selectedId).toBeNull();
  });

  it('step navigation does not affect data (isolated concern)', () => {
    useUiStore.getState().setStep(3);
    expect(useUiStore.getState().currentStep).toBe(3);
    useUiStore.getState().setStep(1);
    expect(useUiStore.getState().currentStep).toBe(1);
  });

  it('toggle preview mode', () => {
    useUiStore.getState().setPreviewMode(true);
    expect(useUiStore.getState().previewMode).toBe(true);
  });

  it('rule scene switch', () => {
    useUiStore.getState().setRuleScene('government');
    expect(useUiStore.getState().ruleScene).toBe('government');
  });

  it('toggle grid & snap lines', () => {
    const before = useUiStore.getState().showGrid;
    useUiStore.getState().toggleGrid();
    expect(useUiStore.getState().showGrid).toBe(!before);
  });
});
