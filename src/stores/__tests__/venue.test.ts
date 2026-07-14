// M4-1: Venue Store 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { useVenueStore, resetVenueStore } from '../venue';
import type { VenueElement, Table } from '@/types';

const makeEl = (id: string, overrides: Partial<VenueElement> = {}): VenueElement => ({
  id,
  type: 'door',
  x: 1,
  y: 0,
  width: 0.9,
  height: 0.05,
  rotation: 0,
  locked: false,
  ...overrides,
});

const makeTable = (id: string, overrides: Partial<Table> = {}): Table => ({
  id,
  type: 'conference-long',
  x: 5,
  y: 5,
  width: 2,
  height: 1,
  rotation: 0,
  tableNumber: id,
  capacity: 6,
  seatSlots: [],
  locked: false,
  ...overrides,
});

describe('useVenueStore', () => {
  beforeEach(() => resetVenueStore());

  it('addElement / updateElement / removeElement', () => {
    const store = useVenueStore.getState();
    store.addElement(makeEl('e1'));
    expect(useVenueStore.getState().venue.elements.length).toBe(1);
    store.updateElement('e1', { x: 3 });
    expect(useVenueStore.getState().venue.elements[0].x).toBe(3);
    store.removeElement('e1');
    expect(useVenueStore.getState().venue.elements.length).toBe(0);
  });

  it('toggleElementLock flips locked flag', () => {
    const store = useVenueStore.getState();
    store.addElement(makeEl('e1'));
    store.toggleElementLock('e1');
    expect(useVenueStore.getState().venue.elements[0].locked).toBe(true);
    store.toggleElementLock('e1');
    expect(useVenueStore.getState().venue.elements[0].locked).toBe(false);
  });

  it('addTable / removeTable / toggleTableLock', () => {
    const store = useVenueStore.getState();
    store.addTable(makeTable('t1'));
    expect(useVenueStore.getState().venue.tables.length).toBe(1);
    store.toggleTableLock('t1');
    expect(useVenueStore.getState().venue.tables[0].locked).toBe(true);
    store.removeTable('t1');
    expect(useVenueStore.getState().venue.tables.length).toBe(0);
  });

  it('loadTemplate("medium") sets 15×10 venue with locked screen', () => {
    useVenueStore.getState().loadTemplate('medium');
    const v = useVenueStore.getState().venue;
    expect(v.width).toBe(15);
    expect(v.height).toBe(10);
    expect(v.elements.some((e) => e.type === 'screen' && e.locked)).toBe(true);
  });

  it('runAutoLayout populates tables', () => {
    useVenueStore.getState().loadTemplate('medium');
    useVenueStore.getState().runAutoLayout(40, 'training');
    const tables = useVenueStore.getState().venue.tables;
    expect(tables.length).toBeGreaterThan(4);
  });

  it('clearTables empties tables list', () => {
    useVenueStore.getState().addTable(makeTable('t1'));
    useVenueStore.getState().clearTables();
    expect(useVenueStore.getState().venue.tables.length).toBe(0);
  });
});
