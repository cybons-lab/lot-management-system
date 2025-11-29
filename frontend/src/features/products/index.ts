/**
 * Products Feature - Public API
 */
export { ProductsListPage } from "./pages/ProductsListPage";
export { ProductDetailPage } from "./pages/ProductDetailPage";
export { ProductForm } from "./components/ProductForm";
export { ProductBulkImportDialog } from "./components/ProductBulkImportDialog";
export { ProductExportButton } from "./components/ProductExportButton";

// Hooks
export { useProducts } from "./hooks";

export type { Product, ProductCreate, ProductUpdate } from "./api";
