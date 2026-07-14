// M5-1: 应用外壳 — 顶部 Steps + 三栏布局
import { useMemo } from 'react';
import { Layout, Steps } from 'antd';
import { useUiStore, type StepId } from '@/stores/ui';

const { Header, Content, Sider } = Layout;

const STEP_LABELS = ['场地', '桌椅', '参会者', '规则', '预览'] as const;

export interface AppShellProps {
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
  footer?: React.ReactNode;
}

export function AppShell({ left, center, right, footer }: AppShellProps) {
  const currentStep = useUiStore((s) => s.currentStep);
  const setStep = useUiStore((s) => s.setStep);

  const items = useMemo(
    () => STEP_LABELS.map((title) => ({ title })),
    [],
  );

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div style={{ fontWeight: 600, marginRight: 32 }}>智座 · Demo</div>
        <div style={{ flex: 1 }}>
          <Steps
            size="small"
            current={currentStep - 1}
            items={items}
            onChange={(idx) => setStep(((idx + 1) as StepId))}
            style={{ maxWidth: 720 }}
          />
        </div>
      </Header>
      <Layout>
        <Sider width={260} style={{ background: '#fafafa', padding: 12 }}>
          {left}
        </Sider>
        <Content style={{ background: '#f5f7fa', position: 'relative' }}>{center}</Content>
        <Sider width={280} style={{ background: '#fafafa', padding: 12 }}>
          {right}
        </Sider>
      </Layout>
      {footer}
    </Layout>
  );
}

export default AppShell;
