'use client'

import { useFormContext } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { HelpCircle, Trash2 } from 'lucide-react'
import DynamicList from '../shared/DynamicList'

const DEFAULT_QUESTION = {
  id: '',
  text: '',
  purpose: '',
  stage: 'exploration',
}

const STAGE_LABELS: Record<string, string> = {
  exploration: 'Exploración',
  interest: 'Interés',
  intention: 'Intención',
}

const STAGE_DESCRIPTIONS: Record<string, string> = {
  exploration: 'JHON la hace al inicio para entender la necesidad',
  interest: 'JHON la hace cuando el lead muestra interés',
  intention: 'JHON la hace antes de proponer una solución',
}

interface StepProps {
  onNext: () => void
  onPrev: () => void
  workspaceId: string
}

export default function CustomQuestionsStep({ onNext, onPrev }: StepProps) {
  const { register, setValue, watch } = useFormContext()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
          <HelpCircle className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Preguntas Personalizadas</h3>
          <p className="text-sm text-muted-foreground">
            JHON integrará estas preguntas de forma natural en la conversación. El lead nunca sentirá un interrogatorio.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-sm text-amber-400">
          <strong>Consejo:</strong> Las mejores preguntas son las que ayudan a JHON a dar una cotización más precisa o a entender la urgencia del lead.
        </p>
      </div>

      <DynamicList
        name="customQuestions"
        defaultItem={{ ...DEFAULT_QUESTION, id: `q_${Date.now()}` }}
        maxItems={3}
        addLabel="Agregar pregunta"
        renderItem={({ index, remove }) => {
          const stage = watch(`customQuestions.${index}.stage`) || 'exploration'
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Pregunta {index + 1} de 3
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div>
                <Label className="text-xs font-medium">Pregunta</Label>
                <Input
                  placeholder="Ej: ¿Qué coche tienes? (marca, modelo, año)"
                  {...register(`customQuestions.${index}.text`)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Propósito (por qué JHON la pregunta)</Label>
                <Input
                  placeholder="Ej: Para darte una cotización más exacta"
                  {...register(`customQuestions.${index}.purpose`)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">¿Cuándo debe hacerla?</Label>
                <Select
                  value={stage}
                  onValueChange={(v) =>
                    setValue(`customQuestions.${index}.stage`, v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STAGE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {STAGE_DESCRIPTIONS[stage]}
                </p>
              </div>
            </div>
          )
        }}
      />

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onPrev}>
          Atrás
        </Button>
        <Button onClick={onNext} className="bg-emerald-600 hover:bg-emerald-700">
          Siguiente
        </Button>
      </div>
    </div>
  )
}
