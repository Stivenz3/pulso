import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";
import FirestoreProvider from "@/components/providers/FirestoreProvider";

export const metadata: Metadata = {
  title: "Pulso — Control de hábitos",
  description: "Sistema de control de hábitos y sobriedad. Mantén tu racha.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pulso",
  },
  icons: {
    icon: "/pulso.png",
    apple: "/pulso.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#131317",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#131317] text-[#e4e1e7] overflow-x-hidden">
        <ServiceWorkerRegister />
        <FirestoreProvider>
          {children}
        </FirestoreProvider>
      </body>
    </html>
  );
}
