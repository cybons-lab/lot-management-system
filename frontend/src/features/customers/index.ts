/**
 * Customers Feature - Public API
 * 得意先マスタ機能のエクスポート
 */

// Pages
export { CustomersListPage } from "./pages/CustomersListPage";
export { CustomerDetailPage } from "./pages/CustomerDetailPage";

// Components
export { CustomerForm } from "./components/CustomerForm";
export { CustomerBulkImportDialog } from "./components/CustomerBulkImportDialog";
export { CustomerExportButton } from "./components/CustomerExportButton";

// Hooks
export { useCustomersQuery, CUSTOMERS_QUERY_KEY } from "./hooks/useCustomersQuery";
export { useCustomerQuery } from "./hooks/useCustomerQuery";
export {
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useBulkUpsertCustomers,
} from "./hooks/useCustomerMutations";

// API
export {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkUpsertCustomers,
  type Customer,
  type CustomerCreate,
  type CustomerUpdate,
} from "./api/customers-api";

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
export {
  parseCustomerCsv,
  customersToCSV,
  generateEmptyTemplate,
  downloadCSV,
} from "./utils/customer-csv";
