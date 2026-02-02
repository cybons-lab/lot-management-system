export interface PageVisibilityConfig {
  [feature: string]: {
    user: boolean;
  };
}

export interface PublicSystemSettings {
  page_visibility: PageVisibilityConfig;
  maintenance_mode: boolean;
}
