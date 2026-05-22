import { PhoneOff, Clock, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const PROBLEMS = [
  {
    icon: PhoneOff,
    stat: '3 à 5',
    statLabel: 'appels manqués par service',
    title: 'Vous perdez des commandes chaque jour',
    description:
      "En plein rush, en conduisant, le soir après le service — vous ne pouvez pas toujours décrocher. Chaque appel manqué, c'est un client qui va voir ailleurs.",
  },
  {
    icon: Clock,
    stat: '0',
    statLabel: 'commande entre les services',
    title: 'Votre camion est fermé 18h par jour',
    description:
      "Entre deux services, votre activité s'arrête. Pas de commandes le soir, pas de commandes le matin. Vos clients ne peuvent commander que quand vous êtes là.",
  },
  {
    icon: Users,
    stat: '70%',
    statLabel: 'de clients ne reviennent pas',
    title: 'Vos clients vous oublient',
    description:
      'Sans outil de fidélité ni de rappel, même vos meilleurs clients finissent par oublier de revenir. Vous repartez à zéro chaque semaine.',
  },
];

export default function PainPoints() {
  return (
    <section id="pain-points" className="py-20 lg:py-28">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">
            Le problème
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Vous laissez du chiffre d'affaires{' '}
            <span className="text-primary-500">sur la table</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Les food trucks perdent en moyenne 20% de commandes potentielles. Voici pourquoi.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {PROBLEMS.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 120}>
              <div className="relative bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 h-full overflow-hidden group hover:border-primary-200 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-primary-500" />
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-primary-500">{item.stat}</span>
                  <span className="text-sm text-gray-400 ml-1.5">{item.statLabel}</span>
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
