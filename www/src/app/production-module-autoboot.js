import { bootProductionModuleRuntime } from "./production-module-entrypoint.js";

bootProductionModuleRuntime({ globalRef: globalThis });
