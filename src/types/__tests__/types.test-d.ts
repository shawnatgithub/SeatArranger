// M0-6: 类型层测试 — 使用 vitest 的 expectTypeOf 验证必需字段
import { expectTypeOf, describe, it } from 'vitest';
import type {
  Venue,
  VenueElement,
  Table,
  SeatSlot,
  Guest,
  GuestRelation,
  Constraint,
  Command,
} from '../index';

describe('types shape', () => {
  it('Venue has required fields', () => {
    expectTypeOf<Venue>().toHaveProperty('id').toBeString();
    expectTypeOf<Venue>().toHaveProperty('width').toBeNumber();
    expectTypeOf<Venue>().toHaveProperty('elements').toEqualTypeOf<VenueElement[]>();
    expectTypeOf<Venue>().toHaveProperty('tables').toEqualTypeOf<Table[]>();
  });

  it('Table has capacity + seatSlots', () => {
    expectTypeOf<Table>().toHaveProperty('capacity').toBeNumber();
    expectTypeOf<Table>().toHaveProperty('seatSlots').toEqualTypeOf<SeatSlot[]>();
  });

  it('SeatSlot has local coordinates', () => {
    expectTypeOf<SeatSlot>().toHaveProperty('localX').toBeNumber();
    expectTypeOf<SeatSlot>().toHaveProperty('localY').toBeNumber();
    expectTypeOf<SeatSlot>().toHaveProperty('isFreeFloating').toBeBoolean();
  });

  it('Guest carries tags and seat binding', () => {
    expectTypeOf<Guest>().toHaveProperty('name').toBeString();
    expectTypeOf<Guest>().toHaveProperty('seatPinned').toBeBoolean();
  });

  it('GuestRelation and Constraint exist', () => {
    expectTypeOf<GuestRelation>().toHaveProperty('type').toBeString();
    expectTypeOf<Constraint>().toHaveProperty('rule').toBeObject();
  });

  it('Command interface has execute/undo', () => {
    expectTypeOf<Command>().toHaveProperty('execute').toBeFunction();
    expectTypeOf<Command>().toHaveProperty('undo').toBeFunction();
  });
});
