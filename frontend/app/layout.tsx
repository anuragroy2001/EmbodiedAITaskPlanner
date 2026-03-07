import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RPG — Robotic Planning with Gemini",
  description: "Indoor spatial intelligence and task planning for robotics, powered by Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Orbitron:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
