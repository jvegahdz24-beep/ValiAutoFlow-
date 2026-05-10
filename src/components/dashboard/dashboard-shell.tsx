'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { NotificationCenter } from '@/components/marketing/NotificationCenter'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  GitBranch,
  Brain,
  Eye,
  Clock,
  Shield,
  ScrollText,
  Menu,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Settings,
  Megaphone,
  Bot,
  Smartphone,
  Calendar,
} from 'lucide-react'

export type ViewType = 'dashboard' | 'conversations' | 'leads' | 'pipeline' | 'agents' | 'observability' | 'followups' | 'policies' | 'audit' | 'config' | 'marketing' | 'telegram' | 'whatsapp' | 'calendar'

interface NavItem {
  id: ViewType
  label: string
  icon: typeof LayoutDashboard
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'conversations', label: 'Conversaciones', icon: MessageSquare },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: GitBranch },
  { id: 'agents', label: 'Agents', icon: Brain, badge: '7 Carnales' },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'telegram', label: 'Telegram Bot', icon: Bot, badge: 'Nuevo' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Smartphone, badge: 'Nuevo' },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'followups', label: 'Follow-ups', icon: Clock },
  { id: 'policies', label: 'Policies', icon: Shield },
  { id: 'observability', label: 'Observability', icon: Eye },
  { id: 'audit', label: 'Audit', icon: ScrollText },
  { id: 'config', label: 'Configuración', icon: Settings },
]

interface DashboardShellProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  children: React.ReactNode
  workspaceName?: string
  workspaceId?: string
}

function SidebarContent({
  activeView,
  onViewChange,
  collapsed,
  onToggle,
}: {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  collapsed: boolean
  onToggle?: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div data-tour="sidebar-logo" className={cn('flex items-center gap-3 border-b border-border/50 px-4 py-4', collapsed && 'justify-center px-2')}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-mint/20">
          <Sparkles className="h-5 w-5 text-brand-mint" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight">ValiAutoFlow</span>
            <span className="text-[10px] text-muted-foreground">Sistema Operativo Comercial Cognitivo</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-2">
        <nav data-tour="sidebar-nav" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.id
            const Icon = item.icon
            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                size={collapsed ? 'icon' : 'default'}
                className={cn(
                  'h-10 w-full justify-start gap-3 font-normal',
                  isActive && 'bg-brand-mint/10 text-brand-mint hover:bg-brand-mint/15 hover:text-brand-mint',
                  collapsed && 'justify-center px-0'
                )}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm">{item.label}</span>
                    {item.badge && (
                      <span className="rounded-full bg-brand-mint/20 px-2 py-0.5 text-[10px] font-medium text-brand-mint">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Button>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Collapse toggle */}
      {onToggle && (
        <>
          <Separator className="bg-border/50" />
          <div className={cn('p-2', collapsed && 'flex justify-center')}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onToggle}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export function DashboardShell({ activeView, onViewChange, children, workspaceName, workspaceId }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden border-r border-border/50 bg-card transition-all duration-300 md:block',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent
          activeView={activeView}
          onViewChange={(view) => {
            onViewChange(view)
          }}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-card">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            activeView={activeView}
            onViewChange={(view) => {
              onViewChange(view)
              setMobileOpen(false)
            }}
            collapsed={false}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 items-center gap-4 border-b border-border/50 bg-card px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center gap-2">
            <h2 className="text-sm font-medium capitalize">{activeView === 'config' ? 'Configuración' : activeView === 'marketing' ? 'Marketing' : activeView}</h2>
            {workspaceName && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{workspaceName}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Center */}
            <div data-tour="notification-center">
              {workspaceId && <NotificationCenter workspaceId={workspaceId} />}
            </div>
            <div data-tour="system-status" className="h-2 w-2 rounded-full bg-brand-mint animate-pulse" />
            <span className="text-xs text-muted-foreground hidden sm:inline">System Active</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
