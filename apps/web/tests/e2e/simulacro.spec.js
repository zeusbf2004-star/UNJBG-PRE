import { test, expect } from '@playwright/test';

test.describe('Simulacro Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Inyectar TODO el estado necesario antes de que cargue cualquier script de la web
    await page.addInitScript(() => {
      // 1. Mock de Usuario para useAuth
      window.__TEST_USER__ = {
        uid: 'test-user-123',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      // 2. Mock de SessionStorage (Datos del examen)
      const mockQuestions = [
        {
          id_pregunta: 'test_1',
          curso: 'Física',
          tema: 'Cinemática',
          enunciado: '¿Cuál es la velocidad de la luz en el vacío?',
          opciones: {
            A: { texto: '300,000 km/s' },
            B: { texto: '150,000 km/s' },
            C: { texto: '100,000 km/s' },
            D: { texto: '200,000 km/s' },
            E: { texto: '300,000 m/s' }
          },
          respuesta_correcta: 'A'
        }
      ];

      window.sessionStorage.setItem('customExamQuestions', JSON.stringify(mockQuestions));
      window.sessionStorage.setItem('customExamTitle', 'Examen E2E');
      window.sessionStorage.setItem('customExamDuration', '10');
      window.sessionStorage.setItem('isSurvivalMode', 'false');
      
      // Limpiar localStorage para empezar limpio
      window.localStorage.clear();
    });
  });

  test('La landing page carga correctamente', async ({ page }) => {
    await page.goto('/');
    // Esperar a que el h1 esté visible
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('Flujo de simulacro personalizado funciona', async ({ page }) => {
    // Ir directamente a la ruta del simulacro
    await page.goto('/simulacro/custom');

    // Esperar a que el loading desaparezca y aparezca el título del examen
    // El título está en un h1 dentro del header
    const examTitle = page.locator('h1', { hasText: 'Examen E2E' });
    await expect(examTitle).toBeVisible({ timeout: 15000 });

    // 1. Responder la pregunta
    const optionA = page.locator('button#option-A');
    await optionA.click();

    // 2. Verificar que se marcó (clase indigo-50 o similar)
    await expect(optionA).toHaveClass(/border-indigo-500/);

    // 3. Finalizar el examen
    // Registrar el manejador de diálogos ANTES del click
    page.on('dialog', async dialog => {
      await dialog.accept();
    });
    
    const finishBtn = page.locator('button#btn-finalizar');
    await finishBtn.click();

    // 4. Verificar pantalla de resultados
    // En ResultsScreen.jsx el título es "Examen Finalizado"
    await expect(page.locator('text=Examen Finalizado')).toBeVisible({ timeout: 15000 });
    
    // Verificar que se muestra el puntaje total
    await expect(page.locator('text=Puntaje Total')).toBeVisible();
    
    // Verificar que hay un botón para volver al dashboard
    await expect(page.locator('button#btn-back-dashboard')).toBeVisible();
  });
});
