"use client"

import { useState } from "react"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { Menu, LogOut } from "lucide-react"
import OperarioSidebar from "./OperarioSidebar"

interface Props {
  user: { name?: string | null; email: string }
  children: React.ReactNode
}

export default function OperarioShell({ user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <OperarioSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/logo.jpeg" alt="QuickStop" width={28} height={28} className="rounded-md object-contain md:hidden" />
              <span className="text-sm font-semibold text-gray-700 hidden md:block">Panel de Operario</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
                {(user.name ?? user.email)[0].toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name ?? user.email}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Salir</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
