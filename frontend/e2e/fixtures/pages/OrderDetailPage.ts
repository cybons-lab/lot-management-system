/**
 * Order Detail Page Object
 *
 * Provides methods to interact with the order detail page.
 */
import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class OrderDetailPage extends BasePage {
  // Main sections
  readonly orderNumberHeading: Locator;
  readonly statusBadge: Locator;
  readonly saveButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly allocateButton: Locator;
  readonly shipButton: Locator;
  readonly backButton: Locator;

  // Form fields
  readonly orderDateInput: Locator;
  readonly dueDateInput: Locator;
  readonly customerSelect: Locator;
  readonly deliveryPlaceSelect: Locator;

  // Line items
  readonly orderLinesTable: Locator;
  readonly addLineButton: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.orderNumberHeading = page.locator("h1, h2").first();
    this.statusBadge = page
      .locator('[data-testid="order-status"]')
      .or(page.locator(".badge").first());

    // Action buttons
    this.saveButton = page.getByRole("button", { name: /保存/ });
    this.editButton = page.getByRole("button", { name: /編集/ });
    this.deleteButton = page.getByRole("button", { name: /削除/ });
    this.allocateButton = page.getByRole("button", { name: /引当|割当/ });
    this.shipButton = page.getByRole("button", { name: /出荷/ });
    this.backButton = page.getByRole("button", { name: /戻る|一覧/ });

    // Form fields
    this.orderDateInput = page.getByLabel("注文日");
    this.dueDateInput = page.getByLabel("納期");
    this.customerSelect = page.getByLabel("顧客");
    this.deliveryPlaceSelect = page.getByLabel("納品先");

    // Line items
    this.orderLinesTable = page.locator('[data-testid="order-lines"]').or(page.locator("table"));
    this.addLineButton = page.getByRole("button", { name: /明細追加|行追加/ });
  }

  async goto(orderId?: number | string): Promise<void> {
    if (orderId) {
      await this.page.goto(`/orders/${orderId}`);
    }
    await this.waitForPageLoad();
  }

  // ===========================
  // Order Information
  // ===========================

  /**
   * Get current order number from heading
   */
  async getOrderNumber(): Promise<string> {
    const text = await this.orderNumberHeading.textContent();
    return text || "";
  }

  /**
   * Get current order status
   */
  async getStatus(): Promise<string> {
    const text = await this.statusBadge.textContent();
    return text?.trim() || "";
  }

  // ===========================
  // Edit Operations
  // ===========================

  /**
   * Enter edit mode
   */
  async startEdit(): Promise<void> {
    if (await this.editButton.isVisible()) {
      await this.editButton.click();
    }
  }

  /**
   * Save changes with API response verification
   * Returns true if save was successful
   */
  async save(): Promise<boolean> {
    return this.waitForSaveSuccess("/api/orders", async () => {
      await this.saveButton.click();
    });
  }

  /**
   * Save and wait for success toast
   */
  async saveAndVerify(): Promise<void> {
    const success = await this.save();
    expect(success).toBeTruthy();
    await this.expectSuccessToast();
  }

  // ===========================
  // Status Transitions
  // ===========================

  /**
   * Confirm (finalize) the order - draft -> open
   */
  async confirm(): Promise<void> {
    const confirmButton = this.page.getByRole("button", { name: /確定/ });
    await this.waitForSaveSuccess("/api/orders", async () => {
      await confirmButton.click();
    });
    await this.expectSuccessToast();
  }

  /**
   * Allocate the order
   */
  async allocate(): Promise<void> {
    await this.waitForSaveSuccess("/api/allocations", async () => {
      await this.allocateButton.click();
      // May open a dialog
      const dialog = this.page.getByRole("dialog");
      if (await dialog.isVisible()) {
        await dialog.getByRole("button", { name: /実行|確定/ }).click();
      }
    });
    await this.expectSuccessToast();
  }

  /**
   * Ship the order
   */
  async ship(): Promise<void> {
    await this.waitForSaveSuccess("/api/orders", async () => {
      await this.shipButton.click();
      // May require confirmation
      const dialog = this.page.getByRole("dialog");
      if (await dialog.isVisible()) {
        await dialog.getByRole("button", { name: /確定|出荷/ }).click();
      }
    });
    await this.expectSuccessToast();
  }

  /**
   * Cancel the order
   */
  async cancel(): Promise<void> {
    const cancelButton = this.page.getByRole("button", { name: /キャンセル|取消/ });
    await this.waitForSaveSuccess("/api/orders", async () => {
      await cancelButton.click();
      await this.confirmDialog("キャンセル");
    });
  }

  // ===========================
  // Line Item Operations
  // ===========================

  /**
   * Add a new line item
   */
  async addLine(productCode: string, quantity: number): Promise<void> {
    await this.addLineButton.click();

    // Fill in new line
    const dialog = await this.waitForDialog();
    await dialog.getByLabel("製品コード").fill(productCode);
    await dialog.getByLabel("数量").fill(String(quantity));
    await dialog.getByRole("button", { name: /追加|保存/ }).click();
  }

  /**
   * Get line item count
   */
  async getLineCount(): Promise<number> {
    await this.waitForLoadingComplete();
    return this.orderLinesTable.locator("tbody tr").count();
  }

  // ===========================
  // Delete Operations
  // ===========================

  /**
   * Delete this order
   */
  async delete(): Promise<void> {
    await this.deleteButton.click();
    await this.confirmDialog("削除");
    await this.waitForPageLoad();
  }

  // ===========================
  // Navigation
  // ===========================

  /**
   * Go back to order list
   */
  async goBack(): Promise<void> {
    await this.backButton.click();
    await this.waitForPageLoad();
  }

  // ===========================
  // Assertions
  // ===========================

  /**
   * Assert order has expected status
   */
  async expectStatus(status: string): Promise<void> {
    await expect(this.statusBadge).toContainText(status);
  }

  /**
   * Assert save button is disabled (e.g., no changes)
   */
  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  /**
   * Assert save button is enabled
   */
  async expectSaveEnabled(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
  }

  /**
   * Assert allocate button visibility
   */
  async expectAllocateButtonVisible(visible: boolean): Promise<void> {
    if (visible) {
      await expect(this.allocateButton).toBeVisible();
    } else {
      await expect(this.allocateButton).not.toBeVisible();
    }
  }

  /**
   * Assert ship button visibility
   */
  async expectShipButtonVisible(visible: boolean): Promise<void> {
    if (visible) {
      await expect(this.shipButton).toBeVisible();
    } else {
      await expect(this.shipButton).not.toBeVisible();
    }
  }
}
