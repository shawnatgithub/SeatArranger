// M11-3: 加载演示数据按钮
import { Button } from 'antd';
import { loadDemoData } from '@/lib/demoData';

export function LoadDemoDataButton() {
  const handleClick = () => {
    loadDemoData();
  };
  return (
    <Button onClick={handleClick} type="dashed" data-testid="load-demo-btn">
      加载演示数据
    </Button>
  );
}
