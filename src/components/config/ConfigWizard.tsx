'use client'

import { useState } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import BasicInfoStep from './steps/BasicInfoStep'
import ProductsStep from './steps/ProductsStep'
import LeadFormulaStep from './steps/LeadFormulaStep'
import CustomQuestionsStep from './steps/CustomQuestionsStep'
import PoliciesStep from './steps/PoliciesStep'
import ReviewActivateStep from './steps/ReviewActivateStep'

const STEPS = [
  { id: 'business', title: 'Negocio', description: 'Datos básicos y horario', component: BasicInfoStep },
  { id: 'services', title: 'Servicios', description: 'Lo que ofreces', component: ProductsStep },
  { id: 'formula', title: 'Fórmula', description: 'Calcula tu pérdida', component: LeadFormulaStep },
  { id: 'questions', title: 'Preguntas', description: 'Qué debe preguntar JHON', component: CustomQuestionsStep },
  { id: 'policies', title: 'Reglas', description: 'Políticas comerciales', component: PoliciesStep },
  { id: 'activate', title: 'Activar', description: 'Revisión y activación', component: ReviewActivateStep },
]

interface ConfigWizardProps {
  defaultValues: Record<string, unknown>
  workspaceId: string
}

export default function ConfigWizard({ defaultValues, workspaceId }: ConfigWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const methods = useForm({
    defaultValues,
    mode: 'onChange',
  })

  const StepComponent = STEPS[currentStep].component

  const next = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  const prev = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <FormProvider {...methods}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Configuración de JHON</h1>
            <p className="text-sm text-muted-foreground">
              Paso {currentStep + 1} de {STEPS.length}: {STEPS[currentStep].description}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative mb-6">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, i) => {
            const isActive = i === currentStep
            const isCompleted = i < currentStep
            return (
              <button
                key={step.id}
                type="button"
                disabled
                className={`flex flex-col items-center gap-1 transition-all duration-200 ${
                  isActive ? 'scale-105' : 'opacity-50'
                } ${isCompleted ? 'opacity-70' : ''}`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isActive
                      ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? '✓' : i + 1}
                </div>
                <span
                  className={`text-[10px] font-medium hidden sm:block ${
                    isActive ? 'text-emerald-400' : 'text-muted-foreground'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            )
          })}
        </div>

        {/* Step Content */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <StepComponent
                  onNext={next}
                  onPrev={prev}
                  workspaceId={workspaceId}
                />
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Mobile navigation */}
        <div className="flex items-center justify-between mt-4 sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={prev}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
          </Button>
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} / {STEPS.length}
          </span>
          <Button
            size="sm"
            onClick={next}
            disabled={currentStep === STEPS.length - 1}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Siguiente <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </FormProvider>
  )
}
