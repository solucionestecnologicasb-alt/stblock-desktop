import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editor 3D de SketchForge",
  description: "Espacio de trabajo del editor de SketchForge basado en el navegador",
  icons: {
    icon: "assets/sketchforge/sketchforge-logo.png",
    apple: "assets/sketchforge/sketchforge-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" style={{ colorScheme: "light" }}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
