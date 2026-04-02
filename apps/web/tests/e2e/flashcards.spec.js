import { test, expect } from '@playwright/test';
import { installE2EFixtures } from './support/fixtures';

test.describe('Flashcards Flow', () => {
  test.beforeEach(async ({ page }) => {
    await installE2EFixtures(page);
  });

  test('permite navegar a flashcards desde dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Simulador UNJBG')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Estudiar' }).click();

    await expect(page).toHaveURL(/\/flashcards$/);
    await expect(page.getByRole('heading', { name: 'Sin mazos activos' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Ir a la Biblioteca' })).toBeVisible();
  });
});
