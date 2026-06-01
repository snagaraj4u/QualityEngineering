import { BaseAdapter } from './BaseAdapter';
import { CucumberAdapter } from './CucumberAdapter';
import { AdapterConfig } from './types';

export class AdapterRegistry {
  private static adapters: Map<string, typeof BaseAdapter> = new Map();

  static {
    // Pre-register CucumberAdapter
    AdapterRegistry.register('Cucumber', CucumberAdapter);
  }

  static register(frameworkName: string, adapterClass: typeof BaseAdapter): void {
    AdapterRegistry.adapters.set(frameworkName, adapterClass);
  }

  static get(frameworkName: string): typeof BaseAdapter | undefined {
    return AdapterRegistry.adapters.get(frameworkName);
  }

  static getAll(): Map<string, typeof BaseAdapter> {
    return new Map(AdapterRegistry.adapters);
  }

  static has(frameworkName: string): boolean {
    return AdapterRegistry.adapters.has(frameworkName);
  }
}
