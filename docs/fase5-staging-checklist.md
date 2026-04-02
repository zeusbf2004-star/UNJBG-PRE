# Fase 5 - Checklist de Staging

## Objetivo
Validar analitica fina y gamificacion por contraste en entorno de staging antes de promover a produccion.

## Alcance de esta iteracion
- Funcion semanal de percentiles por carrera/canal.
- Leaderboard por competencia real (misma carrera).
- Preview borroso + candado para usuarios gratuitos.
- Comparativa de rendimiento en estadisticas (usuario vs cohorte).

## Orden de despliegue recomendado (staging)
1. Deploy Functions:
   - `npm run deploy:functions`
2. Deploy reglas e indices Firestore:
   - `npm run deploy:rules`
   - `firebase deploy --only firestore:indexes --config firebase.json`
3. Deploy Hosting:
   - `npm run deploy:hosting`

## Verificaciones funcionales
1. Perfil sincronizado:
   - Cambiar `carrera_objetivo` y `canal_objetivo` en perfil.
   - Confirmar en `user_scores/{uid}` que ambos campos se sincronizan.
2. Leaderboard contextual:
   - Usuario premium: ve Top 10 de su carrera.
   - Usuario gratuito: ve leaderboard borroso con CTA Premium.
3. Stats comparativas:
   - En Stats page aparece comparativa (azul usuario, gris cohorte).
4. Job semanal:
   - Ejecutar job manualmente desde consola o esperar ciclo.
   - Validar escritura en:
     - `user_percentiles/{uid}/weekly/current`
     - `career_percentiles/{career}__{canal}`
     - `stats_jobs/weekly_percentiles_{weekKey}`

## Monitoreo minimo
- Revisar logs de Cloud Functions para `computeWeeklyPercentiles`.
- Confirmar que no hay errores de indice faltante.
- Validar tiempo de ejecucion y cantidad de docs leidos/escritos.

## Criterio de salida a produccion
- 1 ciclo semanal completo sin errores.
- Datos coherentes de percentil para muestra de usuarios.
- UX validada por cuenta admin (sin regresiones visibles).
