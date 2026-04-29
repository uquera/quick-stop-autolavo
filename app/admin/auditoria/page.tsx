import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ClipboardList } from "lucide-react"

export default async function AuditoriaPage() {
  await auth()
  const entries = await prisma.auditEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Auditoría</h1>
        <p className="text-sm text-gray-500">Registro de cambios en el sistema</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <ClipboardList className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm">Sin registros de auditoría</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {entries.map((e) => (
              <div key={e.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{e.entidadTipo}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{e.campo}</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    <span className="line-through text-gray-400">{e.valorAntes ?? "—"}</span>
                    <span className="mx-2 text-gray-400">→</span>
                    <span className="font-medium text-gray-800">{e.valorDespues ?? "—"}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Por: {e.userName}</p>
                </div>
                <p className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
