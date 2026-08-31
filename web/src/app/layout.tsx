import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ancillary Reconciliation — Executive Overview",
  description: "Cross-branch equipment loss and activity reporting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
