"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Wrench, Warehouse, Tag, Megaphone, X } from "lucide-react"

const nav = [
  { href: "/operario",               label: "Mi Dashboard",      icon: LayoutDashboard },
  { href: "/operario/servicios",     label: "Cola de Servicios", icon: Wrench },
  { href: "/operario/bahias",        label: "Bahías",            icon: Warehouse },
  { href: "/operario/tipos-servicio",label: "Tipos de Servicio", icon: Tag },
  { href: "/operario/promociones",   label: "Promociones",       icon: Megaphone },
]

interface Props { isOpen: boolean; onClose: () => void }

export default function OperarioSidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname()

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 flex flex-col transition-transform duration-300 md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E3A8A 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpeg" alt="QuickStop" width={36} height={36} className="rounded-lg object-contain" />
            <div>
              <p className="text-white font-bold text-sm leading-none">QuickStop</p>
              <p className="text-[#38BDF8] text-xs">Operario</p>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-white/60 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = href === "/operario" ? pathname === "/operario" : pathname.startsWith(href)
            return (
              <Link key={href} href={href} onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                )}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">Limpieza · Rapidez · Calidad</p>
        </div>
      </aside>
    </>
  )
}
