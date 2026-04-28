import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session
  const role = session?.user?.role

  const isAdminRoute    = nextUrl.pathname.startsWith("/admin")
  const isOperarioRoute = nextUrl.pathname.startsWith("/operario")
  const isAuthRoute     = nextUrl.pathname === "/login"

  if (isAuthRoute && isLoggedIn) {
    const dest = role === "ADMIN" ? "/admin" : "/operario"
    return NextResponse.redirect(new URL(dest, nextUrl))
  }

  if (!isLoggedIn && (isAdminRoute || isOperarioRoute)) {
    return NextResponse.redirect(new URL("/login", nextUrl))
  }

  if (isAdminRoute && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/operario", nextUrl))
  }

  if (isOperarioRoute && role === "ADMIN") {
    return NextResponse.redirect(new URL("/admin", nextUrl))
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set("x-pathname", nextUrl.pathname)
  return NextResponse.next({ request: { headers: requestHeaders } })
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo).*)"],
}
