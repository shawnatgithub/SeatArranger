// M4-3: UI Store — currentStep / previewMode / selectedId
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type StepId = 1 | 2 | 3 | 4 | 5;

interface UiState {
  currentStep: StepId;
  previewMode: boolean;
  selectedId: string | null;
  ruleScene: 'corporate' | 'government' | 'general';
  showGrid: boolean;
  showSnapLines: boolean;

  setStep: (step: StepId) => void;
  setPreviewMode: (on: boolean) => void;
  setSelectedId: (id: string | null) => void;
  setRuleScene: (scene: UiState['ruleScene']) => void;
  toggleGrid: () => void;
  toggleSnapLines: () => void;
  reset: () => void;
}

const INITIAL: Omit<
  UiState,
  'setStep' | 'setPreviewMode' | 'setSelectedId' | 'setRuleScene' | 'toggleGrid' | 'toggleSnapLines' | 'reset'
> = {
  currentStep: 1,
  previewMode: false,
  selectedId: null,
  ruleScene: 'corporate',
  showGrid: true,
  showSnapLines: true,
};

export const useUiStore = create<UiState>()(
  immer((set) => ({
    ...INITIAL,
    setStep: (step) =>
      set((s) => {
        s.currentStep = step;
      }),
    setPreviewMode: (on) =>
      set((s) => {
        s.previewMode = on;
      }),
    setSelectedId: (id) =>
      set((s) => {
        s.selectedId = id;
      }),
    setRuleScene: (scene) =>
      set((s) => {
        s.ruleScene = scene;
      }),
    toggleGrid: () =>
      set((s) => {
        s.showGrid = !s.showGrid;
      }),
    toggleSnapLines: () =>
      set((s) => {
        s.showSnapLines = !s.showSnapLines;
      }),
    reset: () =>
      set((s) => {
        Object.assign(s, INITIAL);
      }),
  })),
);
