"use client"

import { useState } from "react"
import AdminSidebar from "./AdminSidebar"
import AdminHeader from "./AdminHeader"

interface Props {
  user: { name?: string | null; email: string; role: string }
  children: React.ReactNode
}

export default function AdminShell({ user, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <AdminHeader user={user} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
