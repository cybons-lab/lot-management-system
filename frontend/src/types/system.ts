export type PageVisibilityConfig = Record<
  string,
  {
    user: boolean;
  }
>;

export interface PublicSystemSettings {
  page_visibility: PageVisibilityConfig;
  maintenance_mode: boolean;
}
