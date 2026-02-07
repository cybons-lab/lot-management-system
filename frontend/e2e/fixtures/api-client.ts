/**
 * API Client for E2E tests
 *
 * Provides authenticated API calls for test data setup and verification.
 * Uses Playwright's APIRequestContext for consistent test infrastructure.
 */
import { APIRequestContext, expect } from "@playwright/test";

// @ts-expect-error - process is defined in the test environment
const API_BASE_URL = process.env.E2E_API_URL || "http://localhost:18000";

export interface ApiClientOptions {
  request: APIRequestContext;
  token?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

/**
 * E2E Test API Client
 *
 * Usage:
 *   const client = await ApiClient.create(request, { username: "admin", password: "admin123" });
 *   await client.resetDatabase();
 *   const order = await client.createOrder({ ... });
 */
export class ApiClient {
  private request: APIRequestContext;
  private token: string | null;

  private constructor(request: APIRequestContext, token: string | null = null) {
    this.request = request;
    this.token = token;
  }

  /**
   * Create an authenticated API client
   *
   * Note: Login failure is not fatal - the client will continue without auth.
   * This allows for bootstrap scenarios (e.g., reset-database before admin exists).
   */
  static async create(
    request: APIRequestContext,
    credentials: LoginCredentials = { username: "admin", password: "admin123" },
  ): Promise<ApiClient> {
    const client = new ApiClient(request);
    try {
      await client.login(credentials);
    } catch {
      console.warn(`[ApiClient] Login failed for ${credentials.username}, continuing without auth`);
    }
    return client;
  }

