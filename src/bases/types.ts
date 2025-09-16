export interface BasesViewRegistration {
  name: string;
  icon: string;
  factory: (container: BasesContainer) => any;
}

/**
 * The nullable properties aren't Obsidian native
 */
export interface BasesViewObject {
  refresh?: () => Promise<void>;
  onResize: () => void;
  onDataUpdated: () => void;

  display?: () => void;
  updateVirtualDisplay?: () => void;

  getEphemeralState: () => {
    scrollTop: number;
  };
  setEphemeralState: (state: any) => void;
  destroy: () => void;
  load: () => void;
  unload: () => void;
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

export interface BasesController {
  runQuery?: () => Promise<void>;
  getViewConfig?: () => any;
  results?: Map<any, any>;
  query?: BasesQuery;
}

export interface BasesQuery {
  on?: (event: string, callback: () => void) => void;
  off?: (event: string, callback: () => void) => void;
  getViewConfig?: (key: string) => any;
  properties?: Record<string, any>;
}

export type FormulaOutput = {
  icon: string,
  data: any,
}

export interface BasesDataItem {
  key?: string;
  data?: any;
  file?: { path?: string } | any;
  path?: string;
  properties?: Record<string, any>;
  frontmatter?: Record<string, any>;
  formulas?: Record<string, any>;
  name: string;
  basesData?: any; // Raw Bases data for formula computation
}
