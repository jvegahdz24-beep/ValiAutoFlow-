'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { StageBadge, TemperatureBadge, CognitiveGauge } from './shared'
import { useLeads } from '@/hooks/use-leads'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Search, Users, Activity, Mail, Phone, Building, DollarSign,
  Brain, Clock, MessageSquare, ChevronRight,
} from 'lucide-react'

export function LeadsView({ workspaceId }: { workspaceId: string }) {
  const [status, setStatus] = useState<string>('')
  const [temperature, setTemperature] = useState<string>('')
  const [archetype, setArchetype] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data: leads, isLoading } = useLeads({
    workspaceId,
    status: status || undefined,
    temperature: temperature || undefined,
    archetype: archetype || undefined,
    search: search || undefined,
  })

  const { data: memoryData } = useQuery({
    queryKey: ['lead-memory', selectedLeadId],
    queryFn: async () => {
      const res = await fetch(`/api/engine/memory/${selectedLeadId}?workspaceId=${workspaceId}`)
      return res.json()
    },
    enabled: !!selectedLeadId,
  })

  const selectedLead = leads?.find(l => l.id === selectedLeadId)

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    INACTIVE: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    CONVERTED: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[140px] bg-muted/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={temperature} onValueChange={(v) => setTemperature(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[140px] bg-muted/50">
            <SelectValue placeholder="Temperature" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="COLD">Cold</SelectItem>
            <SelectItem value="WARM">Warm</SelectItem>
            <SelectItem value="HOT">Hot</SelectItem>
          </SelectContent>
        </Select>
        <Select value={archetype} onValueChange={(v) => setArchetype(v === 'ALL' ? '' : v)}>
          <SelectTrigger className="w-[180px] bg-muted/50">
            <SelectValue placeholder="Archetype" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="DECISIVE_BUYER">Decisive Buyer</SelectItem>
            <SelectItem value="ANALYTICAL_RESEARCHER">Analytical Researcher</SelectItem>
            <SelectItem value="HESITANT_PROSPECT">Hesitant Prospect</SelectItem>
            <SelectItem value="UNDECIDED">Undecided</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Activity className="h-5 w-5 animate-pulse text-emerald-400" />
        </div>
      ) : (
        <Card className="border-border/50 bg-card overflow-hidden">
          <ScrollArea className="h-[calc(100vh-14rem)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Temperature</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Deal Value</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden xl:table-cell">Archetype</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden xl:table-cell">Last Contact</th>
                    <th className="p-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads?.map((lead) => (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedLeadId(lead.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-medium text-emerald-400">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{lead.name}</p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{lead.company}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <Badge variant="outline" className={cn('text-xs', statusColors[lead.status] || '')}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <TemperatureBadge temperature={lead.temperature} />
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Progress value={lead.score} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground">{lead.score}</span>
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className="text-sm">${lead.dealValue.toLocaleString()}</span>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {lead.archetype.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 hidden xl:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {lead.lastContact
                            ? new Date(lead.lastContact).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
                            : 'Never'}
                        </span>
                      </td>
                      <td className="p-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Lead Detail Sheet */}
      <Sheet open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-auto">
          {selectedLead && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-sm font-bold text-emerald-400">
                    {selectedLead.name.charAt(0)}
                  </div>
                  {selectedLead.name}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Contact Info */}
                <div className="space-y-2">
                  {selectedLead.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedLead.email}</span>
                    </div>
                  )}
                  {selectedLead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedLead.phone}</span>
                    </div>
                  )}
                  {selectedLead.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{selectedLead.company}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Status & Temperature */}
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={cn('text-xs', statusColors[selectedLead.status] || '')}>
                    {selectedLead.status}
                  </Badge>
                  <TemperatureBadge temperature={selectedLead.temperature} />
                  <Badge variant="outline" className="text-xs">
                    {selectedLead.archetype.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Cognitive Gauges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <CognitiveGauge value={selectedLead.intentScore} size={70} label="Intent Score" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <CognitiveGauge value={selectedLead.churnRisk} size={70} label="Churn Risk" color="#EF4444" />
                    </div>
                  </div>
                </div>

                {/* Deal Value */}
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-muted-foreground">Deal Value:</span>
                  <span className="text-sm font-semibold">${selectedLead.dealValue.toLocaleString()}</span>
                </div>

                <Separator />

                {/* Memory Summary */}
                {memoryData && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium flex items-center gap-1.5">
                      <Brain className="h-3.5 w-3.5 text-cyan-400" />
                      Memory Packet
                    </h4>
                    {memoryData.conversational && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wide">Conversational</span>
                        <p className="text-xs text-muted-foreground mt-1">{memoryData.conversational}</p>
                      </div>
                    )}
                    {memoryData.commercial && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <span className="text-[10px] font-medium text-amber-400 uppercase tracking-wide">Commercial</span>
                        <p className="text-xs text-muted-foreground mt-1">{memoryData.commercial}</p>
                      </div>
                    )}
                    {memoryData.operational && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <span className="text-[10px] font-medium text-violet-400 uppercase tracking-wide">Operational</span>
                        <p className="text-xs text-muted-foreground mt-1">{memoryData.operational}</p>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Related Conversations */}
                <div>
                  <h4 className="text-xs font-medium flex items-center gap-1.5 mb-2">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    Related Conversations
                  </h4>
                  <div className="space-y-1">
                    {selectedLead.conversations.map((conv) => (
                      <div key={conv.id} className="flex items-center gap-2 text-xs text-muted-foreground rounded-lg p-2 bg-muted/30">
                        <StageBadge stage={conv.stage} />
                        <span className="capitalize">{conv.channel.toLowerCase()}</span>
                      </div>
                    ))}
                    {selectedLead.conversations.length === 0 && (
                      <p className="text-xs text-muted-foreground">No conversations yet</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
