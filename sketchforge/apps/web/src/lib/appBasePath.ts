// Ruta base bajo la que se sirve la app en el static export (ej. "/sketchforge"
// dentro de STBlock). NEXT_PUBLIC_* se inlina en build (DefinePlugin), incluso
// en workers, así que este valor queda disponible en todo el código cliente.
export const APP_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

// Prefija una ruta absoluta con la base. Mantiene la barra final cuando path es
// "/" (el manifold loader usa `new URL(".", window.location.href)` que depende de
// que la URL base termine en "/").
export function appAsset(path: string): string {
  return `${APP_BASE_PATH}${path}`;
}
