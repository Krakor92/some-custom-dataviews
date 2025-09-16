/**
 * Bases Plugin API Module
 * 
 * This module provides a type-safe interface to the Bases plugin,
 * encapsulating all interactions and reducing reliance on internal APIs.
 */

import { App } from 'obsidian';
import type { BasesDataItem, FormulaOutput } from '@/bases/types';

export interface BasesQuery {
  on?: (event: string, callback: () => void) => void;
  off?: (event: string, callback: () => void) => void;
  getViewConfig?: (key: string) => any;
  properties?: Record<string, any>;
}

export interface BasesController {
  runQuery?: () => Promise<void>;
  getViewConfig?: () => any;
  results?: Map<any, any>;
  query?: BasesQuery;
}

export interface BasesContainer {
  results?: Map<any, any>;
  query?: BasesQuery;
  viewContainerEl?: HTMLElement;
  controller?: BasesController;
  ctx?: {
    formulas?: Record<string, any>;
  };
}

export interface BasesViewRegistration {
  name: string;
  icon: string;
  factory: (container: BasesContainer) => any;
}

export interface BasesAPI {
  registrations: Record<string, BasesViewRegistration>;
  isEnabled: boolean;
  version?: string;
}

/**
 * Safely retrieves the Bases plugin API
 */
export function getBasesAPI(app: App): BasesAPI | null {
  try {
    // Try the correct path for Bases plugin (internal plugins)
    const internalPlugins = (app as any).internalPlugins;
    if (!internalPlugins) {
      console.debug('[Bases] Internal plugins manager not available');
      return null;
    }

    const basesPlugin = internalPlugins.getEnabledPluginById?.('bases');
    if (!basesPlugin) {
      console.debug('[Bases] Bases plugin not found or not enabled');
      return null;
    }

    // Check if the plugin has the expected API structure
    if (!basesPlugin.registrations || typeof basesPlugin.registrations !== 'object') {
      console.warn('[Bases] Bases plugin found but registrations API not available');
      return null;
    }

    return {
      registrations: basesPlugin.registrations,
      isEnabled: true,
      version: basesPlugin.manifest?.version || 'unknown'
    };
  } catch (error) {
    console.warn('[Bases] Error accessing Bases plugin API:', error);
    return null;
  }
}

/**
 * Check if Bases plugin is available and compatible
 */
export function isBasesPluginAvailable(app: App): boolean {
  const api = getBasesAPI(app);
  return api !== null && api.isEnabled;
}

/**
 * Safely register a view with the Bases plugin
 */
export function registerBasesView(
  app: App,
  viewId: string,
  registration: BasesViewRegistration
): boolean {
  const api = getBasesAPI(app);
  if (!api) {
    console.warn('[Bases] Cannot register view: Bases plugin not available');
    return false;
  }

  try {
    // Only register if it doesn't already exist (like the original implementation)
    if (!api.registrations[viewId]) {
      api.registrations[viewId] = registration;
      console.log(`[Bases] Successfully registered view: ${viewId}`);
    } else {
      console.debug(`[Bases] View ${viewId} already registered, skipping`);
    }
    return true;
  } catch (error) {
    console.error(`[Bases] Error registering view ${viewId}:`, error);
    return false;
  }
}

/**
 * Safely unregister a view from the Bases plugin
 */
export function unregisterBasesView(app: App, viewId: string): boolean {
  const api = getBasesAPI(app);
  if (!api) {
    // If Bases is not available, consider unregistration successful
    return true;
  }

  try {
    if (api.registrations[viewId]) {
      delete api.registrations[viewId];
      console.log(`[Bases] Successfully unregistered view: ${viewId}`);
    }
    return true;
  } catch (error) {
    console.error(`[Bases] Error unregistering view ${viewId}:`, error);
    return false;
  }
}

/**
 * Type guard to check if a container is a valid BasesContainer
 */
export function isValidBasesContainer(container: any): container is BasesContainer {
  return (
    container &&
    typeof container === 'object' &&
    (container.results instanceof Map || container.results === undefined) &&
    (container.viewContainerEl instanceof HTMLElement || container.viewContainerEl === undefined)
  );
}


// Helper to extract items from Bases results
export const extractDataItems = (results: Map<any, any>): BasesDataItem[] => {
  const dataItems: BasesDataItem[] = [];


  if (results instanceof Map) {
    for (const [key, value] of results.entries()) {
      const formulas: Record<string, any> = {}

      for (const fkey in value?.formulaResults?.formulas) {
        const t1 = value.formulaResults.cachedFormulaOutputs?.[fkey]?.data
        const t2 = t1 ?? value.formulaResults.getFormulaValue(fkey)
        formulas[fkey] = t2;
      }

      const item = {
        key,
        data: value,
        file: value?.file,
        path: value?.file?.path || value?.path,
        properties: value?.properties || value?.frontmatter,
        formulas,
        basesData: value
      } as BasesDataItem;

      dataItems.push(item);
    }
  }

  return dataItems;
};
