import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EmbodiedAITaskPlanner — Embodied AI Navigation",
  description: "Indoor spatial intelligence platform for embodied AI and autonomous navigation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
