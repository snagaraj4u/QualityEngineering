import { BaseAdapter } from './BaseAdapter';
import { CucumberAdapter } from './CucumberAdapter';
import { AdapterConfig } from './types';

// Concrete (newable) adapter constructor. `typeof BaseAdapter` refers to the
// abstract class and cannot be instantiated, so the registry stores this
// instead to let AdapterFactory call `new adapterClass(config)`.
export type AdapterConstructor = new (config: AdapterConfig) => BaseAdapter;

export class AdapterRegistry {
  private static adapters: Map<string, AdapterConstructor> = new Map();

  static {
    // Pre-register CucumberAdapter
    AdapterRegistry.register('Cucumber', CucumberAdapter);
  }

  static register(frameworkName: string, adapterClass: AdapterConstructor): void {
    AdapterRegistry.adapters.set(frameworkName, adapterClass);
  }

  static get(frameworkName: string): AdapterConstructor | undefined {
    return AdapterRegistry.adapters.get(frameworkName);
  }

  static getAll(): Map<string, AdapterConstructor> {
    return new Map(AdapterRegistry.adapters);
  }

  static has(frameworkName: string): boolean {
    return AdapterRegistry.adapters.has(frameworkName);
  }
}
