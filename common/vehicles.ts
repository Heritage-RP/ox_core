import { LoadDataFile } from './';
import { DECLARED_VEHICLES_METADATA, claimDeclaredVehicle, convertDeclaredVehicles } from './declaredVehicles';
import type { Dict, VehicleCategories, VehicleData, VehicleStats, Vehicles } from 'types';

const vehicles: Dict<VehicleData> = LoadDataFile('vehicles');
const vehicleStats = LoadDataFile('vehicleStats');

const baseModels = new Set(Object.keys(vehicles));
const declaredBy = new Map<string, string>();

/** Adds the vehicles a resource declares (`hrp_vehicle_data` in its fxmanifest, see declaredVehicles.ts). */
function LoadDeclaredVehicles(resource: string) {
  const files = GetNumResourceMetadata(resource, DECLARED_VEHICLES_METADATA);

  if (!files) return;

  // A restarted resource declares its vehicles again: what it no longer lists goes away.
  for (const [model, owner] of declaredBy) {
    if (owner === resource) {
      delete vehicles[model];
      declaredBy.delete(model);
    }
  }

  for (let i = 0; i < files; i++) {
    const file = GetResourceMetadata(resource, DECLARED_VEHICLES_METADATA, i);
    const raw = file && LoadResourceFile(resource, file);
    let decoded: unknown;

    try {
      decoded = raw ? JSON.parse(raw) : undefined;
    } catch {
      console.error(`declared vehicles refused: ${resource}/${file} is not valid JSON`);
      continue;
    }

    if (decoded === undefined) {
      console.error(`declared vehicles refused: ${resource}/${file} not found (missing from its fxmanifest files?)`);
      continue;
    }

    const { vehicles: declared, problems } = convertDeclaredVehicles(resource, decoded);

    for (const [model, data] of Object.entries(declared)) {
      const refused = claimDeclaredVehicle(declaredBy, baseModels.has(model), resource, model);

      if (refused) {
        problems.push(refused);
        continue;
      }

      vehicles[model] = data;
      declaredBy.set(model, resource);
    }

    for (const problem of problems) console.error(`declared vehicle refused: ${problem}`);
  }
}

{
  // The server reads every resource it knows, started or not, so a vehicle exists before its resource starts. The
  // client only reads the resources it runs (their files).
  const isServer = IsDuplicityVersion();
  const self = GetCurrentResourceName();

  for (let i = 0; i < GetNumResources(); i++) {
    const resource = GetResourceByFindIndex(i);

    if (resource && resource !== self && (isServer || GetResourceState(resource) === 'started'))
      LoadDeclaredVehicles(resource);
  }

  on(isServer ? 'onResourceStart' : 'onClientResourceStart', (resource: string) => {
    if (resource !== self) LoadDeclaredVehicles(resource);
  });
}

export function GetTopVehicleStats(): Record<VehicleCategories, VehicleStats>;
export function GetTopVehicleStats(category: VehicleCategories): VehicleStats;

export function GetTopVehicleStats(category?: VehicleCategories) {
  return category ? (vehicleStats as any)[category] : vehicleStats;
}

export function GetVehicleData(): Vehicles;
export function GetVehicleData<T extends string>(filter: T): VehicleData;
export function GetVehicleData<T extends string[]>(
  filter: T,
): {
  [K in T[number]]: VehicleData; // this could be better
};

export function GetVehicleData(filter?: void | string | string[]) {
  if (!filter) return vehicles;

  if (typeof filter === 'string') return vehicles[filter];

  if (Array.isArray(filter)) {
    const obj: Record<string, any> = {};

    filter.forEach((name) => {
      const vehicle = vehicles[name];

      if (vehicle) obj[name] = vehicle;
    });

    return obj;
  }
}

/**
 * Remap vehicle types to their net types.
 * https://github.com/citizenfx/fivem/commit/1e266a2ca5c04eb96c090de67508a3475d35d6da
 */
export function GetVehicleNetworkType(modelName: string) {
  const vehicleType = vehicles[modelName]?.type;

  switch (vehicleType) {
    case 'bicycle':
      return 'bike';
    case 'blimp':
      return 'heli';
    case 'quadbike':
    case 'amphibious_quadbike':
    case 'amphibious_automobile':
    case 'submarinecar':
      return 'automobile';
    default:
      return vehicleType;
  }
}

exports('GetTopVehicleStats', GetTopVehicleStats);
exports('GetVehicleData', GetVehicleData);
exports('GetVehicleNetworkType', GetVehicleNetworkType);
