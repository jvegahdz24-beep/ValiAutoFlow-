'use client'

import { useState, useEffect } from 'react'
import { Providers } from '@/components/providers'
import { DashboardShell, type ViewType } from '@/components/dashboard/dashboard-shell'
import { OverviewDashboard } from '@/components/dashboard/overview-dashboard'
import { ConversationsView } from '@/components/dashboard/conversations-view'
import { LeadsView } from '@/components/dashboard/leads-view'
import { PipelineView } from '@/components/dashboard/pipeline-view'
import { AgentsView } from '@/components/dashboard/agents-view'
import { ObservabilityView } from '@/components/dashboard/observability-view'
import { FollowupsView } from '@/components/dashboard/followups-view'
import { PoliciesView } from '@/components/dashboard/policies-view'
import { AuditView } from '@/components/dashboard/audit-view'
import { ConfigView } from '@/components/dashboard/config-view'
import { MarketingView } from '@/components/dashboard/marketing-view'
import { TelegramView } from '@/components/telegram/TelegramView'
import { WhatsAppView } from '@/components/whatsapp/WhatsAppView'
import CalendarSettings from '@/components/google/CalendarSettings'
import { TourProvider, TourLauncher, useTour } from '@/components/tours/TourOverlay'
import { useWorkspace } from '@/hooks/use-workspace'
import { Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

function DashboardInner() {
  const { workspaceId, isLoading } = useWorkspace()
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const { setViewChangeCallback } = useTour()

  // Register view change callback for tour navigation
  useEffect(() => {
    setViewChangeCallback((view: ViewType) => {
      setActiveView(view)
    })
  }, [setViewChangeCallback])

  if (isLoading || !workspaceId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="rounded-2xl bg-brand-mint/20 p-4">
              <Sparkles className="h-10 w-10 text-brand-mint" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand-mint"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">ValiAutoFlow</h1>
            <p className="text-sm text-muted-foreground">Sistema Operativo Comercial Cognitivo</p>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="h-2 w-2 rounded-full bg-brand-mint"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Initializing workspace...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <DashboardShell
      activeView={activeView}
      onViewChange={setActiveView}
      workspaceName="ValiAutoFlow Workspace"
      workspaceId={workspaceId}
    >
      {/* Tour launcher in the main area */}
      <div className="flex items-center justify-end mb-2">
        <TourLauncher currentView={activeView} />
      </div>

      <div data-tour="dashboard-view">
        {activeView === 'dashboard' && <OverviewDashboard workspaceId={workspaceId} />}
      </div>
      <div data-tour="conversations-list">
        {activeView === 'conversations' && <ConversationsView workspaceId={workspaceId} />}
      </div>
      <div data-tour="leads-table">
        {activeView === 'leads' && <LeadsView workspaceId={workspaceId} />}
      </div>
      <div data-tour="pipeline-board">
        {activeView === 'pipeline' && <PipelineView workspaceId={workspaceId} />}
      </div>
      <div data-tour="agents-list">
        {activeView === 'agents' && <AgentsView workspaceId={workspaceId} />}
      </div>
      {activeView === 'observability' && <ObservabilityView workspaceId={workspaceId} />}
      {activeView === 'followups' && <FollowupsView workspaceId={workspaceId} />}
      {activeView === 'policies' && <PoliciesView workspaceId={workspaceId} />}
      {activeView === 'audit' && <AuditView workspaceId={workspaceId} />}
      <div data-tour="config-view">
        {activeView === 'config' && <ConfigView workspaceId={workspaceId} />}
      </div>
      <div data-tour="marketing-view">
        {activeView === 'marketing' && <MarketingView workspaceId={workspaceId} />}
      </div>
      {activeView === 'telegram' && <TelegramView workspaceId={workspaceId} />}
      {activeView === 'whatsapp' && <WhatsAppView workspaceId={workspaceId} />}
      {activeView === 'calendar' && <CalendarSettings workspaceId={workspaceId} />}
    </DashboardShell>
  )
}

function DashboardContent() {
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const isDemoUser = typeof window !== 'undefined' && localStorage.getItem('valiautoflow_demo_user') === 'true'

  return (
    <TourProvider currentView={activeView} isDemoUser={isDemoUser}>
      <DashboardInner />
    </TourProvider>
  )
}

export default function Home() {
  return (
    <Providers>
      <DashboardContent />
    </Providers>
  )
}
