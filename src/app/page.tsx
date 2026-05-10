import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Zap, Calendar, Users, TrendingUp, 
  MessageCircle, CheckCircle2, Star, Shield, Brain, Bot
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-gray-900 dark:text-white overflow-x-hidden">
      
      {/* ===== NAVBAR ===== */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-7 h-7 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight">ValiAutoFlow</span>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/precios" className="text-sm hover:underline hidden sm:inline text-slate-600 dark:text-slate-400">Precios</Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="sm">Iniciar Sesión</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800">Comenzar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="max-w-7xl mx-auto px-4 pt-24 pb-16 text-center">
        <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
          Primer Sistema Operativo Comercial Cognitivo de LATAM
        </Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
          Deja de perder leads.<br />
          <span className="bg-gradient-to-r from-blue-700 to-emerald-500 bg-clip-text text-transparent">
            Empieza a vender 24/7.
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-slate-600 dark:text-slate-400">
          No es un chatbot. Es una IA que atiende, califica, publica, reactiva y cobra — todo en uno. 
          Tus anuncios ya traen gente. Nosotros la convertimos.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto bg-blue-700 hover:bg-blue-800">
              <Zap className="w-5 h-5 mr-2" /> Probar gratis (50 mensajes)
            </Button>
          </Link>
          <Link href="/api/auth/demo-login" prefetch={false}>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
              <ArrowRight className="w-5 h-5 mr-2" /> Entrar como Demo
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Sin tarjeta · Configuración en 5 minutos · Cancela cuando quieras
        </p>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "50+", label: "Negocios activos", color: "text-blue-700 dark:text-blue-400" },
            { value: "20K+", label: "Leads procesados", color: "text-emerald-600 dark:text-emerald-400" },
            { value: "96%", label: "Tasa de respuesta", color: "text-blue-700 dark:text-blue-400" },
            { value: "3.2x", label: "ROI promedio", color: "text-emerald-600 dark:text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className="p-4">
              <div className={`text-3xl md:text-4xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Cómo funciona <span className="text-blue-700 dark:text-blue-400">ValiAutoFlow</span>
          </h2>
          <p className="text-center text-slate-500 mb-16 max-w-xl mx-auto">
            Lo que pasa después del clic es nuestro campo de batalla.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageCircle className="w-8 h-8 text-blue-700 dark:text-blue-400" />,
                title: "1. Conecta tus canales",
                desc: "WhatsApp, Telegram, Google Calendar en un clic. JHON empieza a responder al instante con tu tono de voz y califica cada lead.",
                bg: "bg-blue-50 dark:bg-blue-950/30",
              },
              {
                icon: <Brain className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
                title: "2. La IA piensa y actúa",
                desc: "7 motores cognitivos analizan cada conversación: detectan la intención, el arquetipo del lead, y avanzan por el pipeline automáticamente.",
                bg: "bg-emerald-50 dark:bg-emerald-950/30",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-blue-700 dark:text-blue-400" />,
                title: "3. Cierra más ventas",
                desc: "MARK reactiva leads fríos por 90 días. Agenda citas, envía seguimientos y cuantifica la pérdida para que el lead no pueda decir que no.",
                bg: "bg-blue-50 dark:bg-blue-950/30",
              },
            ].map((step) => (
              <Card key={step.title} className="p-6 text-center border-0 shadow-lg">
                <div className={`w-14 h-14 mx-auto mb-4 ${step.bg} rounded-2xl flex items-center justify-center`}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POR QUÉ VALIAUTOFLOW ===== */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            No es un bot. Es tu mejor <span className="text-emerald-600 dark:text-emerald-400">agente comercial</span>.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-5 h-5" />, title: "Respuesta inmediata", desc: "JHON responde en segundos, 24/7, en WhatsApp y Telegram. Cada segundo sin respuesta es un lead perdido." },
              { icon: <Brain className="w-5 h-5" />, title: "Seguimiento cognitivo", desc: "La IA recuerda, califica, reactiva y avanza al lead por el pipeline. Sin que tú levantes un dedo." },
              { icon: <Bot className="w-5 h-5" />, title: "Marketing autopilot", desc: "MARK genera y publica contenido automático en redes. Segmenta, lanza campañas y mide resultados." },
              { icon: <Shield className="w-5 h-5" />, title: "Observabilidad total", desc: "Puedes reconstruir cada conversación, decisión y resultado. La IA nunca hace algo que no puedas auditar." },
              { icon: <Users className="w-5 h-5" />, title: "Multi-tenant", desc: "Cada cliente tiene su entorno aislado. Un sistema, decenas de negocios operando en paralelo." },
              { icon: <Calendar className="w-5 h-5" />, title: "Agenda automática", desc: "El lead pide cita → JHON revisa tu Google Calendar → confirma fecha y envía Meet automático." },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-3 p-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-700 dark:text-blue-400">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-slate-500 text-sm mt-1">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="bg-slate-50 dark:bg-slate-900/50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Planes para cada etapa de tu negocio
          </h2>
          <p className="text-center text-slate-500 mb-12 max-w-xl mx-auto">
            Desde el plan Starter para probar, hasta Enterprise con IA entrenada para tu industria.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="p-6 border-2 hover:border-blue-400 transition-colors">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Starter</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">$4,300</span>
                <span className="text-slate-500"> MXN/mes</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Implementación: $25,000 MXN</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 500 mensajes IA/mes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2 canales (WhatsApp +1)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 500 contactos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Seguimiento 30 días</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Dashboard básico</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6">Suscribirme</Button>
              </Link>
            </Card>

            {/* Pro (Destacado) */}
            <Card className="p-6 border-2 border-blue-700 relative shadow-xl scale-105">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-700 text-white">
                Más popular
              </Badge>
              <h3 className="text-lg font-semibold">Pro</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold">$7,800</span>
                <span className="text-slate-500"> MXN/mes</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Implementación: $45,000 MXN</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2,000 mensajes IA/mes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> 3 canales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Contactos ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Arquetipos psicológicos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Lead scoring avanzado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Seguimiento 90 días</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Analytics completos</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Soporte prioritario</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6 bg-blue-700 hover:bg-blue-800">Suscribirme</Button>
              </Link>
            </Card>

            {/* Enterprise */}
            <Card className="p-6 border-2 hover:border-slate-500 transition-colors">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Enterprise</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold text-slate-900 dark:text-white">$35,500</span>
                <span className="text-slate-500"> MXN/mes</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Implementación: $98,000+ MXN</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mensajes ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Todos los canales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> IA entrenada por industria</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> ValiGuard completo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> White-label disponible</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Aprendizaje automático</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Soporte dedicado 24/7</li>
              </ul>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full mt-6">Contactar ventas</Button>
              </Link>
            </Card>
          </div>

          <p className="text-center text-sm text-slate-500 mt-8">
            Todos los precios son en MXN + IVA. Implementación única. Descuentos en contratos anuales.
          </p>
        </div>
      </section>

      {/* ===== CÓDIGO DESCUENTO ===== */}
      <section className="py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <h3 className="font-semibold mb-2">¿Tienes un código de descuento?</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ej: VALIFLOW-ABC123" 
              className="flex-1 px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 text-sm"
            />
            <Button variant="outline">Aplicar</Button>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-20 text-center bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para recuperar los leads que estás perdiendo?
          </h2>
          <p className="text-slate-500 mb-8">
            JHON no duerme, no se queja y nunca olvida un seguimiento. ValiAutoFlow — la IA que vende por ti.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-6 bg-blue-700 hover:bg-blue-800">
                <Zap className="w-5 h-5 mr-2" /> Comenzar plan gratuito
              </Button>
            </Link>
            <Link href="/api/auth/demo-login" prefetch={false}>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                Ver demo en vivo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t py-8 text-center text-sm text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-emerald-500" />
            <span>© 2026 ValiAutoFlow. Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/precios" className="hover:underline">Precios</Link>
            <Link href="/privacidad" className="hover:underline">Privacidad</Link>
            <Link href="/terminos" className="hover:underline">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
