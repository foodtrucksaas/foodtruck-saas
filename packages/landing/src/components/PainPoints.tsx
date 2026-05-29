import { PhoneOff, Clock, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

function IllustrationPhone() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary-500"
      role="img"
      aria-label="Téléphone qui sonne sans réponse"
    >
      {/* Vintage phone body */}
      <path d="M35 40 L35 75 Q35 80 40 80 L60 80 Q65 80 65 75 L65 40 Q65 35 60 35 L40 35 Q35 35 35 40" />
      {/* Earpiece */}
      <path d="M40 28 Q50 22 60 28" strokeWidth="3" />
      {/* Screen */}
      <rect x="40" y="43" width="20" height="15" rx="2" />
      {/* Dial buttons */}
      <circle cx="45" cy="65" r="2" />
      <circle cx="50" cy="65" r="2" />
      <circle cx="55" cy="65" r="2" />
      <circle cx="45" cy="72" r="2" />
      <circle cx="50" cy="72" r="2" />
      <circle cx="55" cy="72" r="2" />
      {/* Ring vibration lines - left */}
      <path d="M25 30 Q20 37 25 44" />
      <path d="M18 27 Q12 37 18 47" />
      {/* Ring vibration lines - right */}
      <path d="M75 30 Q80 37 75 44" />
      <path d="M82 27 Q88 37 82 47" />
      {/* X mark - missed call */}
      <line x1="44" y1="47" x2="56" y2="55" />
      <line x1="56" y1="47" x2="44" y2="55" />
    </svg>
  );
}

function IllustrationLocked() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary-500"
      role="img"
      aria-label="Foodtruck fermé avec cadenas"
    >
      {/* Mini truck body */}
      <path d="M20 72 L20 52 L42 52 L48 42 L80 42 L80 72" />
      {/* Service window shuttered */}
      <rect x="52" y="48" width="18" height="14" rx="2" />
      <line x1="52" y1="52" x2="70" y2="52" strokeWidth="1" />
      <line x1="52" y1="56" x2="70" y2="56" strokeWidth="1" />
      <line x1="52" y1="60" x2="70" y2="60" strokeWidth="1" />
      {/* Wheels */}
      <circle cx="32" cy="72" r="7" />
      <circle cx="32" cy="72" r="3" />
      <circle cx="70" cy="72" r="7" />
      <circle cx="70" cy="72" r="3" />
      {/* Ground */}
      <line x1="10" y1="79" x2="90" y2="79" strokeWidth="1" opacity="0.4" />
      {/* Padlock */}
      <rect x="40" y="22" width="20" height="16" rx="3" />
      <path d="M44 22 L44 16 Q44 8 50 8 Q56 8 56 16 L56 22" />
      <circle cx="50" cy="30" r="2" />
      <line x1="50" y1="32" x2="50" y2="35" />
    </svg>
  );
}

function IllustrationForgotten() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary-500"
      role="img"
      aria-label="Clients qui s'éloignent"
    >
      {/* Person 1 walking away - far */}
      <circle cx="22" cy="35" r="5" />
      <path d="M17 72 Q17 55 22 50 Q27 55 27 72" />
      <line x1="17" y1="58" x2="12" y2="52" />
      <line x1="27" y1="58" x2="32" y2="52" />
      {/* Person 2 walking away - mid */}
      <circle cx="42" cy="30" r="6" />
      <path d="M36 72 Q36 50 42 44 Q48 50 48 72" />
      <line x1="36" y1="54" x2="30" y2="47" />
      <line x1="48" y1="54" x2="54" y2="47" />
      {/* Person 3 walking away - near */}
      <circle cx="65" cy="28" r="7" />
      <path d="M58 72 Q58 48 65 40 Q72 48 72 72" />
      <line x1="58" y1="50" x2="51" y2="42" />
      <line x1="72" y1="50" x2="79" y2="42" />
      {/* Question mark floating */}
      <path d="M82 18 Q82 10 88 10 Q94 10 94 16 Q94 20 88 22 L88 25" />
      <circle cx="88" cy="29" r="1.5" />
      {/* Ground */}
      <line x1="5" y1="79" x2="95" y2="79" strokeWidth="1" opacity="0.4" />
    </svg>
  );
}

const ILLUSTRATIONS = [IllustrationPhone, IllustrationLocked, IllustrationForgotten];

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
    <section id="pain-points" className="py-20 lg:py-28 bg-canvas">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <p className="text-sm font-semibold text-marine-500 uppercase tracking-wider mb-3">
            Le problème
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-anthracite">
            Vous laissez du chiffre d'affaires{' '}
            <span className="text-primary-500">sur la table</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Les foodtrucks perdent en moyenne 20% de commandes potentielles. Voici pourquoi.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {PROBLEMS.map((item, i) => {
            const Illustration = ILLUSTRATIONS[i];
            return (
              <AnimatedSection key={item.title} delay={i * 120}>
                <div className="relative bg-white border border-gray-200 rounded-2xl p-6 lg:p-8 h-full overflow-hidden group hover:border-primary-200 hover:shadow-lg transition-all">
                  <div className="flex justify-center mb-4">
                    <Illustration />
                  </div>
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
