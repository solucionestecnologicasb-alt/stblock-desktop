# Despliegue 3D de bajo consumo en WordPress

`pnpm deploy:all` publica Diseño 3D como una aplicación estática. La geometría,
el renderizado, los Web Workers, WASM, el guardado de proyectos y la caché de la
biblioteca se ejecutan en el navegador. El despliegue no habilita la API de
proyectos compartidos ni escribe proyectos `.skf` en WordPress.

## Optimizaciones automáticas

Durante la copia a `assets/editor`, el despliegue:

- recrea la carpeta para no acumular chunks de versiones anteriores;
- elimina source maps, backups y los tres playgrounds que no utiliza WordPress;
- instala un Service Worker de caché bajo demanda, sin precargar los cientos de
  megabytes del editor;
- elimina automáticamente la caché de la versión anterior al desplegar una nueva;
- agrega `.htaccess` con MIME correctos, caché HTTP y Brotli/Gzip cuando Apache
  tenga disponibles esos módulos;
- mantiene HTML y el Service Worker sin caché persistente para que las
  actualizaciones se detecten inmediatamente.

Los modelos externos de Adafruit y FreeCAD continúan descargándose directamente
desde el navegador y utilizan la caché propia de la biblioteca. No pasan por PHP.

## Hosting Nginx

Nginx no interpreta `.htaccess`. En ese caso, las reglas equivalentes deben
añadirse a la configuración del sitio:

```nginx
location ^~ /wp-content/plugins/bolt-page-plugin/assets/editor/ {
    try_files $uri =404;
    gzip on;
    gzip_types text/plain text/css application/javascript application/json application/wasm image/svg+xml;

    location ~* \.html$|/stblock-sw\.js$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        try_files $uri =404;
    }

    location ~* \.(js|mjs|css|wasm|worker|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf|glb|gltf|bin|stl|step|stp|hex|json)$ {
        add_header Cache-Control "public, max-age=86400, stale-while-revalidate=604800" always;
        try_files $uri =404;
    }
}
```

Para reducir todavía más el ancho de banda sin cargar PHP, conviene colocar el
directorio `assets/editor` detrás del CDN del proveedor del hosting. No se debe
aplicar caché larga al HTML ni a `stblock-sw.js`.

## Persistencia

- Dashboard de SketchForge: `localStorage` e IndexedDB del navegador.
- Proyecto completo: el `.skf` se incorpora al `.flynt` descargado por el usuario.
- Biblioteca: descarga diferida y Cache Storage del navegador.
- Servidor: solamente archivos estáticos; no hay guardado automático de usuarios.

Si posteriormente se habilita guardado en nube, debe hacerse como servicio
opcional con autenticación y cuotas, sin reemplazar el guardado local.
