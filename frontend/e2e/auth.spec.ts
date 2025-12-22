import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test.beforeEach(async ({ page }) => {
        // Mock the users API response
        await page.route('**/auth/login-users', async route => {
            const json = [
                { id: 1, username: 'admin', display_name: 'Admin User' },
                { id: 2, username: 'user', display_name: 'Normal User' }
            ];
            await route.fulfill({ json });
        });

        // Mock login API response
        await page.route('**/auth/login', async route => {
            await route.fulfill({
                json: {
                    access_token: 'fake-token',
                    user: {
                        id: 1,
                        username: 'admin',
                        display_name: 'Admin User',
                        roles: ['admin'],
                        assignments: []
                    }
                }
            });
        });

        // Mock dashboard or user info call if needed after login
        await page.route('**/auth/me', async route => {
            await route.fulfill({
                json: {
                    id: 1,
                    username: 'admin',
                    display_name: 'Admin User',
                    roles: ['admin'],
                    assignments: []
                }
            });
        });
    });

    test('should login successfully using the dev login form', async ({ page }) => {
        // 1. Navigate to login page
        await page.goto('/login');

        // 2. Wait for the user select to appear and select it
        // Use getByRole which is stricter and ignores hidden elements by default
        const userSelect = page.getByRole('combobox');
        await expect(userSelect).toBeVisible();
        await userSelect.click();

        // 3. Select the first user
        const firstOption = page.getByRole('option').first();
        await firstOption.click();

        // 4. Click login button
        await page.getByRole('button', { name: 'ログイン' }).click();

        // 5. Verify redirection to dashboard
        await expect(page).toHaveURL('/');
    });

    test('should show validation error if no user selected', async ({ page }) => {
        await page.goto('/login');

        // The button should be disabled initially
        const loginButton = page.getByRole('button', { name: 'ログイン' });
        await expect(loginButton).toBeDisabled();
    });
});
