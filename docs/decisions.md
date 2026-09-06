# Decisiones de la primera versión

- Móvil y escritorio comparten runtime web. No hay ruta de servidor ni dependencia de Node/Electron.
- Un paquete Bun con límites hexagonales, sin monorepo ni contenedor de inyección.
- Chat React web con assistant-ui y AI SDK. Se reutilizan primitivas de conversación y herramientas.
- Tres proveedores directos; modelo configurable por ID. Transporte streaming con alternativa nativa
  de Obsidian ante fallos CORS. Esa alternativa entrega el cuerpo de respuesta al terminar, no streaming en vivo.
- Un chat persistente. Nueva conversación conserva una copia del historial anterior.
- Autonomía de ejecución completa; validaciones de compatibilidad y recuperación de fallos, sin aprobaciones.
- Plugins independientes en el cargador real de Obsidian. El adaptador concentra las APIs internas.
- Compilación WASM empaquetada y diferida. Sin CDN para el compilador, ni imports npm sin resolver.
- Código de herramientas con contexto inyectado; código de plugins con imports y exportación convencional.
- Guías cortas, declaraciones de API consultables y convenciones opcionales del vault.
- Pruebas de resultados reales: archivos, comandos, carga, limpieza y reparación. Las respuestas simuladas
  prueban integración y protocolos; las evaluaciones de modelos reales se ejecutan por separado.

## Límites actuales

No se ha validado un dispositivo iOS/Android físico. Las pruebas de escritorio y WebKit no prueban
permisos del micrófono, suspensión de la aplicación ni particularidades de cada WebView móvil.
No se descargan paquetes npm arbitrarios automáticamente. Los módulos ajenos al host se aportan como fuentes locales.
El agente consulta tipos y observa errores; la compilación de código generado no ejecuta el typechecker de TypeScript.
Las claves están separadas de los archivos sincronizables, pero el runtime no aísla código con permisos maliciosos.
Los casos de evaluación iniciales son un comienzo; no constituyen una certificación de capacidades generales del agente.
