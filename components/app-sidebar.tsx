"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { 
  LayoutDashboard, 
  MessageSquare, 
  FileText, 
  Folder,
  Settings,
  Bot,
  UserCog,
  Users,
  ShieldCheck
} from "lucide-react"
import { ADMIN_AVATAR } from "@/lib/avatars"
import type { UserRole } from "@/lib/schema"

interface CurrentUserResponse {
  success: true
  data: {
    username: string
    displayName: string | null
    role: "super_admin" | "admin"
  }
}

function isCurrentUserResponse(value: unknown): value is CurrentUserResponse {
  if (!value || typeof value !== "object") return false
  const candidate = value as {
    success?: unknown
    data?: { username?: unknown; displayName?: unknown; role?: unknown }
  }

  return (
    candidate.success === true &&
    typeof candidate.data?.username === "string" &&
    (candidate.data.displayName === null ||
      typeof candidate.data.displayName === "string") &&
    (candidate.data.role === "super_admin" || candidate.data.role === "admin")
  )
}

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboard />,
      isActive: true,
    },
    {
      title: "FAQ",
      url: "/dashboard/faq",
      icon: <MessageSquare />,
    },
    {
      title: "SOP",
      url: "/dashboard/sop",
      icon: <FileText />,
    },
    {
      title: "Documents",
      url: "/dashboard/documents",
      icon: <Folder />,
    },
    {
      title: "User Management",
      url: "/dashboard/users",
      icon: <Users />,
    },
  ],
  navSecondary: [
    {
      title: "AI Configuration",
      url: "/dashboard/config",
      icon: <Settings />,
    },
    {
      title: "Audit Logs",
      url: "/dashboard/audit-logs",
      icon: <ShieldCheck />,
    },
  ],
  superAdminNav: {
    title: "Admin Management",
    url: "/dashboard/admins",
    icon: <UserCog />,
  },
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const [user, setUser] = React.useState<{
    name: string
    username: string
    role: UserRole
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false

    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load current user")
        return response.json() as Promise<unknown>
      })
      .then((body) => {
        if (cancelled) return
        if (!isCurrentUserResponse(body)) {
          throw new Error("Invalid current user response")
        }
        setUser({
          name: body.data.displayName || body.data.username,
          username: body.data.username,
          role: body.data.role,
        })
      })
      .catch(() => {
        if (!cancelled) router.replace("/login")
      })

    return () => {
      cancelled = true
    }
  }, [router])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => router.push('/dashboard')}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">SimpleAI</span>
                <span className="text-xs">Admin Dashboard</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={
            user?.role === "super_admin"
              ? [...data.navMain, data.superAdminNav]
              : data.navMain
          }
        />
        {user?.role === "super_admin" && (
          <NavSecondary items={data.navSecondary} className="mt-auto" />
        )}
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              ...user,
              role: user.role === "super_admin" ? "Super Admin" : "Admin",
              avatar: ADMIN_AVATAR.src,
            }}
            onLogout={handleLogout}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
