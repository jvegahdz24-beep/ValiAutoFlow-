'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, X, Loader2 } from 'lucide-react'

interface SegmentQuery {
  tags?: string[]
  minScore?: number
  status?: string
  temperature?: string
}

interface SegmentBuilderProps {
  value: SegmentQuery
  onChange: (query: SegmentQuery) => void
  workspaceId: string
}

export function SegmentBuilder({ value, onChange, workspaceId }: SegmentBuilderProps) {
  const [tagInput, setTagInput] = useState('')
  const [leadCount, setLeadCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const addTag = () => {
    if (tagInput.trim() && !value.tags?.includes(tagInput.trim())) {
      onChange({ ...value, tags: [...(value.tags || []), tagInput.trim()] })
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => {
    onChange({ ...value, tags: value.tags?.filter((t) => t !== tag) || [] })
  }

  const handlePreview = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/segments/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions: value }),
      })
      const data = await res.json()
      setLeadCount(data.count)
    } catch {
      setLeadCount(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" /> Construir Segmento
        </h3>

        {/* Tags */}
        <div>
          <Label className="text-xs">Etiquetas</Label>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Ej: precio_interesado"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className="text-sm"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>
              Agregar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {value.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                {tag}
                <button onClick={() => removeTag(tag)} type="button">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <Label className="text-xs">Estado del lead</Label>
          <Select
            value={value.status || ''}
            onValueChange={(v) => onChange({ ...value, status: v || undefined })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Cualquier estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NEW">Nuevo</SelectItem>
              <SelectItem value="CONTACTED">Contactado</SelectItem>
              <SelectItem value="QUALIFIED">Calificado</SelectItem>
              <SelectItem value="WON">Ganado</SelectItem>
              <SelectItem value="LOST">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Temperature */}
        <div>
          <Label className="text-xs">Temperatura</Label>
          <Select
            value={value.temperature || ''}
            onValueChange={(v) => onChange({ ...value, temperature: v || undefined })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Cualquier temperatura" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COLD">Frío</SelectItem>
              <SelectItem value="WARM">Tibio</SelectItem>
              <SelectItem value="HOT">Caliente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Score */}
        <div>
          <Label className="text-xs">Score mínimo (0-100)</Label>
          <Input
            type="number"
            placeholder="Ej: 50"
            min={0}
            max={100}
            value={value.minScore || ''}
            onChange={(e) =>
              onChange({ ...value, minScore: e.target.value ? parseInt(e.target.value) : undefined })
            }
            className="mt-1 text-sm"
          />
        </div>

        {/* Preview */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button type="button" variant="outline" size="sm" onClick={handlePreview} disabled={loading}>
            {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Users className="w-3 h-3 mr-1" />}
            Calcular leads
          </Button>
          {leadCount !== null && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">
              {leadCount} leads
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
