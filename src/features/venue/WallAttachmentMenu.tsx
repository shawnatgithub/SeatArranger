// M6-4 & M6-5 & M6-6: 墙面悬浮挂件菜单（增/减）
// 悬浮 0.5s 出现「+」→ 展开门/窗/屏；再点「-」进入删除待确认；3s 无操作收回。
import { useEffect, useRef, useState } from 'react';
import { Circle, Group, Text } from 'react-konva';
import type { VenueElement, VenueElementType } from '@/types';
import { metersToPixels } from '@/domain/geometry';
import { useVenueStore } from '@/stores/venue';

const HOVER_DELAY_MS = 500;
const AUTO_HIDE_MS = 3000;
const ATTACH_TYPES: VenueElementType[] = ['door', 'window', 'screen'];

export interface WallAttachmentMenuProps {
  wall: VenueElement;
  scale: number;
  hovered: boolean;
  /** 用于测试注入时钟 */
  now?: () => number;
}

export function WallAttachmentMenu({ wall, scale, hovered }: WallAttachmentMenuProps) {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deletingArmed, setDeletingArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addElement = useVenueStore((s) => s.addElement);
  const removeElement = useVenueStore((s) => s.removeElement);

  // 悬浮 0.5s → 显示菜单
  useEffect(() => {
    if (hovered) {
      timer.current = setTimeout(() => setVisible(true), HOVER_DELAY_MS);
    } else if (timer.current) {
      clearTimeout(timer.current);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [hovered]);

  // 展开后 3s 无操作自动收回
  useEffect(() => {
    if (visible && expanded) {
      hideTimer.current = setTimeout(() => {
        setExpanded(false);
        setVisible(false);
        setDeletingArmed(false);
      }, AUTO_HIDE_MS);
    }
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [visible, expanded]);

  if (!visible) return null;
  const cx = metersToPixels(wall.x + wall.width / 2, scale);
  const cy = metersToPixels(wall.y + wall.height / 2, scale);

  const handleAdd = (type: VenueElementType) => {
    addElement({
      id: `${type}-${Date.now()}`,
      type,
      x: wall.x,
      y: wall.y,
      width: 0.9,
      height: 0.1,
      rotation: 0,
      locked: false,
      attachedTo: wall.id,
    });
  };

  const handleMinus = () => {
    if (deletingArmed) {
      removeElement(wall.id);
      setDeletingArmed(false);
    } else {
      setDeletingArmed(true);
    }
  };

  return (
    <Group name="wall-attach-menu" x={cx} y={cy}>
      <Circle radius={12} fill={deletingArmed ? '#ff4d4f' : '#1677ff'} onClick={handleMinus} onTap={handleMinus} />
      <Text text={expanded ? '−' : '+'} fill="#fff" x={-4} y={-6} onClick={() => setExpanded((v) => !v)} onTap={() => setExpanded((v) => !v)} />
      {expanded &&
        ATTACH_TYPES.map((t, i) => (
          <Group key={t} x={20 + i * 26} y={0} onClick={() => handleAdd(t)} onTap={() => handleAdd(t)}>
            <Circle radius={10} fill="#fff" stroke="#1677ff" />
            <Text text={t[0].toUpperCase()} x={-4} y={-6} fill="#1677ff" />
          </Group>
        ))}
    </Group>
  );
}
