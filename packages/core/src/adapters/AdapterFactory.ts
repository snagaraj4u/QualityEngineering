import { BaseAdapter } from './BaseAdapter';
import { AdapterConfig } from './types';
import { AdapterRegistry } from './AdapterRegistry';

export class AdapterFactory {
  static create(frameworkName: string, config: AdapterConfig): BaseAdapter {
    const adapterClass = AdapterRegistry.get(frameworkName);

    if (!adapterClass) {
      throw new Error(
        `Unknown framework: ${frameworkName}. Supported frameworks: ${AdapterFactory.getSupportedFrameworks().join(', ')}`
      );
    }

    return new adapterClass(config);
  }

  static isSupported(frameworkName: string): boolean {
    return AdapterRegistry.has(frameworkName);
  }

  static getSupportedFrameworks(): string[] {
    return Array.from(AdapterRegistry.getAll().keys());
  }
}
