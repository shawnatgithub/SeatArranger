// M1-1 & M1-2: 坐标转换测试 — Red first
import { describe, it, expect } from 'vitest';
import {
  SCALE_DEFAULT,
  metersToPixels,
  pixelsToMeters,
  konvaToMeters,
  metersToKonva,
  slotToGlobal,
} from '../coord';

describe('coord: meters <-> pixels', () => {
  it('scale=50: 3.5m -> 175px', () => {
    expect(metersToPixels(3.5, 50)).toBe(175);
  });

  it('default scale converts pixels back to meters', () => {
    const px = metersToPixels(3.5, SCALE_DEFAULT);
    expect(pixelsToMeters(px, SCALE_DEFAULT)).toBeCloseTo(3.5, 6);
  });

  it('konvaToMeters compensates stagePos + stageScale', () => {
    const meters = konvaToMeters(275, 175, 2, { x: 25, y: 25 }, 50);
    // (275 - 25) / 2 = 125 px real; / 50 = 2.5 m
    expect(meters.x).toBeCloseTo(2.5, 6);
    expect(meters.y).toBeCloseTo(1.5, 6);
  });

  it('metersToKonva is inverse of konvaToMeters', () => {
    const stagePos = { x: 25, y: 25 };
    const meters = { x: 2.5, y: 1.5 };
    const konva = metersToKonva(meters.x, meters.y, 2, stagePos, 50);
    const roundtrip = konvaToMeters(konva.x, konva.y, 2, stagePos, 50);
    expect(roundtrip.x).toBeCloseTo(meters.x, 6);
    expect(roundtrip.y).toBeCloseTo(meters.y, 6);
  });
});

describe('coord: slotToGlobal (rotation)', () => {
  const baseTable = {
    x: 5,
    y: 5,
    rotation: 0,
  };

  it('rotation=0 returns local offset + table position', () => {
    const g = slotToGlobal({ localX: 1, localY: 0, angle: 0 }, baseTable);
    expect(g.x).toBeCloseTo(6, 6);
    expect(g.y).toBeCloseTo(5, 6);
    expect(g.angle).toBe(0);
  });

  it('rotation=90 rotates (1,0) to (0,1)', () => {
    const g = slotToGlobal({ localX: 1, localY: 0, angle: 0 }, { ...baseTable, rotation: 90 });
    expect(g.x).toBeCloseTo(5, 6);
    expect(g.y).toBeCloseTo(6, 6);
    expect(g.angle).toBe(90);
  });

  it('rotation=180 flips signs', () => {
    const g = slotToGlobal({ localX: 1, localY: 0, angle: 0 }, { ...baseTable, rotation: 180 });
    expect(g.x).toBeCloseTo(4, 6);
    expect(g.y).toBeCloseTo(5, 6);
    expect(g.angle).toBe(180);
  });

  it('rotation=45 uses trigonometry', () => {
    const g = slotToGlobal({ localX: 1, localY: 0, angle: 0 }, { ...baseTable, rotation: 45 });
    const half = Math.SQRT1_2; // ≈ 0.7071
    expect(g.x).toBeCloseTo(5 + half, 6);
    expect(g.y).toBeCloseTo(5 + half, 6);
    expect(g.angle).toBe(45);
  });
});
