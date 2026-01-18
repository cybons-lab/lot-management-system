/**
 * Order List Page Object
 *
 * Provides methods to interact with the orders list page.
 */
import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export interface OrderRowData {
  orderNumber: string;
  customerName?: string;
  status?: string;
  orderDate?: string;
}

export class OrderListPage extends BasePage {
  // Locators
  readonly searchInput: Locator;
  readonly searchButton: Locator;
  readonly createButton: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly statusFilter: Locator;
  readonly customerFilter: Locator;
  readonly clearFiltersButton: Locator;
  readonly pagination: Locator;

  constructor(page: Page) {
    super(page);

    // Search
    this.searchInput = page
      .getByPlaceholder("検索")
      .or(page.getByLabel("検索"))
      .or(page.locator('[data-testid="search-input"]'));
    this.searchButton = page.getByRole("button", { name: "検索" });
    this.createButton = page.getByRole("button", { name: /新規|作成/ });

    // Table
    this.table = page.locator("table").or(page.locator('[data-testid="orders-table"]'));
    this.tableRows = this.table.locator("tbody tr");

    // Filters
    this.statusFilter = page
      .getByLabel("ステータス")
      .or(page.locator('[data-testid="status-filter"]'));
    this.customerFilter = page
      .getByLabel("顧客")
      .or(page.locator('[data-testid="customer-filter"]'));
    this.clearFiltersButton = page.getByRole("button", { name: /クリア|リセット/ });

    // Pagination
    this.pagination = page
      .locator('[data-testid="pagination"]')
      .or(page.locator("nav[aria-label='pagination']"));
  }

  async goto(): Promise<void> {
    await this.page.goto("/orders");
    await this.waitForPageLoad();
  }

  // ===========================
  // Search & Filter
  // ===========================

  /**
   * Search by order number or text
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    // Search might be triggered on input or via button
    if (await this.searchButton.isVisible()) {
      await this.searchButton.click();
    } else {
      await this.page.keyboard.press("Enter");
    }
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: string): Promise<void> {
    await this.statusFilter.click();
    await this.page.getByRole("option", { name: status }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Filter by customer
   */
  async filterByCustomer(customerName: string): Promise<void> {
    await this.customerFilter.click();
    await this.page.getByRole("option", { name: customerName }).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Clear all filters
   */
  async clearFilters(): Promise<void> {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
      await this.waitForLoadingComplete();
    }
  }

  // ===========================
  // Table Interactions
  // ===========================

  /**
   * Get table row count
   */
  async getRowCount(): Promise<number> {
    await this.waitForLoadingComplete();
    return this.tableRows.count();
  }

  /**
   * Get row by order number
   */
  getRowByOrderNumber(orderNumber: string): Locator {
    return this.tableRows.filter({ hasText: orderNumber });
  }

  /**
   * Click on a specific order row
   */
  async clickOrder(orderNumber: string): Promise<void> {
    const row = this.getRowByOrderNumber(orderNumber);
    await row.click();
    await this.waitForPageLoad();
  }

  /**
   * Check if order exists in the list
   */
  async hasOrder(orderNumber: string): Promise<boolean> {
    await this.waitForLoadingComplete();
    const row = this.getRowByOrderNumber(orderNumber);
    return (await row.count()) > 0;
  }

  /**
   * Get status of a specific order
   */
  async getOrderStatus(orderNumber: string): Promise<string> {
    const row = this.getRowByOrderNumber(orderNumber);
    // Status is usually in a badge or specific column
    const statusCell = row
      .locator('[data-testid="status"]')
      .or(row.locator(".badge, [role='status']"));
    return statusCell.textContent() || "";
  }

  /**
   * Select orders for bulk operations
   */
  async selectOrders(orderNumbers: string[]): Promise<void> {
    for (const orderNumber of orderNumbers) {
      const row = this.getRowByOrderNumber(orderNumber);
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.check();
    }
  }

  /**
   * Select all orders
   */
  async selectAll(): Promise<void> {
    const headerCheckbox = this.table.locator('thead input[type="checkbox"]');
    await headerCheckbox.check();
  }

  // ===========================
  // Actions
  // ===========================

  /**
   * Click create new order button
   */
  async clickCreate(): Promise<void> {
    await this.createButton.click();
    await this.waitForPageLoad();
  }

  /**
   * Delete selected orders (bulk delete)
   */
  async deleteSelected(): Promise<void> {
    const deleteButton = this.page.getByRole("button", { name: /削除/ });
    await deleteButton.click();
    await this.confirmDialog();
    await this.waitForLoadingComplete();
  }

  // ===========================
  // Pagination
  // ===========================

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    const nextButton = this.pagination.getByRole("button", { name: /次|>/ });
    if (await nextButton.isEnabled()) {
      await nextButton.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Go to previous page
   */
  async previousPage(): Promise<void> {
    const prevButton = this.pagination.getByRole("button", { name: /前|</ });
    if (await prevButton.isEnabled()) {
      await prevButton.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Go to specific page
   */
  async goToPage(pageNumber: number): Promise<void> {
    const pageButton = this.pagination.getByRole("button", {
      name: String(pageNumber),
      exact: true,
    });
    await pageButton.click();
    await this.waitForLoadingComplete();
  }

  // ===========================
  // Assertions
  // ===========================

  /**
   * Assert table shows expected number of rows
   */
  async expectRowCount(count: number): Promise<void> {
    await this.waitForLoadingComplete();
    await expect(this.tableRows).toHaveCount(count);
  }

  /**
   * Assert order is visible in the list
   */
  async expectOrderVisible(orderNumber: string): Promise<void> {
    await this.waitForLoadingComplete();
    const row = this.getRowByOrderNumber(orderNumber);
    await expect(row).toBeVisible();
  }

  /**
   * Assert order is NOT visible in the list
   */
  async expectOrderNotVisible(orderNumber: string): Promise<void> {
    await this.waitForLoadingComplete();
    const row = this.getRowByOrderNumber(orderNumber);
    await expect(row).not.toBeVisible();
  }

  /**
   * Assert order has specific status
   */
  async expectOrderStatus(orderNumber: string, expectedStatus: string): Promise<void> {
    const row = this.getRowByOrderNumber(orderNumber);
    await expect(row).toContainText(expectedStatus);
  }
}
