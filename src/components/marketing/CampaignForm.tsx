'use client'

import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface CampaignFormProps {
  workspaceId: string
  onSuccess: () => void
}

interface CampaignFormData {
  name: string
  description: string
  channel: string
  templateBody: string
  segmentQuery: {
    minScore?: number
    status?: string
    temperature?: string
  }
}

export function CampaignForm({ workspaceId, onSuccess }: CampaignFormProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { register, handleSubmit, setValue, watch, reset } = useForm<CampaignFormData>({
    defaultValues: {
      name: '',
      description: '',
      channel: 'whatsapp',
      templateBody: '¡Hola {{name}}! 👋',
      segmentQuery: {},
    },
  })

  const channel = watch('channel')

  const onSubmit = async (data: CampaignFormData) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Error')
      toast.success('Campaña creada exitosamente')
      reset()
      setOpen(false)
      onSuccess()
    } catch {
      toast.error('Error al crear campaña')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Nueva Campaña
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear Campaña</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Nombre de la campaña</Label>
            <Input {...register('name', { required: true })} placeholder="Ej: Reactivación Enero" className="mt-1" />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea {...register('description')} placeholder="Describe el objetivo de esta campaña" className="mt-1" rows={2} />
          </div>

          <div>
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(v) => setValue('channel', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensaje template</Label>
            <Textarea
              {...register('templateBody')}
              placeholder="Ej: ¡Hola {{name}}! Tenemos una oferta especial para ti..."
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Usa {'{{name}}'} para personalizar con el nombre del contacto
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Score mínimo</Label>
              <Input
                type="number"
                placeholder="0"
                {...register('segmentQuery.minScore', { valueAsNumber: true })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Estado del lead</Label>
              <Select onValueChange={(v) => setValue('segmentQuery.status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
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
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? 'Creando...' : 'Crear Campaña'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
