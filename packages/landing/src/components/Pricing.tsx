import {
  Check,
  ArrowRight,
  Sparkles,
  Flag,
  Shield,
  Smartphone,
  MessageCircle,
  Unlock,
} from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const FEATURES = [
  { label: 'Menu digital illimité', bold: true },
  { label: 'Pré-commandes par lien & QR code', bold: true },
  { label: 'Votre lien personnalisé inclus (aucune config)', bold: true },
  { label: 'Programme de fidélité', bold: true },
  { label: 'Email de confirmation & rappel client', bold: false },
  { label: 'Analytics & statistiques', bold: false },
  { label: 'Codes promo & offres', bold: false },
  { label: 'CRM clients', bold: false },
  { label: 'App iOS & Android', bold: false },
  { label: 'Support par email', bold: false },
];

const TRUST_BADGES = [
  { icon: Flag, label: 'Données en France' },
  { icon: Shield, label: 'Conforme RGPD' },
  { icon: Smartphone, label: 'App iOS & Android' },
  { icon: MessageCircle, label: 'Support réactif' },
  { icon: Unlock, label: 'Sans engagement' },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 lg:py-28 bg-gray-50/70">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Un seul tarif, <span className="text-primary-500">tout inclus</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            <span className="font-semibold text-anthracite">0€ de mise en service</span> (les
            concurrents facturent 400 à 1 100€). Et{' '}
            <span className="font-semibold text-anthracite">29€/mois</span> pour tout — là où
            d'autres facturent 49 à 69€ pour les mêmes fonctionnalités.
          </p>
        </AnimatedSection>

        <AnimatedSection animation="scale-in">
          <div className="max-w-md mx-auto">
            <div className="relative bg-white rounded-3xl shadow-xl ring-2 ring-primary-100 overflow-hidden">
              {/* Launch badge — bigger */}
              <div className="absolute top-5 right-5 z-10">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 text-white text-sm font-bold rounded-full shadow-lg">
                  <Sparkles className="w-3.5 h-3.5" />
                  Offre de lancement
                </div>
              </div>

              {/* Header */}
              <div className="bg-gradient-to-br from-primary-500 via-primary-500 to-primary-600 px-8 pt-10 pb-7 text-center">
                <p className="text-primary-100 text-sm font-semibold uppercase tracking-wider">
                  Tout inclus
                </p>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-6xl font-extrabold text-white">29€</span>
                  <span className="text-primary-200 text-xl font-medium">/mois</span>
                </div>
                <p className="text-primary-100/80 text-sm mt-2">
                  Soit moins de 1€ par jour · 0€ de mise en service
                </p>
              </div>

              {/* Features */}
              <div className="px-8 py-8">
                <ul className="space-y-3.5">
                  {FEATURES.map((feature) => (
                    <li key={feature.label} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-success-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-success-500" />
                      </div>
                      <span
                        className={`text-sm ${feature.bold ? 'font-bold text-anthracite' : 'font-medium text-gray-700'}`}
                      >
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#hero"
                  className="mt-8 flex items-center justify-center gap-2 w-full py-4 text-base font-bold text-white bg-primary-500 rounded-2xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98]"
                >
                  Rejoindre la liste d'attente
                  <ArrowRight className="w-4 h-4" />
                </a>

                <p className="mt-4 text-center text-xs text-gray-400">
                  0€ de mise en service · Sans commission · Sans engagement
                </p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Trust badges — merged from TrustSection */}
        <AnimatedSection delay={200}>
          <div className="mt-16 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6">
              {TRUST_BADGES.map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-100"
                >
                  <badge.icon className="w-5 h-5 text-primary-500" />
                  <span className="text-sm font-medium text-gray-700">{badge.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 text-gray-500 max-w-lg mx-auto">
              En tant que <span className="font-semibold text-anthracite">membre fondateur</span>,
              vous bénéficiez d'un accompagnement personnalisé et votre avis façonnera les futures
              évolutions.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
