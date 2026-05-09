'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { StageBadge, TemperatureBadge, ChannelIcon, CarnalIcon, getCarnalConfig, CognitiveGauge } from './shared'
import { useConversations, type Conversation, type Message } from '@/hooks/use-conversations'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Activity, Shield, Clock, CheckCircle, AlertTriangle } from 'lucide-react'

interface ConversationsViewProps {
  workspaceId: string
}

export function ConversationsView({ workspaceId }: ConversationsViewProps) {
  const { data: conversations, isLoading } = useConversations(workspaceId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')

  const selected = conversations?.find(c => c.id === selectedId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-5 w-5 animate-pulse text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation List */}
      <div className="w-full md:w-80 lg:w-96 shrink-0">
        <Card className="h-full border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conversations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-0.5 px-2">
                {conversations?.map((conv) => (
                  <button
                    key={conv.id}
                    className={cn(
                      'w-full text-left rounded-lg p-3 transition-colors hover:bg-muted/50',
                      selectedId === conv.id && 'bg-emerald-500/10 border border-emerald-500/20'
                    )}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ChannelIcon channel={conv.channel} />
                      <span className="text-sm font-medium truncate flex-1">{conv.lead.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <StageBadge stage={conv.stage} />
                      <TemperatureBadge temperature={conv.temperature} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage || 'No messages'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {conv.lastMessageAt
                          ? new Date(conv.lastMessageAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Detail Panel */}
      <div className="hidden md:flex flex-1 flex-col">
        {!selected ? (
          <Card className="flex-1 flex items-center justify-center border-border/50 bg-card">
            <div className="text-center text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a conversation to view details</p>
            </div>
          </Card>
        ) : (
          <ConversationDetail
            conversation={selected}
            workspaceId={workspaceId}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
          />
        )}
      </div>
    </div>
  )
}

function ConversationDetail({
  conversation,
  workspaceId,
  messageInput,
  setMessageInput,
}: {
  conversation: Conversation
  workspaceId: string
  messageInput: string
  setMessageInput: (v: string) => void
}) {
  const queryClient = useQueryClient()

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/engine/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          messageContent: content,
          workspaceId,
        }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', workspaceId] })
      setMessageInput('')
    },
  })

  const trace = conversation.behavioralTraces[0]

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Chat Panel */}
      <div className="flex flex-1 flex-col">
        <Card className="flex-1 flex flex-col border-border/50 bg-card overflow-hidden">
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-border/50 p-4">
            <ChannelIcon channel={conversation.channel} className="h-5 w-5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium">{conversation.lead.name}</h3>
              <p className="text-xs text-muted-foreground">{conversation.lead.company}</p>
            </div>
            <StageBadge stage={conversation.stage} />
            <TemperatureBadge temperature={conversation.temperature} />
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              <AnimatePresence>
                {conversation.messages.map((msg: Message) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex',
                      msg.direction === 'INBOUND' ? 'justify-start' : 'justify-end'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-2.5',
                        msg.direction === 'INBOUND'
                          ? 'bg-muted text-foreground rounded-bl-sm'
                          : 'bg-emerald-500/20 text-foreground rounded-br-sm border border-emerald-500/20'
                      )}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {msg.carnal && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-emerald-500/30 text-emerald-400">
                            <CarnalIcon carnal={msg.carnal} className="h-2.5 w-2.5 mr-0.5" />
                            {msg.carnal}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border/50 p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && messageInput.trim()) {
                    sendMutation.mutate(messageInput.trim())
                  }
                }}
                className="bg-muted/50"
              />
              <Button
                size="icon"
                className="bg-emerald-500 hover:bg-emerald-600 text-white shrink-0"
                onClick={() => {
                  if (messageInput.trim()) {
                    sendMutation.mutate(messageInput.trim())
                  }
                }}
                disabled={sendMutation.isPending}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {sendMutation.isPending && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-emerald-400">Processing through Carnales...</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cognitive State Panel */}
      <div className="hidden lg:flex w-72 shrink-0 flex-col gap-3">
        {/* Cognitive Gauges */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Cognitive State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <CognitiveGauge value={conversation.intentScore} size={60} label="Intent" />
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="relative">
                  <CognitiveGauge value={conversation.churnRisk} size={60} label="Churn Risk" color="#EF4444" />
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Priority</span>
                <Badge variant="outline" className={
                  conversation.priority === 'HIGH' ? 'border-red-500/30 text-red-400' :
                  conversation.priority === 'MEDIUM' ? 'border-amber-500/30 text-amber-400' :
                  'border-emerald-500/30 text-emerald-400'
                }>
                  {conversation.priority}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Stage</span>
                <StageBadge stage={conversation.stage} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Temperature</span>
                <TemperatureBadge temperature={conversation.temperature} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tool Actions */}
        {conversation.toolActions.length > 0 && (
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium">Tool Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {conversation.toolActions.map((action) => (
                  <div key={action.id} className="flex items-center gap-2 text-xs">
                    <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                    <span className="text-muted-foreground">{action.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Behavioral Trace */}
        {trace && (
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium flex items-center gap-1.5">
                <Shield className="h-3 w-3 text-emerald-400" />
                Behavioral Trace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Policies Applied</span>
                  <span className="text-emerald-400">{trace.policiesApplied}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Violations</span>
                  <span className={trace.violations > 0 ? 'text-red-400' : 'text-emerald-400'}>
                    {trace.violations}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Response Score</span>
                  <span className="text-emerald-400">{trace.responseScore.toFixed(1)}</span>
                </div>
                {trace.violations > 0 && (
                  <div className="flex items-center gap-1 text-red-400 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Violations detected</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pipeline Indicator */}
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium">Engine Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {['ORCHESTRATOR', 'ROUTING', 'MEMORY', 'JHON', 'OBSERVABILITY', 'TOOL_OS', 'FOLLOWUP'].map((carnal, i) => {
                const config = getCarnalConfig(carnal)
                if (!config) return null
                const Icon = config.icon
                return (
                  <div key={carnal} className="flex items-center gap-2 text-xs">
                    <div className={`rounded p-0.5 ${config.bgColor}`}>
                      <Icon className={`h-3 w-3 ${config.color}`} />
                    </div>
                    <span className="text-muted-foreground">{carnal}</span>
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
