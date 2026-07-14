// M9-2: SmartSeatingButton 测试
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SmartSeatingButton } from '../SmartSeatingButton';
import { useGuestStore, resetGuestStore } from '@/stores/guest';
import { useVenueStore, resetVenueStore } from '@/stores/venue';
import type { Guest } from '@/types';

const g = (id: string, name: string): Guest => ({
  id,
  name,
  tags: [],
  seatPinned: false,
  satisfaction: 'high',
});

describe('SmartSeatingButton', () => {
  beforeEach(() => {
    resetGuestStore();
    resetVenueStore();
    useVenueStore.setState((s) => {
      s.venue.width = 15;
      s.venue.height = 10;
    });
    useVenueStore.getState().runAutoLayout(6, 'report');
    useGuestStore.setState({ guests: [g('1', 'A'), g('2', 'B'), g('3', 'C')] });
  });

  it('渲染按钮', () => {
    render(<SmartSeatingButton />);
    expect(screen.getByText('一键智能排座')).toBeInTheDocument();
  });

  it('点击触发 autoAssignSeats 并显示进度', async () => {
    render(<SmartSeatingButton />);
    fireEvent.click(screen.getByLabelText('smart-seating'));
    // 进度条应在 setTimeout(50ms) 前已显示
    expect(screen.getByTestId('seating-progress')).toBeInTheDocument();
    // 真实延时等待自动完成（总时长 50ms + 400ms + buffer）
    await waitFor(
      () => {
        const state = useGuestStore.getState();
        expect(state.guests.some((x) => x.tableId) || state.unassignedIds.length > 0).toBe(true);
      },
      { timeout: 2000 },
    );
  });
});
