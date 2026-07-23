import { headers } from "next/headers";
import "./globals.css";

import ClientRootLayout from "@/components/ClientRootLayout";

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
