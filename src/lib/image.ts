// M10-2: exportStageToPNG — Konva stage → dataURL + 命名规则
import type Konva from 'konva';

export interface ExportOptions {
  pixelRatio?: number;
  fileName?: string;
}

/** 生成默认文件名：`智座平面图_YYYYMMDD_HHmm.png` */
export function makeStageFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `智座平面图_${y}${m}${d}_${hh}${mm}.png`;
}

/**
 * 将 Konva 舞台导出为 PNG dataURL。
 * @param stage Konva Stage 实例（或具备 toDataURL 接口的 mock）
 */
export function exportStageToPNG(
  stage: Pick<Konva.Stage, 'toDataURL'>,
  options: ExportOptions = {},
): { dataUrl: string; fileName: string } {
  const pixelRatio = options.pixelRatio ?? 2;
  const dataUrl = stage.toDataURL({ pixelRatio, mimeType: 'image/png' });
  const fileName = options.fileName ?? makeStageFileName();
  return { dataUrl, fileName };
}

/** 触发浏览器下载（生产环境使用；测试环境可通过 dataUrl 断言） */
export function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
