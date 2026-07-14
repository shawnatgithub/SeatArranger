// M10-2: exportStageToPNG + makeStageFileName
import { describe, expect, it, vi } from 'vitest';
import { exportStageToPNG, makeStageFileName } from '../image';

describe('makeStageFileName', () => {
  it('生成 智座平面图_YYYYMMDD_HHmm.png 格式', () => {
    const d = new Date(2025, 0, 15, 14, 30);
    expect(makeStageFileName(d)).toBe('智座平面图_20250115_1430.png');
  });

  it('补零处理个位月/日/时/分', () => {
    const d = new Date(2025, 8, 5, 3, 7);
    expect(makeStageFileName(d)).toBe('智座平面图_20250905_0307.png');
  });

  it('默认使用当前时间且文件名符合正则', () => {
    const name = makeStageFileName();
    expect(name).toMatch(/^智座平面图_\d{8}_\d{4}\.png$/);
  });
});

describe('exportStageToPNG', () => {
  it('调用 stage.toDataURL 使用 pixelRatio=2 与 image/png', () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,AAA');
    const { dataUrl, fileName } = exportStageToPNG({ toDataURL } as never);
    expect(toDataURL).toHaveBeenCalledWith({ pixelRatio: 2, mimeType: 'image/png' });
    expect(dataUrl).toBe('data:image/png;base64,AAA');
    expect(fileName).toMatch(/^智座平面图_\d{8}_\d{4}\.png$/);
  });

  it('支持自定义 pixelRatio 与 fileName', () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,BBB');
    const result = exportStageToPNG({ toDataURL } as never, {
      pixelRatio: 3,
      fileName: 'custom.png',
    });
    expect(toDataURL).toHaveBeenCalledWith({ pixelRatio: 3, mimeType: 'image/png' });
    expect(result.fileName).toBe('custom.png');
  });
});
