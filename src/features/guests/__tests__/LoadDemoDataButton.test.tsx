// M11-3: 演示数据加载测试
import { beforeEach, describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { loadDemoData } from '@/lib/demoData';
import { LoadDemoDataButton } from '../LoadDemoDataButton';
import { useVenueStore } from '@/stores/venue';
import { useGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';

describe('loadDemoData', () => {
  beforeEach(() => {
    useGuestStore.setState({ guests: [], relations: [], ruleScene: 'corporate', unassignedIds: [] });
    useUiStore.setState({ currentStep: 1 });
  });

  it('加载中型模板 + 20 人 + 4 组关系 + 跳到步骤 2', () => {
    const r = loadDemoData();
    expect(r.guestsCount).toBe(20);
    expect(r.relationsCount).toBe(4);
    expect(useVenueStore.getState().venue.name).toBe('中型会议室');
    expect(useVenueStore.getState().venue.width).toBe(15);
    expect(useGuestStore.getState().guests.length).toBe(20);
    expect(useGuestStore.getState().relations.length).toBe(4);
    expect(useUiStore.getState().currentStep).toBe(2);
  });

  it('包含至少一位 VIP 与 host', () => {
    loadDemoData();
    const guests = useGuestStore.getState().guests;
    expect(guests.some((g) => g.tags.includes('vip'))).toBe(true);
    expect(guests.some((g) => g.tags.includes('host'))).toBe(true);
  });
});

describe('LoadDemoDataButton', () => {
  beforeEach(() => {
    useGuestStore.setState({ guests: [], relations: [], ruleScene: 'corporate', unassignedIds: [] });
    useUiStore.setState({ currentStep: 1 });
  });

  it('点击按钮触发加载', () => {
    const { getByTestId } = render(<LoadDemoDataButton />);
    fireEvent.click(getByTestId('load-demo-btn'));
    expect(useGuestStore.getState().guests.length).toBe(20);
    expect(useUiStore.getState().currentStep).toBe(2);
  });
});
