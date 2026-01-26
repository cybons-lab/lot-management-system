export interface PageVisibilityConfig {
  [feature: string]: {
    guest: boolean;
    user: boolean;
  };
}

export interface PublicSystemSettings {
  page_visibility: PageVisibilityConfig;
  maintenance_mode: boolean;
}
