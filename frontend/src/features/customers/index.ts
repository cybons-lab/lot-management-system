/**
 * Customers Feature - Public API
 * 得意先マスタ機能のエクスポート
 */

// Pages
export { CustomersListPage, CustomerDetailPage } from "./pages";

// Components
export { CustomerForm } from "./components/CustomerForm";
export { CustomerBulkImportDialog } from "./components/CustomerBulkImportDialog";
export { CustomerExportButton } from "./components/CustomerExportButton";

// Hooks
export { useCustomers } from "./hooks";

// API
export {
  bulkUpsertCustomers,
  type Customer,
  type CustomerCreate,
  type CustomerUpdate,
} from "./api";

// Types
export type {
  BulkOperationType,
  BulkRowBase,
  BulkResultRow,
  BulkUpsertResponse,
  CustomerBulkRow,
  CustomerBulkUpsertRequest,
} from "./types/bulk-operation";

// Validators (既存)
export * from "./validators/customer-schema";

// Utils
// Utils
// export {
//   parseCustomerCsv,
//   customersToCSV,
//   generateEmptyTemplate,
//   downloadCSV,
// } from "./utils/customer-csv";
