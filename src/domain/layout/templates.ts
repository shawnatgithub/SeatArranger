// 预置模板 — 小/中/大三种会议室尺寸
import type { Venue } from '@/types';

export type TemplateKey = 'small' | 'medium' | 'large';

export function createVenueFromTemplate(key: TemplateKey): Venue {
  switch (key) {
    case 'small':
      return {
        id: `venue-${Date.now()}`,
        name: '小型会议室',
        width: 8,
        height: 6,
        scale: 50,
        elements: [],
        tables: [],
      };
    case 'medium':
      return {
        id: `venue-${Date.now()}`,
        name: '中型会议室',
        width: 15,
        height: 10,
        scale: 50,
        elements: [
          {
            id: 'screen-1',
            type: 'screen',
            x: 6.25,
            y: 0,
            width: 2.5,
            height: 0.05,
            rotation: 0,
            locked: true,
          },
        ],
        tables: [],
      };
    case 'large':
      return {
        id: `venue-${Date.now()}`,
        name: '大型会议室',
        width: 25,
        height: 18,
        scale: 40,
        elements: [
          {
            id: 'stage-1',
            type: 'stage',
            x: 10,
            y: 0,
            width: 5,
            height: 0.05,
            rotation: 0,
            locked: true,
          },
        ],
        tables: [],
      };
    default:
      throw new Error(`Unknown template: ${key}`);
  }
}
