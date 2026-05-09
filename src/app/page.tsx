import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Zap, Calendar, Users, TrendingUp, 
  MessageCircle, CheckCircle2, Star 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white overflow-x-hidden">
      
      {/* ===== NAVBAR ===== */}
      <header className="border-b bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">⚡ ValiAutoFlow</span>
          <div className="flex gap-3 items-center">
            <Link href="/precios" className="text-sm hover:underline hidden sm:inline">Precios</Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="sm">Iniciar Sesión</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">Comenzar gratis</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="max-w-7xl mx-auto px-4 pt-24 pb-16 text-center">
        <Badge variant="outline" className="mb-6 text-sm px-4 py-1.5">
          🚀 LATAM · Más de 500 negocios confían en IA para vender
        </Badge>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
          Automatiza tus ventas<br />
          <span className="bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
            mientras duermes
          </span>
        </h1>
        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-muted-foreground">
          JHON y MARK son agentes de IA que responden leads en WhatsApp, agendan citas en Google Calendar 
          y hacen seguimiento automático. Vos enfocate en cerrar; ellos hacen el resto.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
              <Zap className="w-5 h-5 mr-2" /> Probar gratis (50 mensajes)
            </Button>
          </Link>
          <Link href="/api/auth/demo-login" prefetch={false}>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6 w-full sm:w-auto">
              <ArrowRight className="w-5 h-5 mr-2" /> Entrar como Demo
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Sin tarjeta · Configuración en 5 minutos · Cancelá cuando quieras
        </p>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "50+", label: "Negocios activos" },
            { value: "20K+", label: "Leads procesados" },
            { value: "96%", label: "Tasa de respuesta" },
            { value: "3.2x", label: "ROI promedio" },
          ].map((stat) => (
            <div key={stat.label} className="p-4">
              <div className="text-3xl md:text-4xl font-bold text-purple-600">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className="bg-muted/50 dark:bg-white/5 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Cómo funciona <span className="text-purple-600">ValiAutoFlow</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageCircle className="w-8 h-8 text-purple-600" />,
                title: "1. Conecta tus canales",
                desc: "WhatsApp y Telegram en un clic. JHON empieza a responder al instante con tu tono de voz.",
              },
              {
                icon: <Calendar className="w-8 h-8 text-purple-600" />,
                title: "2. Agenda sin fricción",
                desc: "El lead pide cita → JHON revisa tu Google Calendar → confirma fecha y envía Meet automático.",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-purple-600" />,
                title: "3. Cierra más ventas",
                desc: "MARK hace seguimiento automático por 90 días. Leads fríos se reactivan solos.",
              },
            ].map((step) => (
              <Card key={step.title} className="p-6 text-center border-0 shadow-lg">
                <div className="w-14 h-14 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center">
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING PREVIEW ===== */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Planes para cada etapa
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Desde el plan gratuito para probar, hasta Enterprise con IA entrenada para tu industria.
          </p>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="p-6 border-2 hover:border-purple-400 transition-colors">
              <h3 className="text-lg font-semibold">Starter</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold">$4,300</span>
                <span className="text-muted-foreground"> MXN/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Implementación: $25,000 MXN</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 500 mensajes IA/mes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 2 canales (WhatsApp +1)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 500 contactos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Seguimiento 30 días</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Dashboard básico</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6">Suscribirme</Button>
              </Link>
            </Card>

            {/* Pro (Destacado) */}
            <Card className="p-6 border-2 border-purple-500 relative shadow-xl scale-105">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white">
                Más popular
              </Badge>
              <h3 className="text-lg font-semibold">Pro</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold">$7,800</span>
                <span className="text-muted-foreground"> MXN/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Implementación: $45,000 MXN</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 2,000 mensajes IA/mes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> 3 canales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Contactos ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Arquetipos psicológicos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Lead scoring avanzado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Seguimiento 90 días</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Analytics completos</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Soporte prioritario</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6 bg-purple-600 hover:bg-purple-700">Suscribirme</Button>
              </Link>
            </Card>

            {/* Enterprise */}
            <Card className="p-6 border-2 hover:border-purple-400 transition-colors">
              <h3 className="text-lg font-semibold">Enterprise</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold">$35,500</span>
                <span className="text-muted-foreground"> MXN/mes</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Implementación: $98,000+ MXN</p>
              <ul className="mt-6 space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Mensajes ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Todos los canales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> IA entrenada por industria</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> ValiGuard completo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> White-label disponible</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Aprendizaje automático</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Soporte dedicado 24/7</li>
              </ul>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full mt-6">Contactar ventas</Button>
              </Link>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Todos los precios son en MXN + IVA. Implementación única. Descuentos en contratos anuales.
          </p>
        </div>
      </section>

      {/* ===== CÓDIGO DESCUENTO ===== */}
      <section className="bg-muted/50 dark:bg-white/5 py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <h3 className="font-semibold mb-2">¿Tienes un código de descuento?</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Ej: VALIFLOW-ABC123" 
              className="flex-1 px-4 py-2 rounded-lg border bg-white dark:bg-black text-sm"
            />
            <Button variant="outline">Aplicar</Button>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            ¿Listo para recuperar los leads que estás perdiendo?
          </h2>
          <p className="text-muted-foreground mb-8">
            JHON no duerme, no se queja y nunca olvida un seguimiento. Probá gratis y veé la diferencia en 7 días.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-6">
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
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <span>© 2026 ValiAutoFlow. Todos los derechos reservados.</span>
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
