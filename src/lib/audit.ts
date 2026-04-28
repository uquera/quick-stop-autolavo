import { prisma } from "./prisma"

export async function registrarCambio({
  entidadTipo,
  entidadId,
  campo,
  valorAntes,
  valorDespues,
  userId,
  userName,
}: {
  entidadTipo: string
  entidadId: string
  campo: string
  valorAntes: string | null | undefined
  valorDespues: string | null | undefined
  userId: string
  userName: string
}) {
  const antes = valorAntes ?? null
  const despues = valorDespues ?? null
  if (antes === despues) return

  try {
    await prisma.auditEntry.create({
      data: { entidadTipo, entidadId, campo, valorAntes: antes, valorDespues: despues, userId, userName },
    })
  } catch (err) {
    console.error("[audit] Error registrando cambio:", err)
  }
}
