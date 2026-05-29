import { ArrowRight, Shield, Clock, Wallet } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

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
          <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-4">
            C'est le moment
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-anthracite max-w-3xl mx-auto leading-tight">
            Chaque jour sans OnMange, ce sont des{' '}
            <span className="text-primary-500">commandes que vous ne recevez pas</span>
          </h2>
          <p className="mt-5 text-lg text-gray-600 max-w-xl mx-auto">
            Rejoignez les food trucks qui ont choisi de ne plus dépendre du téléphone. Commencez
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
