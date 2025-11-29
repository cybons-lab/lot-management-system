# Inventory Consolidation and Order List Improvements (2025-11-29)

This document summarizes the changes made to consolidate Inventory and Lot management pages and improve the Order List page.

## 1. Inventory & Lot Management Consolidation

### Goal
To improve user experience and reduce navigation friction by merging the separate "Inventory Summary" and "Lot List" pages into a single, unified "Inventory Management" page.

### Changes
- **New `InventoryPage`**: Created a unified page (`frontend/src/features/inventory/pages/InventoryPage.tsx`) serving as the single entry point.
- **Tabbed Interface**:
    - **Overview Tab**: Displays aggregated inventory data. Supports viewing by Item (Product x Warehouse), Product, Supplier, and Warehouse.
    - **Lot List Tab**: Displays detailed lot information with full management capabilities (Create, Edit, Lock).
- **Drill-down Functionality**: Clicking on a row in the Overview tab automatically switches to the Lot List tab and applies relevant filters (e.g., filtering by the selected product and warehouse).
- **Component Refactoring**:
    - Extracted `LotListPanel` from the old `LotsPage`.
    - Extracted `InventoryTable` from the old `SummaryPage`.
- **Routing & Navigation**:
    - Removed legacy routes `/inventory/summary` and `/inventory/lots`.
    - Added redirects to `/inventory` to maintain backward compatibility.
    - Updated Sidebar to remove the separate "Lots" menu item.

## 2. Order List Page Improvements

### Goal
To enhance the Order List page by providing better visibility into order details and supporting different view modes.

### Changes
- **Group by Order**:
    - Added a "Group by Order" toggle switch to the Order List page.
    - When enabled, order lines are grouped by their parent Order ID, displaying a header with order-level details (Order Number, Customer, Date, Status) followed by the list of line items.
- **Visual Highlighting**:
    - Updated `OrderLineColumns` to visually emphasize key information:
        - **Delivery Destination**: Bold text.
        - **Product Name**: Bold text.
        - **Quantity**: Bold text.
        - **Delivery Date**: Bold text.
- **Frontend Implementation**:
    - Modified `OrdersListPage.tsx` to handle the grouping state and render the grouped view.
    - Updated `OrderLineColumns.tsx` with new styling.

## Files Changed
- `frontend/src/features/inventory/pages/InventoryPage.tsx` (New)
- `frontend/src/features/inventory/components/LotListPanel.tsx` (New)
- `frontend/src/features/inventory/components/InventoryTable.tsx` (New)
- `frontend/src/features/orders/pages/OrdersListPage.tsx` (Modified)
- `frontend/src/features/orders/components/OrderLineColumns.tsx` (Modified)
- `frontend/src/shared/components/layout/Sidebar.tsx` (Modified/Deleted)
- `frontend/src/App.tsx` (Modified routes)
