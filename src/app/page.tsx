import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Zap, Calendar, Users, TrendingUp,
  MessageCircle, CheckCircle2, Star, Shield, Brain, Bot,

} from "lucide-react";

// ============================================================
// VALIAUTOFLOW LANDING PAGE — Brand Definition Applied
// ============================================================
// Brand Colors: Blue Deep (#1e3a5f) + Mint Green (#34d399) + Dark Gray (#111827)
// Brand Voice: Directo, sin rodeos, con autoridad técnica.
// Tagline: "Deja de perder leads. Empieza a vender 24/7."
// UVP: Lo que pasa después del clic es nuestro campo de batalla.
// ============================================================

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-brand-gray-dark text-gray-900 dark:text-white overflow-x-hidden">

      {/* ===== NAVBAR ===== */}
      <header className="border-b border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-brand-gray-dark/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-mint flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">ValiAutoFlow</span>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/precios" className="text-sm hover:underline hidden sm:inline text-gray-600 dark:text-gray-400">
              Precios
            </Link>
            <Link href="/auth/signin">
              <Button variant="outline" size="sm" className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5">
                Iniciar Sesi&oacute;n
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="bg-brand-blue hover:bg-brand-blue-deep text-white">
                Comenzar gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative max-w-7xl mx-auto px-4 pt-28 pb-20 text-center">
        {/* Subtle brand gradient background orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-brand-blue/5 via-brand-mint/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <Badge
          variant="outline"
          className="mb-6 text-sm px-4 py-1.5 border-brand-mint/30 text-brand-mint-dark dark:text-brand-mint bg-brand-mint/5"
        >
          Primer Sistema Operativo Comercial Cognitivo de LATAM
        </Badge>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight relative">
          Deja de perder leads.<br />
          <span className="gradient-brand-text">
            Empieza a vender 24/7.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-gray-600 dark:text-gray-400">
          No es un chatbot. Es una IA que atiende, califica, publica, reactiva y cobra &mdash; todo en uno.
          Tus anuncios ya traen gente. Nosotros la convertimos.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button
              size="lg"
              className="text-lg px-8 py-6 w-full sm:w-auto bg-brand-blue hover:bg-brand-blue-deep text-white brand-glow"
            >
              <Zap className="w-5 h-5 mr-2" /> Probar gratis (50 mensajes)
            </Button>
          </Link>
          <Link href="/api/auth/demo-login" prefetch={false}>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6 w-full sm:w-auto border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5"
            >
              <ArrowRight className="w-5 h-5 mr-2" /> Entrar como Demo
            </Button>
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Sin tarjeta &middot; Configuraci&oacute;n en 5 minutos &middot; Cancela cuando quieras
        </p>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "50+", label: "Negocios activos", color: "text-brand-blue" },
            { value: "20K+", label: "Leads procesados", color: "text-brand-mint-dark dark:text-brand-mint" },
            { value: "96%", label: "Tasa de respuesta", color: "text-brand-blue" },
            { value: "3.2x", label: "ROI promedio", color: "text-brand-mint-dark dark:text-brand-mint" },
          ].map((stat) => (
            <div key={stat.label} className="p-4">
              <div className={`text-3xl md:text-4xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CÓMO FUNCIONA ===== */}
      <section className="bg-gray-50 dark:bg-brand-gray/50 py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            C&oacute;mo funciona <span className="text-brand-blue">ValiAutoFlow</span>
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">
            Lo que pasa despu&eacute;s del clic es nuestro campo de batalla.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageCircle className="w-8 h-8 text-brand-blue" />,
                title: "1. Conecta tus canales",
                desc: "WhatsApp, Telegram, Google Calendar en un clic. JHON empieza a responder al instante con tu tono de voz y califica cada lead que llega. Cada conversaci\u00f3n es una oportunidad que no se escapa.",
                bg: "bg-brand-blue/10 dark:bg-brand-blue/20",
              },
              {
                icon: <Brain className="w-8 h-8 text-brand-mint-dark dark:text-brand-mint" />,
                title: "2. La IA piensa y act\u00faa",
                desc: "7 motores cognitivos analizan cada conversaci\u00f3n: detectan la intenci\u00f3n, el arquetipo del lead, y avanzan por el pipeline autom\u00e1ticamente. Sin intervenci\u00f3n humana. Sin perder el contexto.",
                bg: "bg-brand-mint/10 dark:bg-brand-mint/20",
              },
              {
                icon: <TrendingUp className="w-8 h-8 text-brand-blue" />,
                title: "3. Cierra m\u00e1s ventas",
                desc: "MARK reactiva leads fr\u00edos por 90 d\u00edas. Agenda citas, env\u00eda seguimientos y cuantifica la p\u00e9rdida para que el lead no pueda decir que no. Tu funnel nunca se enfr\u00eda.",
                bg: "bg-brand-blue/10 dark:bg-brand-blue/20",
              },
            ].map((step) => (
              <Card
                key={step.title}
                className="p-6 text-center border-0 shadow-lg brand-card-hover bg-white dark:bg-brand-gray"
              >
                <div className={`w-14 h-14 mx-auto mb-4 ${step.bg} rounded-2xl flex items-center justify-center`}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== POR QUÉ VALIAUTOFLOW ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            No es un bot. Es tu mejor{" "}
            <span className="text-brand-mint-dark dark:text-brand-mint">agente comercial</span>.
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            JHON no duerme, no se queja y nunca olvida un seguimiento. MARK no descansa, publica y reactiva.
            ValiGuard audita cada decisi\u00f3n. Todo funciona sin que levantes un dedo.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Zap className="w-5 h-5" />, title: "Respuesta inmediata", desc: "JHON responde en segundos, 24/7, en WhatsApp y Telegram. Cada segundo sin respuesta es un lead perdido. Nosotros lo eliminamos." },
              { icon: <Brain className="w-5 h-5" />, title: "Seguimiento cognitivo", desc: "La IA recuerda, califica, reactiva y avanza al lead por el pipeline. Sin que t\u00fa levantes un dedo. El contexto nunca se pierde." },
              { icon: <Bot className="w-5 h-5" />, title: "Marketing autopilot", desc: "MARK genera y publica contenido autom\u00e1tico en redes. Segmenta, lanza campa\u00f1as y mide resultados. Tu presencia digital nunca se apaga." },
              { icon: <Shield className="w-5 h-5" />, title: "Observabilidad total", desc: "Puedes reconstruir cada conversaci\u00f3n, decisi\u00f3n y resultado. La IA nunca hace algo que no puedas auditar. Transparencia total." },
              { icon: <Users className="w-5 h-5" />, title: "Multi-tenant", desc: "Cada cliente tiene su entorno aislado. Un sistema, decenas de negocios operando en paralelo. Datos separados, resultados multiplicados." },
              { icon: <Calendar className="w-5 h-5" />, title: "Agenda autom\u00e1tica", desc: "El lead pide cita \u2192 JHON revisa tu Google Calendar \u2192 confirma fecha y env\u00eda Meet autom\u00e1tico. Cero fricci\u00f3n." },
            ].map((feature) => (
              <div key={feature.title} className="flex gap-3 p-4 brand-card-hover rounded-xl">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-brand-blue">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== LOS 7 CARNALES ===== */}
      <section className="bg-gray-50 dark:bg-brand-gray/50 py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            7 motores, un solo <span className="text-brand-blue">sistema</span>
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-xl mx-auto">
            Cada Carnal tiene un rol espec\u00edfico. Juntos, convierten clics en clientes.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { name: "JHON", role: "Agente de Ventas", desc: "Atiende, califica y avanza leads por WhatsApp y Telegram con tu voz de marca.", color: "bg-brand-blue" },
              { name: "MARK", role: "Agente de Marketing", desc: "Publica, segmenta y reactiva leads fr\u00edos con campa\u00f1as autom\u00e1ticas.", color: "bg-brand-mint-dark" },
              { name: "ORCHESTRATOR", role: "Director de Flujo", desc: "Decide qu\u00e9 agente interviene y cu\u00e1ndo. Coordina toda la operaci\u00f3n.", color: "bg-brand-gray-mid" },
              { name: "MEMORY ENGINE", role: "Memoria Contextual", desc: "Recuerda cada interacci\u00f3n. El contexto nunca se pierde entre sesiones.", color: "bg-brand-blue" },
              { name: "ROUTING ENGINE", role: "Enrutamiento Inteligente", desc: "Deriva conversaciones al agente o canal correcto autom\u00e1ticamente.", color: "bg-brand-mint-dark" },
              { name: "FOLLOWUP ENGINE", role: "Seguimiento 90 d\u00edas", desc: "Secuencias de seguimiento que nunca dejan enfriar un lead.", color: "bg-brand-gray-mid" },
              { name: "OBSERVABILITY", role: "Auditor\u00eda Total", desc: "Rastrea cada decisi\u00f3n, cada costo y cada resultado en tiempo real.", color: "bg-brand-blue" },
            ].map((carnal) => (
              <div key={carnal.name} className="p-4 rounded-xl bg-white dark:bg-brand-gray-dark border border-gray-200/50 dark:border-white/5 brand-card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${carnal.color}`} />
                  <span className="font-mono text-xs font-bold tracking-wider text-brand-blue">{carnal.name}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{carnal.role}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{carnal.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Planes para cada etapa de tu negocio
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto">
            Desde el plan Starter para probar, hasta Enterprise con IA entrenada para tu industria.
          </p>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="p-6 border-2 border-gray-200 dark:border-white/10 hover:border-brand-blue/40 transition-colors brand-card-hover">
              <h3 className="text-lg font-semibold">Starter</h3>
              <p className="text-sm text-gray-500 mt-0.5">Para comenzar a automatizar</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">$4,300</span>
                <span className="text-gray-500"> MXN/mes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Implementaci&oacute;n: <span className="font-semibold">$25,000 MXN</span></p>
              <ul className="mt-6 space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> 500 mensajes IA/mes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> 2 canales (WhatsApp +1)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> 500 contactos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Seguimiento 30 d&iacute;as</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Dashboard b&aacute;sico</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6 bg-white text-brand-blue border-2 border-brand-blue/30 hover:bg-brand-blue/5" variant="outline">
                  Suscribirme
                </Button>
              </Link>
            </Card>

            {/* Pro (Destacado) */}
            <Card className="p-6 border-2 border-brand-blue relative shadow-xl scale-105 brand-glow">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-blue text-white border-0">
                M&aacute;s popular
              </Badge>
              <h3 className="text-lg font-semibold">Pro</h3>
              <p className="text-sm text-gray-500 mt-0.5">Para escalar tu operaci&oacute;n</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">$7,800</span>
                <span className="text-gray-500"> MXN/mes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Implementaci&oacute;n: <span className="font-semibold">$45,000 MXN</span></p>
              <ul className="mt-6 space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> 2,000 mensajes IA/mes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> 3 canales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Contactos ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Arquetipos psicol&oacute;gicos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Lead scoring avanzado</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Seguimiento 90 d&iacute;as</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Analytics completos</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Soporte prioritario</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6 bg-brand-blue hover:bg-brand-blue-deep text-white">
                  Suscribirme
                </Button>
              </Link>
            </Card>

            {/* Enterprise */}
            <Card className="p-6 border-2 border-gray-200 dark:border-white/10 hover:border-brand-blue/40 transition-colors brand-card-hover">
              <h3 className="text-lg font-semibold">Enterprise</h3>
              <p className="text-sm text-gray-500 mt-0.5">IA entrenada para tu industria</p>
              <div className="mt-4">
                <span className="text-4xl font-bold">$35,500</span>
                <span className="text-gray-500"> MXN/mes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Implementaci&oacute;n: <span className="font-semibold">$98,000+ MXN</span></p>
              <ul className="mt-6 space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Mensajes ilimitados</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Todos los canales</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> IA entrenada por industria</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> ValiGuard completo</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> White-label disponible</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-brand-mint flex-shrink-0" /> Aprendizaje autom&aacute;tico</li>
                <li className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500 flex-shrink-0" /> Soporte dedicado 24/7</li>
              </ul>
              <Link href="/auth/register">
                <Button className="w-full mt-6 bg-white text-brand-blue border-2 border-brand-blue/30 hover:bg-brand-blue/5" variant="outline">
                  Contactar ventas
                </Button>
              </Link>
            </Card>
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Todos los precios son en MXN + IVA. Implementaci&oacute;n &uacute;nica. Descuentos en contratos anuales.
          </p>
        </div>
      </section>

      {/* ===== TESTIMONIAL / CASE STUDY ===== */}
      <section className="bg-gray-50 dark:bg-brand-gray/50 py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">
            Resultados que <span className="text-brand-mint-dark dark:text-brand-mint">hablan solos</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "Antes perd\u00eda el 60% de leads fuera de horario. Ahora JHON los atiende todos y agenda citas autom\u00e1tico.",
                name: "Taller Mec\u00e1nico L\u00f3pez",
                metric: "+180% citas agendadas",
              },
              {
                quote: "MARK reactiv\u00f3 400 leads fr\u00edos que ten\u00edamos olvidados. Generamos $85K MXN en el primer mes.",
                name: "Cl\u00ednica Dental Sonrisa",
                metric: "$85K MXN recuperados",
              },
              {
                quote: "La observabilidad me da paz. Puedo ver exactamente qu\u00e9 hace la IA y por qu\u00e9. Cero sorpresas.",
                name: "Inmobiliaria del Valle",
                metric: "96% tasa de respuesta",
              },
            ].map((testimonial) => (
              <Card key={testimonial.name} className="p-6 text-left border-0 shadow-lg bg-white dark:bg-brand-gray-dark brand-card-hover">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold">{testimonial.name}</span>
                  <Badge className="bg-brand-mint/10 text-brand-mint-dark dark:text-brand-mint border-0 text-xs">
                    {testimonial.metric}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CÓDIGO DESCUENTO ===== */}
      <section className="py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <h3 className="font-semibold mb-2">&iquest;Tienes un c&oacute;digo de descuento?</h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ej: VALIFLOW-ABC123"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-brand-gray-dark text-sm focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue/30 outline-none"
            />
            <Button variant="outline" className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5">Aplicar</Button>
          </div>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-brand-blue/5 to-brand-mint/5 dark:from-brand-gray-dark dark:via-brand-blue/10 dark:to-brand-mint/5 pointer-events-none" />

        <div className="max-w-2xl mx-auto px-4 relative">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            &iquest;Listo para recuperar los leads que est&aacute;s perdiendo?
          </h2>
          <p className="text-gray-500 mb-8 text-lg">
            JHON no duerme, no se queja y nunca olvida un seguimiento. ValiAutoFlow &mdash; la IA que vende por ti.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8 py-6 bg-brand-blue hover:bg-brand-blue-deep text-white brand-glow">
                <Zap className="w-5 h-5 mr-2" /> Comenzar plan gratuito
              </Button>
            </Link>
            <Link href="/api/auth/demo-login" prefetch={false}>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/5">
                Ver demo en vivo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-gray-200/50 dark:border-white/10 py-8 text-center text-sm text-gray-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-brand-blue to-brand-mint flex items-center justify-center">
              <Brain className="w-3 h-3 text-white" />
            </div>
            <span>&copy; 2026 ValiAutoFlow. Todos los derechos reservados.</span>
          </div>
          <div className="flex gap-4">
            <Link href="/precios" className="hover:underline">Precios</Link>
            <Link href="/privacidad" className="hover:underline">Privacidad</Link>
            <Link href="/terminos" className="hover:underline">T&eacute;rminos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
