import { test, expect } from '@playwright/test';
import { installE2EFixtures } from './support/fixtures';

test.describe('Profile Flow', () => {
  test.beforeEach(async ({ page }) => {
    await installE2EFixtures(page);
  });

  test('permite navegar a perfil desde dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('Simulador UNJBG')).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: /Mi perfil/i }).click();

    await expect(page.getByRole('heading', { name: 'Centro de Mando' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Perfil académico')).toBeVisible();
  });

  test('desde stats permite derivar la edición de meta hacia perfil', async ({ page }) => {
    await page.goto('/stats');

    const profileFromStatsButton = page.getByRole('button', { name: 'Cambiar en perfil' });
    await expect(profileFromStatsButton).toBeVisible({ timeout: 15000 });
    await profileFromStatsButton.click();

    await expect(page).toHaveURL(/\/perfil$/);
    await expect(page.getByRole('heading', { name: 'Centro de Mando' })).toBeVisible();
  });

  test('editar carrera en perfil se refleja luego en stats', async ({ page }) => {
    await page.goto('/perfil');

    await expect(page.getByRole('heading', { name: 'Centro de Mando' })).toBeVisible({ timeout: 15000 });

    await page.getByLabel('Carrera objetivo').selectOption('medicina');
    await page.getByRole('button', { name: 'Guardar perfil' }).click();

    await expect(page.getByText('Perfil actualizado correctamente.')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Ver impacto en Estadisticas' }).click();

    await expect(page).toHaveURL(/\/stats$/);
    await expect(page.locator('header').getByText('Medicina Humana')).toBeVisible({ timeout: 15000 });
  });
});
