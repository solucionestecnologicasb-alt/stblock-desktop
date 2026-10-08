import type { NextConfig } from "next";
import path from "node:path";

const isStaticExport = process.env.STATIC_EXPORT === "true";
const isDockerBuild = process.env.SKETCHFORGE_DOCKER_BUILD === "true";
const extraAllowedDevOrigins = (process.env.SKETCHFORGE_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
// Ruta base bajo la que se sirve el static export (ej. "/sketchforge" dentro de
// STBlock). Vacía en desarrollo local, donde la app se sirve desde la raíz.
const sketchforgeBasePath = (process.env.SKETCHFORGE_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  devIndicators: false,
  // Keep the live development compiler isolated from `next build`. Sharing
  // `.next` lets a production verification build invalidate chunks used by a
  // running dev server, which also breaks API routes such as project snapshots.
  distDir: isStaticExport ? ".next-export" : process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraAllowedDevOrigins],
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: isStaticExport ? "true" : "false",
    NEXT_PUBLIC_BASE_PATH: sketchforgeBasePath,
  },
  images: {
    unoptimized: true
  },
  // brepjs (loaded lazily by the STEP exporter) ships an auto-init helper that
  // tries optional kernel backends via guarded `import().catch()`. We only install
  // and use occt-wasm, so silence the resolution warnings for the backends we omit.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "brepkit-wasm": false,
      "brepjs-opencascade": false,
    };
    return config;
  },
  ...(isStaticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        ...(sketchforgeBasePath
          ? { basePath: sketchforgeBasePath, assetPrefix: `${sketchforgeBasePath}/` }
          : {}),
      }
    : isDockerBuild
      ? { output: "standalone" as const }
      : {}),
};

export default nextConfig;
