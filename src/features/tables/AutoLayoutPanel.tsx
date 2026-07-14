// M7-3: AutoLayoutPanel — 人数 + 会议类型 + 一键生成
import { Button, InputNumber, Select, Space } from 'antd';
import { useState } from 'react';
import type { MeetingType } from '@/types';
import { useVenueStore } from '@/stores/venue';

const MEETING_OPTIONS: { label: string; value: MeetingType }[] = [
  { label: '汇报会', value: 'report' },
  { label: '培训会', value: 'training' },
  { label: '谈判会', value: 'negotiation' },
  { label: '圆桌会', value: 'round-table' },
];

export interface AutoLayoutPanelProps {
  defaultHeadcount?: number;
  defaultMeetingType?: MeetingType;
}

export function AutoLayoutPanel({
  defaultHeadcount = 20,
  defaultMeetingType = 'report',
}: AutoLayoutPanelProps) {
  const [headcount, setHeadcount] = useState<number>(defaultHeadcount);
  const [meetingType, setMeetingType] = useState<MeetingType>(defaultMeetingType);
  const runAutoLayout = useVenueStore((s) => s.runAutoLayout);

  const handleGenerate = () => {
    if (headcount <= 0) return;
    runAutoLayout(headcount, meetingType);
  };

  return (
    <div data-testid="auto-layout-panel">
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>
          <label htmlFor="al-headcount">人数：</label>
          <InputNumber
            id="al-headcount"
            aria-label="headcount"
            min={1}
            max={200}
            value={headcount}
            onChange={(v) => setHeadcount(Number(v ?? 0))}
            style={{ width: 120 }}
          />
        </div>
        <div>
          <label htmlFor="al-meeting-type">会议类型：</label>
          <Select
            id="al-meeting-type"
            aria-label="meeting-type"
            value={meetingType}
            onChange={(v) => setMeetingType(v)}
            options={MEETING_OPTIONS}
            style={{ width: 160 }}
          />
        </div>
        <Button type="primary" onClick={handleGenerate}>
          一键生成布局
        </Button>
      </Space>
    </div>
  );
}
