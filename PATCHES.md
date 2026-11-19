# Patches

Upstream: https://github.com/CommunityOx/ox_core (main)

Fork of CommunityOx/ox_core for the core of Heritage-RP/PRODUCTION-SERVER. Every patch is generic: a server sets its own
values through convars or other resources (Heritage-RP/PRODUCTION-SERVER docs/dev/forks.md).

| Patch | Kind | Upstream | Files |
|---|---|---|---|
| Declared vehicles: a resource that streams addon vehicles names its vehicle data file in its fxmanifest (`hrp_vehicle_data 'vehicle-data.json'`, same fields as `common/data/vehicles.json`), merged on both sides at start and on every resource start, so `/car` and `CreateVehicle` accept those models; a base model or a model another resource declared is never replaced | generic | candidate | `common/declaredVehicles.ts`, `common/vehicles.ts`, `tests/declaredVehicles.test.mjs` |
| Documentation of the fork | generic | no | `PATCHES.md` |
