import { Flag, Shield, Smartphone, MessageCircle, Unlock } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const BADGES = [
  { icon: Flag, label: 'Donnees en France' },
  { icon: Shield, label: 'Conforme RGPD' },
  { icon: Smartphone, label: 'App iOS & Android' },
  { icon: MessageCircle, label: 'Support reactif' },
  { icon: Unlock, label: 'Sans engagement' },
];

export default function TrustSection() {
  return (
    <section className="py-16 lg:py-24 bg-gray-50/50">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-anthracite mb-4">
            Rejoignez les premiers foodtrucks a{' '}
            <span className="text-primary-500">digitaliser</span> leurs commandes
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-10">
            En tant que membre fondateur, vous beneficiez d'un accompagnement personnalise et votre
            avis faconnera les futures evolutions du produit.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div className="flex flex-wrap items-center justify-center gap-6 lg:gap-10">
            {BADGES.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-2.5 px-4 py-3 bg-white rounded-xl shadow-card"
              >
                <badge.icon className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-gray-700">{badge.label}</span>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
