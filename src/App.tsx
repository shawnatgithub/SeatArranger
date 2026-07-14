import { useEffect, useState } from 'react';
import { Card, Space, Typography, Divider, Button, message } from 'antd';
import { AppShell } from './app/AppShell';
import { CanvasStage } from './app/CanvasStage';
import { useHotkeys } from './app/useHotkeys';
import { useVenueStore } from './stores/venue';
import { useGuestStore } from './stores/guest';
import { useUiStore } from './stores/ui';
import { attachPersistence, restoreFromStorage } from './stores/persistence';
import { GridLayer } from './features/venue/GridLayer';
import { RoomRect } from './features/venue/RoomRect';
import { VenueElementShape } from './features/venue/VenueElementShape';
import { TableShape } from './features/tables/TableShape';
import { ChairShape } from './features/tables/ChairShape';
import { AutoLayoutPanel } from './features/tables/AutoLayoutPanel';
import { GuestList } from './features/guests/GuestList';
import { LoadDemoDataButton } from './features/guests/LoadDemoDataButton';
import { RelationModal } from './features/guests/RelationModal';
import { RuleScenePanel } from './features/seating/RuleScenePanel';
import { SmartSeatingButton } from './features/seating/SmartSeatingButton';
import { ConflictList } from './features/seating/ConflictList';
import { PreviewToolbar, ScanSeatFinder } from './features/export/PreviewTools';

export default function App() {
  useHotkeys();
  const currentStep = useUiStore((s) => s.currentStep);
  const loadTemplate = useVenueStore((s) => s.loadTemplate);
  const venue = useVenueStore((s) => s.venue);
  const guests = useGuestStore((s) => s.guests);
  const [relationOpen, setRelationOpen] = useState(false);

  // M11-2: 首次挂载恢复 + 订阅持久化
  useEffect(() => {
    const restored = restoreFromStorage();
    if (!restored && useVenueStore.getState().venue.elements.length === 0) {
      loadTemplate('medium');
    }
    const detach = attachPersistence({
      onError: (err) => {
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          message.warning('本地存储空间不足，已跳过自动保存');
        }
      },
    });
    return detach;
  }, [loadTemplate]);

  // 左侧栏：按步骤切换
  const left = (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Typography.Text strong>步骤 {currentStep} / 5</Typography.Text>
      <LoadDemoDataButton />
      <Divider style={{ margin: '8px 0' }} />
      {currentStep === 1 && (
        <>
          <Button block onClick={() => loadTemplate('small')}>加载小型模板</Button>
          <Button block onClick={() => loadTemplate('medium')}>加载中型模板</Button>
          <Button block onClick={() => loadTemplate('large')}>加载大型模板</Button>
        </>
      )}
      {currentStep === 2 && <AutoLayoutPanel />}
      {currentStep === 3 && (
        <>
          <GuestList />
          <Button block onClick={() => setRelationOpen(true)} data-testid="open-relation-btn">
            设置关系
          </Button>
        </>
      )}
      {currentStep === 4 && (
        <>
          <RuleScenePanel />
          <SmartSeatingButton />
        </>
      )}
      {currentStep === 5 && (
        <>
          <PreviewToolbar />
          <ScanSeatFinder />
        </>
      )}
    </Space>
  );

  const right = (
    <Space direction="vertical" style={{ width: '100%' }}>
      {currentStep === 3 && (
        <RelationModal
          open={relationOpen}
          anchorGuest={guests[0]}
          onClose={() => setRelationOpen(false)}
        />
      )}
      {currentStep === 4 && <ConflictList />}
      {currentStep === 5 && (
        <Card size="small" title="导出说明">
          <Typography.Text type="secondary">
            在左侧使用「预览模式」开关隐藏网格与辅助层，随后点击「导出 PNG / 名单」保存。
          </Typography.Text>
        </Card>
      )}
      {currentStep < 3 && <Typography.Text type="secondary">操作面板占位</Typography.Text>}
    </Space>
  );

  return (
    <AppShell
      left={left}
      center={
        <div style={{ overflow: 'auto', height: '100%', display: 'flex', alignItems: 'flex-start' }}>
          <CanvasStage>
            {{
              grid: <GridLayer />,
              venue: (
                <>
                  <RoomRect />
                  {venue.elements.map((el) => (
                    <VenueElementShape key={el.id} element={el} />
                  ))}
                </>
              ),
              furniture: (
                <>
                  {venue.tables.map((t) => (
                    <TableShape key={t.id} table={t} scale={venue.scale} />
                  ))}
                  {venue.tables.flatMap((t) =>
                    t.seatSlots.map((slot) => (
                      <ChairShape
                        key={`${t.id}-${slot.id}`}
                        table={t}
                        slot={slot}
                        scale={venue.scale}
                        occupied={Boolean(slot.occupantId)}
                      />
                    )),
                  )}
                </>
              ),
            }}
          </CanvasStage>
        </div>
      }
      right={right}
    />
  );
}
