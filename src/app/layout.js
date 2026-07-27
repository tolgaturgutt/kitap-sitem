import { headers } from "next/headers";
import "./globals.css";

import ClientRootLayout from "@/components/ClientRootLayout";

export const metadata = {
  title: "KitapLab - Kendi Hikayeni Yaz, Oku ve Paylaş",
  description: "KitapLab ile hayal gücünü serbest bırak.",
  icons: {
    apple: "/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }) {
  const requestHeaders = await headers();
  const isMaintenanceMode =
    requestHeaders.get("x-kitaplab-maintenance") === "1";

  return (
    <ClientRootLayout isMaintenanceMode={isMaintenanceMode}>
      {children}
    </ClientRootLayout>
  );
}
