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
- `bun run verify:release` (macOS, vault y perfil distintos del desarrollo)
- `artifacts/desktop-verification.json`
- `artifacts/mobile-browser-verification.json`
- `artifacts/desktop-plugin-chat.png`
- `artifacts/obsidian-mobile-emulation.png`

## Paquete para BRAT 0.1.0

Se repitió la integración en Obsidian 1.12.4 usando `.release-vault`, con únicamente los
tres archivos de distribución instalados y sin carpeta `assets/`. Pasaron el chat de los
tres proveedores con respuestas simuladas, consulta de referencias, compilación y reparación,
instalación, comandos, actualización, rollback, persistencia, cancelación y emulación móvil.
No se registraron errores de página. El fallo de onload provocado se recuperó correctamente.

Chromium y WebKit compilaron usando el WASM integrado con la red desconectada tras cargar
el bundle. Las referencias también estaban disponibles sin acceso a archivos auxiliares.
Los avisos de dependencias se incluyen en el JavaScript distribuido.

## Skills y actividad agrupada — beta 0.2.0

- 27 pruebas de comportamiento, con catálogo/alias de skills, contexto progresivo, agrupación de
  varios pasos, llamadas simultáneas, fallos anidados, cancelación e historial vacío.
- En Obsidian real, cada proveedor procesó tres consultas en una respuesta y dos escrituras en otra.
  Los resultados llegaron a la continuación; las escrituras quedaron ordenadas y cinco acciones
  aparecieron dentro de un único desplegable por respuesta.
- Interfaz: un único indicador desde la espera inicial, cambio a «Preparando plugin», brillo activo,
  ausencia de animación con movimiento reducido, apertura/cierre con teclado y errores consultables.
- Medidas en ventanas de 320, 390 y 900 px: sin desbordamiento horizontal en el chat; controles
  comprobados de al menos 44 × 44 px en los tamaños pequeños. Iconos SVG del host y captura en tema oscuro.
- Chromium y WebKit: seis skills completas y compilador disponibles sin descargar recursos auxiliares.
- Evidencia adicional: `artifacts/chat-ui-verification.json`, `chat-mobile-working.png`,
  `chat-mobile-expanded.png` y `chat-desktop-dark.png`. `bun run verify:release` incluye estas pruebas.

## Pendiente de validar con modelos y dispositivos reales

**Inferencia con modelos reales:** no había ninguna API key disponible en el entorno.
El evaluador se ejecutó y se detuvo antes de enviar peticiones, como corresponde sin credenciales.
Las respuestas simuladas prueban los protocolos y la integración; no prueban que un modelo razone
correctamente, seleccione las herramientas adecuadas o resuelva una petición nueva.

**Dispositivos físicos:** no se ha probado Obsidian en iOS/Android reales.
**Voz real:** se han probado formatos y transporte de transcripción, no captura de micrófono ni reconocimiento real.
