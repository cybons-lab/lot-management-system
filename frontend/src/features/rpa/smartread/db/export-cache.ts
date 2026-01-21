/**
 * SmartRead Export Cache
 *
 * IndexedDB-based caching for export results to reduce server load
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "smartread-export-cache";
const DB_VERSION = 2;
const STORE_NAME = "exports";

export interface CachedExport {
  id: string; // {config_id}_{task_id}_{export_id}
  config_id: number;
  task_id: string;
  export_id: string;
  wide_data: Array<Record<string, any>>;
  long_data: Array<Record<string, any>>;
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: string | null;
  }>;
  filename: string | null;
  cached_at: number; // timestamp
  saved_to_db: boolean;
}

class ExportCacheService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      console.log("[CACHE] Opening IndexedDB database");
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db: IDBPDatabase, oldVersion: number, _newVersion: number | null, transaction) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            console.log("[CACHE] Creating object store");
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("config_id", "config_id", { unique: false });
            store.createIndex("task_id", "task_id", { unique: false });
            store.createIndex("cached_at", "cached_at", { unique: false });
          }
          if (oldVersion < 2) {
            const store = transaction.objectStore(STORE_NAME);
            store.openCursor().then(function updateCursor(cursor) {
              if (!cursor) return;
              const value = cursor.value as CachedExport;
              if (value.saved_to_db === undefined) {
                value.saved_to_db = false;
                cursor.update(value);
              }
              return cursor.continue().then(updateCursor);
            });
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Get cached export result
   */
  async get(config_id: number, task_id: string, export_id: string): Promise<CachedExport | null> {
    try {
      const db = await this.getDB();
      const id = this.makeKey(config_id, task_id, export_id);

      console.log(`[CACHE] Looking up export: ${id}`);
      const cached = await db.get(STORE_NAME, id);

      if (cached) {
        console.log(
          `[CACHE] Cache hit for ${id} ` +
            `(${cached.wide_data.length} wide, ${cached.long_data.length} long)`,
        );
        return cached as CachedExport;
      }

      console.log(`[CACHE] Cache miss for ${id}`);
      return null;
    } catch (error) {
      console.error("[CACHE] Failed to get from cache:", error);
      return null;
    }
  }

  /**
   * Get latest cached export for a task
   */
  async getByTaskId(config_id: number, task_id: string): Promise<CachedExport | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const index = tx.store.index("task_id");

      // IDBKeyRange.only(task_id) failed in some cases if types mismatch, but usually string is fine.
      // However, we want to filter by config_id too?
      // The index is only on task_id.
      // But task_id is usually unique enough? Or is it scoped by config?
      // existing code: `id: string; // {config_id}_{task_id}_{export_id}`
      // `task_id` in `SmartReadTask` seems to be global UUID or similar string?
      // Let's assume task_id is string.

      const exports = await index.getAll(task_id);

      if (exports.length === 0) return null;

      // Filter by config_id to be safe and Sort by cached_at desc
      const sorted = exports
        .filter((e: CachedExport) => e.config_id === config_id)
        .sort((a: CachedExport, b: CachedExport) => b.cached_at - a.cached_at);

      if (sorted.length > 0) {
        console.log(
          `[CACHE] Found ${sorted.length} cached exports for task ${task_id}. Using latest.`,
        );
        return sorted[0] as CachedExport;
      }

      return null;
    } catch (error) {
      console.error("[CACHE] Failed to get by task_id:", error);
      return null;
    }
  }

  /**
   * Store export result in cache
   */
  async set(params: {
    config_id: number;
    task_id: string;
    export_id: string;
    wide_data: Array<Record<string, any>>;
    long_data: Array<Record<string, any>>;
    errors: Array<any>;
    filename: string | null;
    saved_to_db?: boolean;
  }): Promise<void> {
    const {
      config_id,
      task_id,
      export_id,
      wide_data,
      long_data,
      errors,
      filename,
      saved_to_db = false,
    } = params;

    try {
      const db = await this.getDB();
      const id = this.makeKey(config_id, task_id, export_id);

      const cached: CachedExport = {
        id,
        config_id,
        task_id,
        export_id,
        wide_data,
        long_data,
        errors,
        filename,
        cached_at: Date.now(),
        saved_to_db,
      };

      console.log(
        `[CACHE] Storing export: ${id} ` +
          `(${wide_data.length} wide, ${long_data.length} long rows)`,
      );

      await db.put(STORE_NAME, cached);
      console.log(`[CACHE] Successfully cached ${id}`);
    } catch (error) {
      console.error("[CACHE] Failed to store in cache:", error);
    }
  }

  /**
   * Delete cached export
   */
  async delete(config_id: number, task_id: string, export_id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const id = this.makeKey(config_id, task_id, export_id);

      console.log(`[CACHE] Deleting export: ${id}`);
      await db.delete(STORE_NAME, id);
    } catch (error) {
      console.error("[CACHE] Failed to delete from cache:", error);
    }
  }

  async setSavedToDb(id: string, savedToDb: boolean): Promise<void> {
    try {
      const db = await this.getDB();
      const cached = await db.get(STORE_NAME, id);
      if (!cached) return;

      const updated = {
        ...(cached as CachedExport),
        saved_to_db: savedToDb,
      };
      await db.put(STORE_NAME, updated);
      console.log(`[CACHE] Updated saved_to_db for ${id} => ${savedToDb}`);
    } catch (error) {
      console.error("[CACHE] Failed to update saved_to_db:", error);
    }
  }

  /**
   * Clear all cached exports for a config
   */
  async clearByConfig(config_id: number): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const index = tx.store.index("config_id");

      console.log(`[CACHE] Clearing all exports for config_id=${config_id}`);

      let cursor = await index.openCursor(IDBKeyRange.only(config_id));
      let count = 0;

      while (cursor) {
        await cursor.delete();
        count++;
        cursor = await cursor.continue();
      }

      await tx.done;
      console.log(`[CACHE] Cleared ${count} cached exports for config_id=${config_id}`);
    } catch (error) {
      console.error("[CACHE] Failed to clear cache:", error);
    }
  }

  /**
   * Clear old cache entries (older than 7 days)
   */
  async clearOldEntries(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const index = tx.store.index("cached_at");

      const cutoff = Date.now() - maxAgeMs;
      console.log(`[CACHE] Clearing entries older than ${new Date(cutoff).toISOString()}`);

      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      let count = 0;

      while (cursor) {
        await cursor.delete();
        count++;
        cursor = await cursor.continue();
      }

      await tx.done;
      console.log(`[CACHE] Cleared ${count} old cache entries`);
    } catch (error) {
      console.error("[CACHE] Failed to clear old entries:", error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSizeEstimate: number;
  }> {
    try {
      const db = await this.getDB();
      const all = await db.getAll(STORE_NAME);

      let totalSize = 0;
      for (const entry of all) {
        // Rough size estimate
        totalSize += JSON.stringify(entry).length;
      }

      return {
        totalEntries: all.length,
        totalSizeEstimate: totalSize,
      };
    } catch (error) {
      console.error("[CACHE] Failed to get stats:", error);
      return { totalEntries: 0, totalSizeEstimate: 0 };
    }
  }

  private makeKey(config_id: number, task_id: string, export_id: string): string {
    return `${config_id}_${task_id}_${export_id}`;
  }
}

// Singleton instance
export const exportCache = new ExportCacheService();
