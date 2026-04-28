import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "QuickStop Multiservicio | Auto Lavado",
  description: "Sistema de gestión para QuickStop Multiservicio",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full antialiased bg-gray-50`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
