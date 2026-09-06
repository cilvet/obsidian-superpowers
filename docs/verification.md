# Verificación inicial — 6 de septiembre de 2026

## Resultado observado

- TypeScript estricto: correcto.
- 20 pruebas automatizadas de comportamiento: correctas.
- Build de producción con grafo de dependencias compatible con navegador: correcto.
- Chromium y WebKit sin Node: compilación WASM, imports locales, rechazo de imports no disponibles
  y ejecución de herramientas TypeScript comprobados.
- Obsidian **1.12.4** real, en un perfil y vault separados: correcto.
- Tres skills del repositorio: validación de formato correcta.

## Obsidian real

Se cargó el plugin y se utilizó su interfaz de chat. Los adaptadores OpenAI, Anthropic y Gemini
procesaron respuestas de protocolo simuladas y ejecutaron herramientas reales sobre el vault.
La continuación recibió los resultados de esas herramientas y la respuesta final apareció en el chat.

También se probó desde el chat un flujo con import incorrecto, diagnóstico de compilación,
código corregido, instalación real y ejecución de un comando que escribió una nota.

Se verificó actualización de plugins, recuperación tras fallo en onload, conservación del plugin
activo tras errores de compilación, persistencia del historial, cancelación y limpieza de comandos.
El plugin generado siguió funcionando con Superpowers desactivado.

La emulación móvil de Obsidian reinició la aplicación; tras ese reinicio se comprobó que el chat
cargaba y que la compilación y activación funcionaban con imports de Node deshabilitados.

Durante las pruebas se corrigieron dos fallos de integración: la ruta `dir` que necesita el
manifiesto en memoria del cargador interno, y la espera a que el workspace esté listo antes de abrir el chat.

## Evidencia reproducible

- `bun run check`
- `bun run dev:obsidian` y `bun run verify:desktop`
- `artifacts/desktop-verification.json`
- `artifacts/mobile-browser-verification.json`
- `artifacts/desktop-plugin-chat.png`
- `artifacts/obsidian-mobile-emulation.png`

## Pendiente de validar

**Inferencia con modelos reales:** no había ninguna API key disponible en el entorno.
El evaluador se ejecutó y se detuvo antes de enviar peticiones, como corresponde sin credenciales.
Las respuestas simuladas prueban los protocolos y la integración; no prueban que un modelo razone
correctamente, seleccione las herramientas adecuadas o resuelva una petición nueva.

**Dispositivos físicos:** no se ha probado Obsidian en iOS/Android reales.
**Voz real:** se han probado formatos y transporte de transcripción, no captura de micrófono ni reconocimiento real.
