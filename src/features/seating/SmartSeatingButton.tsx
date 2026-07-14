// M9-2: SmartSeatingButton — 一键智能排座 + 进度动画
import { Button, Progress, Space, message } from 'antd';
import { useState } from 'react';
import { useGuestStore } from '@/stores/guest';

export function SmartSeatingButton() {
  const autoAssignSeats = useGuestStore((s) => s.autoAssignSeats);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = () => {
    setRunning(true);
    setProgress(10);
    // 进度动画（≤3s 内推进到 90%），排座完成后跳到 100%
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(90, 10 + Math.floor(elapsed / 30)));
    }, 100);
    // 用 setTimeout 让浏览器有机会渲染进度
    window.setTimeout(() => {
      const result = autoAssignSeats();
      window.clearInterval(timer);
      setProgress(100);
      message.success(`排座完成：已分配 ${result.assigned} 人，未分配 ${result.unassigned} 人`);
      window.setTimeout(() => {
        setRunning(false);
        setProgress(0);
      }, 400);
    }, 50);
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Button
        type="primary"
        block
        onClick={handleClick}
        loading={running}
        aria-label="smart-seating"
      >
        一键智能排座
      </Button>
      {running && <Progress percent={progress} size="small" data-testid="seating-progress" />}
    </Space>
  );
}
