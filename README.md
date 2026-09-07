# Canvas Resource Auditor

Extensión de Chrome para detectar recursos y solicitudes fallidas mientras navegas por un curso en Canvas LMS. Reúne los hallazgos por pestaña y genera un reporte listo para copiar y enviar al equipo responsable.

> La extensión no modifica el contenido de Canvas ni envía información a servidores externos: los errores se guardan localmente en el navegador y se eliminan al recargar, navegar o cerrar la pestaña.

## Qué detecta

- Recursos que no pueden cargarse, como imágenes, videos, audios, iframes, hojas de estilo y scripts.
- Imágenes que ya estaban rotas cuando se inició la auditoría.
- Respuestas `fetch` no exitosas.
- Solicitudes `XMLHttpRequest` con estado HTTP `400` o superior, o sin respuesta (`0`).
- Recursos insertados dinámicamente en la página, habituales en Canvas.

Cada registro incluye, cuando está disponible, el tipo de recurso, URL, código y texto de estado HTTP, método de la solicitud y hora de detección.

## Instalación

No requiere instalación de paquetes ni compilación.

1. Descarga o clona este repositorio.
2. En Chrome, abre `chrome://extensions`.
3. Activa **Modo de desarrollador**.
4. Haz clic en **Cargar descomprimida**.
5. Selecciona la carpeta que contiene `manifest.json`.
6. Abre Canvas LMS y navega por las páginas que quieras revisar.

Cuando cambies el código, vuelve a `chrome://extensions` y usa el botón de recargar de la extensión.

## Uso

1. Abre un curso o una página de Canvas y navega normalmente; la auditoría comienza automáticamente.
2. Haz clic en el icono de la extensión para ver el número de incidencias de la pestaña actual.
3. Selecciona **Generar Reporte** para agrupar los errores detectados.
4. Usa **Copiar al Portapapeles** para pegar el reporte en un correo, ticket o mensaje.
5. Selecciona **Limpiar** para descartar los hallazgos de esa pestaña sin recargarla.

Los datos están aislados por pestaña. Se borran automáticamente cuando la página comienza a cargarse de nuevo, al navegar a otra URL o al cerrar la pestaña.

## Alcance y limitaciones

- El reporte registra errores observados después de que la extensión se carga; una recarga puede ayudar a reproducirlos.
- Algunos recursos o solicitudes pueden estar bloqueados por políticas del navegador, autenticación, CORS o contenido de terceros. La extensión reporta el síntoma observado, no determina por sí sola la causa raíz.
- Las solicitudes que ocurren dentro de contextos aislados de terceros, como ciertos iframes o workers, pueden no ser visibles.
- La extensión se inyecta en todas las URLs para poder auditar las páginas de Canvas, pero no transmite ni persiste los datos fuera de `chrome.storage.local`.

## Estructura del proyecto

| Archivo | Responsabilidad |
| --- | --- |
| `manifest.json` | Configuración de la extensión, permisos y scripts de Manifest V3. |
| `content.js` | Observa recursos, cambios dinámicos y errores de red en las páginas auditadas. |
| `background.js` | Almacena los errores por pestaña y elimina datos al navegar o cerrar pestañas. |
| `popup.html` | Interfaz emergente de la extensión. |
| `popup.js` | Muestra el conteo, genera reportes, copia texto y limpia errores. |

## Permisos

| Permiso | Motivo |
| --- | --- |
| `activeTab` | Identificar la pestaña que se está consultando desde el popup. |
| `tabs` | Limpiar los datos asociados al navegar o cerrar una pestaña. |
| `storage` | Guardar temporalmente los hallazgos por pestaña en el navegador. |
| `host_permissions: <all_urls>` | Ejecutar el auditor en las páginas de Canvas, incluso en dominios institucionales personalizados. |

## Desarrollo

El proyecto usa JavaScript, HTML y CSS nativos. Para probar cambios:

1. Edita los archivos necesarios.
2. Recarga la extensión desde `chrome://extensions`.
3. Recarga la pestaña de Canvas para iniciar una sesión de auditoría nueva.
4. Abre las herramientas de desarrollador de Chrome si necesitas inspeccionar errores de la extensión o de la página.

## Informe de problemas

Al reportar un problema, incluye el reporte generado por la extensión, la URL afectada (si es seguro compartirla), los pasos para reproducirlo y una captura de pantalla si aporta contexto. No incluyas credenciales ni información privada del alumnado.
