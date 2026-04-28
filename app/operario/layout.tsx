import { redirect } from "next/navigation"
import { auth } from "@/auth"
import OperarioShell from "@/components/operario/OperarioShell"

export default async function OperarioLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role === "ADMIN") redirect("/admin")

  return (
    <OperarioShell user={session.user}>
      {children}
    </OperarioShell>
  )
}
