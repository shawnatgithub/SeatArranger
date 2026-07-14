// M6-7: 锁定图标 — 悬浮 0.5s 浮现，1.5s 自动隐藏；点击 toggleLock
import { useEffect, useState } from 'react';
import { Circle, Group, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';

const HOVER_DELAY_MS = 500;
const AUTO_HIDE_MS = 1500;

export interface LockIconProps {
  x: number;
  y: number;
  locked: boolean;
  hovered: boolean;
  onToggle: () => void;
}

export function LockIcon({ x, y, locked, hovered, onToggle }: LockIconProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    const show = setTimeout(() => {
      setVisible(true);
      // 显示后 1.5s 自动隐藏（若仍未点击）
      const hide = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
      // 清理
      return () => clearTimeout(hide);
    }, HOVER_DELAY_MS);
    return () => clearTimeout(show);
  }, [hovered]);

  if (!visible) return null;

  const handleClick = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onToggle();
  };

  return (
    <Group name="lock-icon" x={x} y={y} onClick={handleClick} onTap={handleClick}>
      <Circle radius={10} fill="#fff" stroke={locked ? '#faad14' : '#8c8c8c'} strokeWidth={1.5} />
      <Text text={locked ? '🔒' : '🔓'} x={-6} y={-6} fontSize={10} />
    </Group>
  );
}
