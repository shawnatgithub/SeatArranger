// M5-3: 全局键盘快捷键 hook
import { useEffect } from 'react';
import { useHistoryStore } from '@/stores/history';
import { useUiStore } from '@/stores/ui';
import { useVenueStore } from '@/stores/venue';

export interface HotkeyHandlers {
  /** 方向键微调：默认 0.1m */
  onNudge?: (dx: number, dy: number) => void;
  /** Delete 键 */
  onDelete?: (id: string | null) => void;
}

const NUDGE_STEP = 0.1;

/**
 * 绑定 Ctrl+Z / Ctrl+Y / Delete / 方向键 / Esc 到全局 store。
 * 传入的 handlers 可以覆盖默认行为。
 */
export function useHotkeys(handlers: HotkeyHandlers = {}): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      // 输入框中不劫持
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      // Undo / Redo
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) useHistoryStore.getState().redo();
        else useHistoryStore.getState().undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        useHistoryStore.getState().redo();
        return;
      }

      // Esc → 清空选中
      if (e.key === 'Escape') {
        useUiStore.getState().setSelectedId(null);
        return;
      }

      const selectedId = useUiStore.getState().selectedId;

      // Delete / Backspace → 删除当前选中
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        if (handlers.onDelete) {
          handlers.onDelete(selectedId);
        } else {
          // 默认：venue 元素或桌子
          const venue = useVenueStore.getState().venue;
          if (venue.elements.some((el) => el.id === selectedId)) {
            useVenueStore.getState().removeElement(selectedId);
          } else if (venue.tables.some((t) => t.id === selectedId)) {
            useVenueStore.getState().removeTable(selectedId);
          }
          useUiStore.getState().setSelectedId(null);
        }
        return;
      }

      // 方向键
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-NUDGE_STEP, 0],
        ArrowRight: [NUDGE_STEP, 0],
        ArrowUp: [0, -NUDGE_STEP],
        ArrowDown: [0, NUDGE_STEP],
      };
      const move = arrows[e.key];
      if (move && selectedId) {
        e.preventDefault();
        const [dx, dy] = move;
        if (handlers.onNudge) {
          handlers.onNudge(dx, dy);
        } else {
          const venue = useVenueStore.getState().venue;
          const el = venue.elements.find((x) => x.id === selectedId);
          const t = venue.tables.find((x) => x.id === selectedId);
          if (el) useVenueStore.getState().updateElement(selectedId, { x: el.x + dx, y: el.y + dy });
          else if (t) useVenueStore.getState().updateTable(selectedId, { x: t.x + dx, y: t.y + dy });
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
