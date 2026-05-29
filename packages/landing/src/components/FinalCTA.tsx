import { ArrowRight, Shield, Clock, Wallet } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

function IllustrationFoodtruckQueue() {
  return (
    <svg
      width="150"
      height="150"
      viewBox="0 0 150 150"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary-500"
      role="img"
      aria-label="Foodtruck avec file de clients"
    >
      {/* Truck body */}
      <path d="M10 105 L10 65 L38 65 L45 50 L95 50 L95 105" />
      {/* Service window open */}
      <rect x="52" y="58" width="22" height="18" rx="3" />
      {/* Awning */}
      <path d="M48 50 L48 42 Q70 35 98 42 L98 50" />
      <path d="M55 43 Q63 40 72 43" />
      <path d="M78 41 Q85 38 92 41" />
      {/* Wheels */}
      <circle cx="28" cy="105" r="9" />
      <circle cx="28" cy="105" r="4" />
      <circle cx="82" cy="105" r="9" />
      <circle cx="82" cy="105" r="4" />
      {/* Smoke */}
      <path d="M42 50 L42 40" />
      <path d="M39 36 Q42 30 45 36" />
      {/* Heart above truck */}
      <path d="M68 30 Q68 24 74 24 Q80 24 80 30 Q80 36 74 42 Q68 36 68 30" />
      {/* Star */}
      <path
        d="M55 28 L57 22 L59 28 L65 28 L60 32 L62 38 L57 34 L52 38 L54 32 L49 28 Z"
        strokeWidth="1.5"
      />
      {/* Ground line */}
      <line x1="0" y1="114" x2="150" y2="114" strokeWidth="1" opacity="0.4" />
      {/* Customer 1 - closest */}
      <circle cx="108" cy="88" r="6" />
      <path d="M102 114 Q102 100 108 96 Q114 100 114 114" />
      {/* Customer 2 */}
      <circle cx="122" cy="86" r="5.5" />
      <path d="M117 114 Q117 98 122 94 Q127 98 127 114" />
      {/* Customer 3 */}
      <circle cx="135" cy="87" r="5" />
      <path d="M130 114 Q130 100 135 95 Q140 100 140 114" />
      {/* Customer 1 arm reaching for window */}
      <line x1="102" y1="100" x2="96" y2="92" />
    </svg>
  );
}

const GUARANTEES = [
  { icon: Clock, text: '14 jours gratuits' },
  { icon: Wallet, text: '0% de commission' },
  { icon: Shield, text: 'Sans engagement' },
];

export default function FinalCTA() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-primary-50 to-primary-100/60 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl" />

      <div className="section-container section-padding text-center relative z-10">
        <AnimatedSection>
          <div className="mb-6">
            <IllustrationFoodtruckQueue />
          </div>
          <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
            C'est le moment
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-anthracite max-w-3xl mx-auto leading-tight">
            Chaque jour sans OnMange, ce sont des{' '}
            <span className="text-primary-500">commandes que vous ne recevez pas</span>
          </h2>
          <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto">
            Rejoignez les foodtrucks qui ont choisi de ne plus dépendre du téléphone. Commencez
            gratuitement, voyez les résultats.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {GUARANTEES.map((g) => (
              <div
                key={g.text}
                className="flex items-center gap-2 px-4 py-2 bg-white/70 rounded-full text-sm font-medium text-gray-700"
              >
                <g.icon className="w-4 h-4 text-primary-500" />
                {g.text}
              </div>
            ))}
          </div>

          <a
            href="https://pro.onmange.app/register"
            className="mt-8 inline-flex items-center justify-center gap-2 px-10 py-5 text-lg font-bold text-white bg-primary-500 rounded-2xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98]"
          >
            Essayer gratuitement pendant 14 jours
            <ArrowRight className="w-5 h-5" />
          </a>

          <p className="mt-4 text-sm text-gray-500">
            Aucune carte bancaire requise · Annulation en 1 clic
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
