/**
 * SmartRead Export Cache
 *
 * IndexedDB-based caching for export results to reduce server load
 */

import { openDB, type IDBPDatabase, type IDBPCursorWithValue } from "idb";

import { logger } from "../utils/logger";

const DB_NAME = "smartread-export-cache";
const DB_VERSION = 3;
const STORE_NAME = "exports";
type SmartReadRow = Record<string, unknown>;
type TransformError = {
  row: number;
  field: string;
  message: string;
  value: string | null;
};

export interface CachedExport {
  id: string; // {config_id}_{task_id}_{export_id}
  config_id: number;
  task_id: string;
  export_id: string;
  wide_data: SmartReadRow[];
  long_data: SmartReadRow[];
  errors: TransformError[];
  filename: string | null;
  task_date?: string;
  data_version?: number;
  cached_at: number; // timestamp
  saved_to_db: boolean;
}

class ExportCacheService {
  private dbPromise: Promise<IDBPDatabase> | null = null;

  private async getDB(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      logger.debug("IndexedDB接続開始");
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
        upgrade(db: IDBPDatabase, oldVersion: number, _newVersion: number | null, transaction) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            logger.debug("オブジェクトストア作成");
            const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
            store.createIndex("config_id", "config_id", { unique: false });
            store.createIndex("task_id", "task_id", { unique: false });
            store.createIndex("cached_at", "cached_at", { unique: false });
          }
          if (oldVersion < 2) {
            const store = transaction.objectStore(STORE_NAME);
            store.openCursor().then(function updateCursor(
              cursor: IDBPCursorWithValue | null,
            ): Promise<void> {
              if (!cursor) return Promise.resolve();
              const value = cursor.value as CachedExport;
              if (value.saved_to_db === undefined) {
                value.saved_to_db = false;
                cursor.update(value);
              }
              return cursor.continue().then(updateCursor);
            });
          }
          if (oldVersion < 3) {
            const store = transaction.objectStore(STORE_NAME);
            store.openCursor().then(function updateCursor(
              cursor: IDBPCursorWithValue | null,
            ): Promise<void> {
              if (!cursor) return Promise.resolve();
              const value = cursor.value as CachedExport;
              if (value.data_version === undefined) {
                value.data_version = 1;
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

      const cached = await db.get(STORE_NAME, id);

      if (cached) {
        logger.debug("キャッシュヒット", {
          id,
          wideCount: (cached as CachedExport).wide_data.length,
          longCount: (cached as CachedExport).long_data.length,
        });
        return cached as CachedExport;
      }

      logger.debug("キャッシュミス", { id });
      return null;
    } catch (error) {
      logger.error("キャッシュ取得失敗", error);
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

      const exports = await index.getAll(task_id);

      if (exports.length === 0) return null;

      // Filter by config_id to be safe and Sort by cached_at desc
      const sorted = exports
        .filter((e: CachedExport) => e.config_id === config_id)
        .sort((a: CachedExport, b: CachedExport) => b.cached_at - a.cached_at);

      if (sorted.length > 0) {
        logger.debug("タスクキャッシュ取得", { taskId: task_id, count: sorted.length });
        return sorted[0] as CachedExport;
      }

      return null;
    } catch (error) {
      logger.error("タスクキャッシュ取得失敗", error);
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
    wide_data: SmartReadRow[];
    long_data: SmartReadRow[];
    errors: TransformError[];
    filename: string | null;
    task_date?: string;
    data_version?: number;
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
      task_date,
      data_version,
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
        task_date,
        data_version,
        cached_at: Date.now(),
        saved_to_db,
      };

      logger.debug("キャッシュ保存", {
        id,
        wideCount: wide_data.length,
        longCount: long_data.length,
      });

      await db.put(STORE_NAME, cached);
      logger.debug("キャッシュ保存完了", { id });
    } catch (error) {
      logger.error("キャッシュ保存失敗", error);
    }
  }

  /**
   * Delete cached export
   */
  async delete(config_id: number, task_id: string, export_id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const id = this.makeKey(config_id, task_id, export_id);

      logger.debug("キャッシュ削除", { id });
      await db.delete(STORE_NAME, id);
    } catch (error) {
      logger.error("キャッシュ削除失敗", error);
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
      logger.debug("キャッシュsaved_to_db更新", { id, savedToDb });
    } catch (error) {
      logger.error("キャッシュsaved_to_db更新失敗", error);
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

      logger.debug("設定キャッシュクリア開始", { configId: config_id });

      let cursor = await index.openCursor(IDBKeyRange.only(config_id));
      let count = 0;

      while (cursor) {
        await cursor.delete();
        count++;
        cursor = await cursor.continue();
      }

      await tx.done;
      logger.info("設定キャッシュクリア完了", { configId: config_id, deletedCount: count });
    } catch (error) {
      logger.error("設定キャッシュクリア失敗", error);
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
      logger.debug("古いキャッシュクリア開始", { cutoff: new Date(cutoff).toISOString() });

      let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoff));
      let count = 0;

      while (cursor) {
        await cursor.delete();
        count++;
        cursor = await cursor.continue();
      }

      await tx.done;
      logger.info("古いキャッシュクリア完了", { deletedCount: count });
    } catch (error) {
      logger.error("古いキャッシュクリア失敗", error);
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
      logger.error("キャッシュ統計取得失敗", error);
      return { totalEntries: 0, totalSizeEstimate: 0 };
    }
  }

  private makeKey(config_id: number, task_id: string, export_id: string): string {
    return `${config_id}_${task_id}_${export_id}`;
  }
}

// Singleton instance
export const exportCache = new ExportCacheService();
