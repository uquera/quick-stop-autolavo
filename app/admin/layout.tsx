import { redirect } from "next/navigation"
import { auth } from "@/auth"
import AdminShell from "@/components/admin/AdminShell"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/operario")

  return (
    <AdminShell user={session.user}>
      {children}
    </AdminShell>
  )
}
