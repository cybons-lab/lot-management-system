/**
 * Master Service
 * マスタデータ関連のAPI通信関数を提供
 */

import type { Customer } from "@/features/customers/validators/customer-schema";
import type { Product } from "@/features/products/validators/product-schema";
import type { Supplier } from "@/features/suppliers/validators/supplier-schema";
import type { Warehouse } from "@/features/warehouses/validators/warehouse-schema";
import { http } from "@/services/http";

const BASE_PATH = "/masters";

/**
 * 製品マスタ一覧を取得
 */
export async function listProducts(): Promise<Product[]> {
  const response = await http.get<Product[]>(`${BASE_PATH}/products`);
  return response.data;
}

/**
 * 仕入先マスタ一覧を取得
 */
export async function listSuppliers(): Promise<Supplier[]> {
  const response = await http.get<Supplier[]>(`${BASE_PATH}/suppliers`);
  return response.data;
}

/**
 * 倉庫マスタ一覧を取得
 */
export async function listWarehouses(): Promise<Warehouse[]> {
  const response = await http.get<Warehouse[]>(`${BASE_PATH}/warehouses`);
  return response.data;
}

/**
 * 得意先マスタ一覧を取得
 */
export async function listCustomers(): Promise<Customer[]> {
  const response = await http.get<Customer[]>(`${BASE_PATH}/customers`);
  return response.data;
}

/**
 * 全マスタをまとめて取得
 * - 製品、仕入先、倉庫、得意先を同時に取得
 */
export async function listAllMasters() {
  const [products, suppliers, warehouses, customers] = await Promise.all([
    listProducts(),
    listSuppliers(),
    listWarehouses(),
    listCustomers(),
  ]);

  return {
    products,
    suppliers,
    warehouses,
    customers,
  };
}
