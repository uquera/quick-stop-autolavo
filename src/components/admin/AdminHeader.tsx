"use client"

import { signOut } from "next-auth/react"
import { Menu, LogOut, User } from "lucide-react"

interface Props {
  user: { name?: string | null; email: string; role: string }
  onMenuClick: () => void
}

export default function AdminHeader({ user, onMenuClick }: Props) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-semibold text-gray-700 hidden md:block">
          Panel de Administración
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #1E40AF, #38BDF8)" }}>
            <User className="w-3.5 h-3.5" />
          </div>
          <span className="hidden sm:block font-medium">{user.name ?? user.email}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Salir</span>
        </button>
      </div>
    </header>
  )
}
