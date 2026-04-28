import { prisma } from "@/lib/prisma"

export interface LicenciaStatus {
  existe: boolean
  suspendida: boolean
  diasRestantes: number
  fechaVencimiento: Date | null
  plan: string
  mostrarBanner: boolean
}

export async function getLicenciaStatus(): Promise<LicenciaStatus> {
  const lic = await prisma.licencia.findFirst()

  if (!lic) {
    return {
      existe: false,
      suspendida: false,
      diasRestantes: 9999,
      fechaVencimiento: null,
      plan: "PRO",
      mostrarBanner: false,
    }
  }

  const diasRestantes = Math.ceil(
    (lic.fechaVencimiento.getTime() - Date.now()) / 86_400_000
  )
  const suspendida = lic.suspendida || diasRestantes <= 0

  return {
    existe: true,
    suspendida,
    diasRestantes,
    fechaVencimiento: lic.fechaVencimiento,
    plan: lic.plan,
    mostrarBanner: !suspendida && diasRestantes <= 7,
  }
}
