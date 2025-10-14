/**
 * Flags de Entorno para Controlar Dependencias Externas.
 *
 * Cambia estos valores para activar o desactivar las integraciones con servicios en la nube.
 * Para desarrollo 100% local, mantenlos en `false`.
 * Para producción o pruebas con servicios reales, cámbialos a `true` y asegúrate de
 * que las claves de API correspondientes estén configuradas en tu entorno.
 */

// Controla la conexión a Firebase (Authentication y Firestore).
// Si es `false`, la app usará perfiles locales y guardará los datos en IndexedDB.
export const USE_FIREBASE = false;

// Controla las llamadas a las APIs de IA (Gemini, OpenAI, etc.).
// Si es `false`, las funciones de IA devolverán datos de ejemplo (mocks)
// y no consumirán cuota de API, ignorando la clave del usuario.
export const USE_AI_API = true;

// Controla si se muestran herramientas de desarrollo, como la restauración de backups locales.
// Poner en `false` para producción.
export const ENABLE_DATA_TOOLS = false;