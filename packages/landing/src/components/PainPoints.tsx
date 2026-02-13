import { Clock, TrendingUp, Heart } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const OPPORTUNITIES = [
  {
    icon: Clock,
    title: 'Recevez des commandes 24h/24',
    description:
      'En conduisant, en dormant, en vacances — vos clients commandent quand ils veulent, sans vous déranger.',
  },
  {
    icon: TrendingUp,
    title: 'Vos clients commandent plus',
    description:
      "Un menu clair avec options, suppléments et formules, ça donne envie d'ajouter. Le panier moyen augmente naturellement.",
  },
  {
    icon: Heart,
    title: 'Vos clients reviennent',
    description:
      'Commander est simple, le retrait est rapide. Programme de fidélité intégré : vos habitués sont récompensés automatiquement.',
  },
];

export default function PainPoints() {
  return (
    <section id="pain-points" className="py-20 lg:py-28">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Et si vous pouviez faire <span className="text-primary-500">plus de commandes</span>,
            sans plus d'effort ?
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {OPPORTUNITIES.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 120}>
              <div className="relative bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 h-full overflow-hidden group hover:border-primary-200 hover:shadow-lg transition-all text-center">
                <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <item.icon className="w-7 h-7 text-primary-500" />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-2">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{item.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
