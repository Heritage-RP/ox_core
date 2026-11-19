/**
 * Vehicles declared by other resources (Heritage-RP, generic patch: see PATCHES.md).
 *
 * `common/data/vehicles.json` keeps the base game models. A resource that streams its own models (addon vehicles)
 * describes them in a JSON file of its own and names that file in its fxmanifest:
 *
 *     hrp_vehicle_data 'vehicle-data.json'
 *     files { 'vehicle-data.json' }   -- the client reads the file too
 *
 *     {
 *       "mycar": {
 *         "name": "My Car", "make": "Maker", "class": 8, "type": "bike", "category": "land",
 *         "seats": 2, "doors": 1, "price": 20000,
 *         "acceleration": 0.3, "braking": 1, "handling": 0.7, "speed": 40, "traction": 2
 *       }
 *     }
 *
 * Each entry takes the fields of `common/data/vehicles.json` (the stats are optional and default to 0). A declared
 * model never replaces a base model nor a model another resource declared first.
 *
 * This file has no FiveM call: `common/vehicles.ts` reads the resources and hands their decoded files to it.
 */
import type { VehicleData } from 'types';

/** fxmanifest metadata naming the vehicle data file(s) of a resource. */
export const DECLARED_VEHICLES_METADATA = 'hrp_vehicle_data';

const MODEL_NAME = /^[a-z0-9_]+$/;
const MAX_CLASS = 22;

const TYPES = new Set([
  'amphibious_automobile',
  'amphibious_quadbike',
  'automobile',
  'bicycle',
  'bike',
  'blimp',
  'boat',
  'heli',
  'plane',
  'quadbike',
  'submarine',
  'submarinecar',
  'trailer',
  'train',
]);

const CATEGORIES = new Set(['air', 'land', 'sea']);
const COUNT_FIELDS = ['doors', 'seats'] as const;
const STAT_FIELDS = ['acceleration', 'braking', 'handling', 'speed', 'traction'] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const isCount = (value: unknown) => Number.isInteger(value) && (value as number) >= 0;
const isAmount = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

function checkEntry(entry: Record<string, unknown>) {
  const errors: string[] = [];

  if (typeof entry.name !== 'string' || !entry.name) errors.push('`name` must be a non-empty string');
  if (entry.make !== undefined && typeof entry.make !== 'string') errors.push('`make` must be a string');
  if (!isCount(entry.class) || (entry.class as number) > MAX_CLASS)
    errors.push(`\`class\` must be a vehicle class (0-${MAX_CLASS})`);
  if (!TYPES.has(entry.type as string)) errors.push(`\`type\` must be one of ${[...TYPES].join(', ')}`);
  if (!CATEGORIES.has(entry.category as string)) errors.push('`category` must be air, land or sea');
  if (!isAmount(entry.price)) errors.push('`price` must be a number >= 0');

  for (const field of COUNT_FIELDS) {
    if (!isCount(entry[field])) errors.push(`\`${field}\` must be an integer >= 0`);
  }

  for (const field of STAT_FIELDS) {
    if (entry[field] !== undefined && !isAmount(entry[field])) errors.push(`\`${field}\` must be a number >= 0`);
  }

  if (entry.weapons !== undefined && entry.weapons !== true) errors.push('`weapons` must be true when present');

  return errors;
}

/** Checks a decoded declaration file: the valid vehicles, and one problem per refused entry. */
export function convertDeclaredVehicles(resource: string, decoded: unknown) {
  const vehicles: Record<string, VehicleData> = {};
  const problems: string[] = [];

  if (!isObject(decoded)) {
    problems.push(`${resource}: the file must be an object keyed by model name`);
    return { vehicles, problems };
  }

  for (const [model, entry] of Object.entries(decoded)) {
    const where = `${resource}: vehicle "${model}"`;

    if (!MODEL_NAME.test(model)) {
      problems.push(`${where}: the model name must be lower case letters, digits or _`);
      continue;
    }

    if (!isObject(entry)) {
      problems.push(`${where}: must be an object`);
      continue;
    }

    const errors = checkEntry(entry);

    if (errors.length) {
      problems.push(`${where}: ${errors.join(', ')}`);
      continue;
    }

    const stats = Object.fromEntries(STAT_FIELDS.map((field) => [field, (entry[field] as number) ?? 0]));

    vehicles[model] = { ...entry, ...stats, make: (entry.make as string) ?? '' } as VehicleData;
  }

  return { vehicles, problems };
}

/**
 * Whether `resource` may declare `model`: a base model and a model another resource declared stay as they are.
 * Returns the reason of a refusal, nothing when allowed.
 */
export function claimDeclaredVehicle(
  owners: Map<string, string>,
  isBaseModel: boolean,
  resource: string,
  model: string,
): string | undefined {
  if (isBaseModel) return `${resource}: vehicle "${model}" is a base model of common/data/vehicles.json`;

  const owner = owners.get(model);

  if (owner && owner !== resource) return `${resource}: vehicle "${model}" is already declared by ${owner}`;
}
