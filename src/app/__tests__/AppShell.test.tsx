// M5-1: AppShell 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { AppShell } from '../AppShell';
import { useUiStore } from '@/stores/ui';

describe('AppShell', () => {
  beforeEach(() => useUiStore.getState().reset());

  it('renders steps and slots', () => {
    render(
      <ConfigProvider>
        <AppShell left={<div>LEFT</div>} center={<div>CENTER</div>} right={<div>RIGHT</div>} />
      </ConfigProvider>,
    );
    expect(screen.getByText('LEFT')).toBeInTheDocument();
    expect(screen.getByText('CENTER')).toBeInTheDocument();
    expect(screen.getByText('RIGHT')).toBeInTheDocument();
    // 5 步标签
    expect(screen.getByText('场地')).toBeInTheDocument();
    expect(screen.getByText('预览')).toBeInTheDocument();
  });

  it('clicking the 3rd step updates store.currentStep to 3', () => {
    render(
      <ConfigProvider>
        <AppShell />
      </ConfigProvider>,
    );
    // 点击「参会者」
    fireEvent.click(screen.getByText('参会者'));
    expect(useUiStore.getState().currentStep).toBe(3);
  });
});
