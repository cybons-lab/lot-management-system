/**
 * Customers API
 * 得意先マスタのAPI通信関数
 */

import type {
  BulkUpsertResponse,
  CustomerBulkRow,
  CustomerBulkUpsertRequest,
} from "../types/bulk-operation";

import { http } from "@/services/http";
import type { components } from "@/types/api";

// OpenAPI生成型
export type Customer = components["schemas"]["CustomerResponse"];
export type CustomerCreate = components["schemas"]["CustomerCreate"];
export type CustomerUpdate = components["schemas"]["CustomerUpdate"];

const BASE_PATH = "/customers";

// ============================================
// CRUD API
// ============================================

/**
 * 得意先一覧を取得
 */
export async function listCustomers(): Promise<Customer[]> {
  const response = await http.get<Customer[]>(BASE_PATH);
  return response.data;
}

/**
 * 得意先詳細を取得
 */
export async function getCustomer(customerCode: string): Promise<Customer> {
  const response = await http.get<Customer>(`${BASE_PATH}/${customerCode}`);
  return response.data;
}

/**
 * 得意先を新規登録
 */
export async function createCustomer(data: CustomerCreate): Promise<Customer> {
  const response = await http.post<Customer>(BASE_PATH, data);
  return response.data;
}

/**
 * 得意先を更新
 */
export async function updateCustomer(
  customerCode: string,
  data: CustomerUpdate,
): Promise<Customer> {
  const response = await http.put<Customer>(`${BASE_PATH}/${customerCode}`, data);
  return response.data;
}

/**
 * 得意先を削除
 */
export async function deleteCustomer(customerCode: string): Promise<void> {
  await http.delete(`${BASE_PATH}/${customerCode}`);
}

// ============================================
// Bulk API (一括処理)
// ============================================

/**
 * 1行分の処理関数（将来的に個別API呼び出しへ差し替え可能）
 *
 * TODO: backend: implement per-row ADD/UPD/DEL logic
 * TODO: backend: replace with per-record API when available
 */
export async function upsertCustomerRow(
  row: CustomerBulkRow,
): Promise<{ success: boolean; errorMessage?: string }> {
  try {
    switch (row.OPERATION) {
      case "ADD":
        await createCustomer({
          customer_code: row.customer_code,
          customer_name: row.customer_name,
        });
        return { success: true };

      case "UPD":
        await updateCustomer(row.customer_code, {
          customer_name: row.customer_name,
        });
        return { success: true };

      case "DEL":
        // TODO: backend: 論理削除か物理削除か確認が必要
        await deleteCustomer(row.customer_code);
        return { success: true };

      default:
        return { success: false, errorMessage: `不明な操作: ${row.OPERATION}` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return { success: false, errorMessage: message };
  }
}

/**
 * 一括処理関数
 *
 * TODO: backend: bulk-upsert not yet implemented
 * - 現在は個別APIを順次呼び出す実装
 * - 将来的にバックエンドにbulk-upsert APIが実装されたら、
 *   単一リクエストに置き換え可能
 *
 * @example
 * // バックエンドbulk API実装後の置き換え例:
 * // const response = await http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, { rows });
 * // return response.data;
 */
export async function bulkUpsertCustomers(rows: CustomerBulkRow[]): Promise<BulkUpsertResponse> {
  // TODO: backend: バックエンドbulk-upsert API実装後は以下に置き換え
  // const response = await http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, { rows });
  // return response.data;

  // 現在は個別APIを順次呼び出し
  const results = await Promise.all(
    rows.map(async (row, index) => {
      const result = await upsertCustomerRow(row);
      return {
        rowNumber: row._rowNumber ?? index + 1,
        success: result.success,
        code: row.customer_code,
        errorMessage: result.errorMessage,
      };
    }),
  );

  const added = results.filter((r, i) => r.success && rows[i]?.OPERATION === "ADD").length;
  const updated = results.filter((r, i) => r.success && rows[i]?.OPERATION === "UPD").length;
  const deleted = results.filter((r, i) => r.success && rows[i]?.OPERATION === "DEL").length;
  const failed = results.filter((r) => !r.success).length;

  return {
    status: failed === 0 ? "success" : failed === rows.length ? "failed" : "partial",
    summary: {
      total: rows.length,
      added,
      updated,
      deleted,
      failed,
    },
    results,
  };
}

/**
 * 一括処理リクエストを送信（バックエンドAPI実装後用）
 *
 * TODO: backend: bulk-upsert not yet implemented
 */
export async function bulkUpsertCustomersApi(
  _request: CustomerBulkUpsertRequest,
): Promise<BulkUpsertResponse> {
  // TODO: backend: bulk-upsert API実装後に有効化
  // const response = await http.post<BulkUpsertResponse>(`${BASE_PATH}/bulk-upsert`, request);
  // return response.data;

  throw new Error("bulk-upsert API is not yet implemented");
}