  /**
   * Create an unauthenticated API client
   */
  static unauthenticated(request: APIRequestContext): ApiClient {
    return new ApiClient(request);
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ===========================
  // Authentication
  // ===========================

  /**
   * Login and obtain JWT token
   *
   * @throws Error if login fails (caller should handle gracefully for bootstrap scenarios)
   */
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const response = await this.request.post(`${API_BASE_URL}/api/auth/login`, {
      data: {
        username: credentials.username,
        password: credentials.password,
      },
      timeout: 30000,
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()} - ${await response.text()}`);
    }
    const data = (await response.json()) as AuthToken;
    this.token = data.access_token;
    return data;
  }

  // ===========================
  // Database Management
  // ===========================

  /**
   * Reset database to initial state
   *
   * Note: In dev environment, this endpoint allows unauthenticated access
   * for bootstrap scenarios. After reset, admin user is recreated and
   * this method will attempt to re-authenticate.
   *
   * @throws Error if reset fails - callers should handle this appropriately
   */
  async resetDatabase(): Promise<void> {
    const response = await this.request.post(`${API_BASE_URL}/api/admin/reset-database`, {
      headers: this.getHeaders(),
      timeout: 120000, // Extended timeout for heavy operations
    });

    if (!response.ok()) {
      const errorText = await response.text();
      const errorMsg = `Database reset failed: ${response.status()} - ${errorText}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

    console.log("Database reset successful");

    // After reset, admin user is recreated - re-authenticate if we weren't authenticated
    if (!this.token) {
      try {
        await this.login({ username: "admin", password: "admin123" });
        console.log("Re-authenticated after database reset");
      } catch {
        console.warn("Failed to re-authenticate after reset, continuing without auth");
        // Re-auth failure is not critical - tests can still proceed
      }
    }
  }

  async generateTestData(options?: { preset_id?: string }): Promise<void> {
    const response = await this.request.post(`${API_BASE_URL}/api/admin/test-data/generate`, {
      headers: this.getHeaders(),
      data: options || {},
      timeout: 30000, // 30秒に延長
    });

    if (!response.ok()) {
      const errorText = await response.text();
      throw new Error(`Test data generation failed: ${response.status()} - ${errorText}`);
    }
    console.log("Test data generation successful");
  }

  // ===========================
  // Orders API
  // ===========================

  /**
   * Create a new order
   */
  async createOrder(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.request.post(`${API_BASE_URL}/api/orders`, {
      headers: this.getHeaders(),
      data,
    });

    expect(response.ok(), `Create order failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: number): Promise<Record<string, unknown>> {
    const response = await this.request.get(`${API_BASE_URL}/api/v2/orders/${orderId}`, {
      headers: this.getHeaders(),
    });

    expect(response.ok(), `Get order failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: number, status: string): Promise<Record<string, unknown>> {
    const response = await this.request.put(`${API_BASE_URL}/api/orders/${orderId}/status`, {
      headers: this.getHeaders(),
      data: { status },
    });

    expect(response.ok(), `Update order status failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()) as Record<string, unknown>;
  }

  // ===========================
  // Lots API
  // ===========================

  /**
   * Create a new lot
   */
  async createLot(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await this.request.post(`${API_BASE_URL}/api/lots`, {
      headers: this.getHeaders(),
      data,
    });

    expect(response.ok(), `Create lot failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()) as Record<string, unknown>;
  }

  /**
   * Get lot by ID
   */
  async getLot(lotId: number): Promise<Record<string, unknown>> {
    const response = await this.request.get(`${API_BASE_URL}/api/lots/${lotId}`, {
      headers: this.getHeaders(),
    });

    expect(response.ok(), `Get lot failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()) as Record<string, unknown>;
  }

  // ===========================
  // Allocations API
  // ===========================

  /**
   * Create allocations for an order
   */
  async createAllocations(
    orderId: number,
    allocations: { lot_id: number; quantity: number }[],
  ): Promise<Record<string, unknown>> {
    const response = await this.request.post(`${API_BASE_URL}/api/allocations`, {
      headers: this.getHeaders(),
      data: {
        order_id: orderId,
        allocations,
      },
    });

    expect(response.ok(), `Create allocations failed: ${await response.text()}`).toBeTruthy();
    return (await response.json()) as Record<string, unknown>;
  }

  // ===========================
  // Generic API Methods
  // ===========================

  /**
   * Generic GET request
   */
  async get<T = Record<string, unknown>>(path: string, expectedStatus = 200): Promise<T> {
    const response = await this.request.get(`${API_BASE_URL}${path}`, {
      headers: this.getHeaders(),
    });

    expect(response.status()).toBe(expectedStatus);
    return (await response.json()) as T;
  }

  /**
   * Generic POST request
   */
  async post<T = Record<string, unknown>>(
    path: string,
    data: Record<string, unknown>,
    expectedStatus = 201,
  ): Promise<T> {
    const response = await this.request.post(`${API_BASE_URL}${path}`, {
      headers: this.getHeaders(),
      data,
    });

    expect(response.status()).toBe(expectedStatus);
    return (await response.json()) as T;
  }

  /**
   * Generic PUT request
   */
  async put<T = Record<string, unknown>>(
    path: string,
    data: Record<string, unknown>,
    expectedStatus = 200,
  ): Promise<T> {
    const response = await this.request.put(`${API_BASE_URL}${path}`, {
      headers: this.getHeaders(),
      data,
    });

    expect(response.status()).toBe(expectedStatus);
    return (await response.json()) as T;
  }

  /**
   * Generic DELETE request
   */
  async delete(path: string, expectedStatus = 200): Promise<void> {
    const response = await this.request.delete(`${API_BASE_URL}${path}`, {
      headers: this.getHeaders(),
    });

    expect(response.status()).toBe(expectedStatus);
  }

  /**
   * Expect API to return specific status
   */
  async expectStatus(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    expectedStatus: number,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const options = {
      headers: this.getHeaders(),
      ...(data ? { data } : {}),
    };

    let response;
    switch (method) {
      case "GET":
        response = await this.request.get(`${API_BASE_URL}${path}`, options);
        break;
      case "POST":
        response = await this.request.post(`${API_BASE_URL}${path}`, options);
        break;
      case "PUT":
        response = await this.request.put(`${API_BASE_URL}${path}`, options);
        break;
      case "DELETE":
        response = await this.request.delete(`${API_BASE_URL}${path}`, options);
        break;
    }

    expect(
      response.status(),
      `Expected ${expectedStatus}, got ${response.status()}: ${await response.text()}`,
    ).toBe(expectedStatus);
  }
}
