// Declared vehicles (common/declaredVehicles.ts): `node --test tests/` (Node 22.18+ strips the TypeScript types).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DECLARED_VEHICLES_METADATA,
  claimDeclaredVehicle,
  convertDeclaredVehicles,
} from '../common/declaredVehicles.ts';

const bike = {
  name: 'Avarus Survivor',
  make: 'LCC',
  class: 8,
  type: 'bike',
  category: 'land',
  seats: 1,
  doors: 1,
  price: 23028,
  acceleration: 0.27,
  braking: 1,
  handling: 0.65,
  speed: 44.1369,
  traction: 1.85,
};

test('metadata name', () => {
  assert.equal(DECLARED_VEHICLES_METADATA, 'hrp_vehicle_data');
});

test('a valid entry is kept as declared', () => {
  const { vehicles, problems } = convertDeclaredVehicles('res', { avarusw: bike });
  assert.deepEqual(problems, []);
  assert.deepEqual(vehicles.avarusw, bike);
});

test('stats and make are optional', () => {
  const { name, class: cls, type, category, seats, doors, price } = bike;
  const { vehicles, problems } = convertDeclaredVehicles('res', {
    mini: { name, class: cls, type, category, seats, doors, price },
  });
  assert.deepEqual(problems, []);
  assert.equal(vehicles.mini.make, '');
  for (const stat of ['acceleration', 'braking', 'handling', 'speed', 'traction']) assert.equal(vehicles.mini[stat], 0);
});

test('extra fields and weapons pass through', () => {
  const { vehicles, problems } = convertDeclaredVehicles('res', { exting: { ...bike, weapons: true, custom: 'x' } });
  assert.deepEqual(problems, []);
  assert.equal(vehicles.exting.weapons, true);
  assert.equal(vehicles.exting.custom, 'x');
});

test('the file must be an object', () => {
  for (const decoded of [null, [], 'x', 3]) {
    const { vehicles, problems } = convertDeclaredVehicles('res', decoded);
    assert.deepEqual(vehicles, {});
    assert.equal(problems.length, 1);
  }
});

test('invalid model names are refused', () => {
  const { vehicles, problems } = convertDeclaredVehicles('res', { 'Bad-Name': bike, ok_1: bike });
  assert.deepEqual(Object.keys(vehicles), ['ok_1']);
  assert.match(problems[0], /Bad-Name/);
});

test('each invalid field is reported, the entry is refused', () => {
  const { vehicles, problems } = convertDeclaredVehicles('res', {
    broken: { ...bike, name: '', class: 30, type: 'hovercraft', category: 'space', seats: -1, doors: 1.5, price: 'free', speed: -2, weapons: 1 },
    not_object: 'car',
  });
  assert.deepEqual(vehicles, {});
  assert.equal(problems.length, 2);
  for (const field of ['name', 'class', 'type', 'category', 'seats', 'doors', 'price', 'speed', 'weapons'])
    assert.match(problems[0], new RegExp(`\`${field}\``));
  assert.match(problems[1], /not_object.*must be an object/);
});

test('base models and models of another resource are refused', () => {
  const owners = new Map([['busw', 'first']]);
  assert.match(claimDeclaredVehicle(owners, true, 'res', 'avarus'), /base model/);
  assert.match(claimDeclaredVehicle(owners, false, 'second', 'busw'), /already declared by first/);
  assert.equal(claimDeclaredVehicle(owners, false, 'first', 'busw'), undefined);
  assert.equal(claimDeclaredVehicle(owners, false, 'res', 'newcar'), undefined);
});
