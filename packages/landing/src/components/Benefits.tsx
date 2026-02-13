import {
  Clock,
  MapPin,
  UtensilsCrossed,
  ShoppingBag,
  Wallet,
  Mail,
  BarChart3,
  Globe,
} from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const BENEFITS = [
  {
    icon: Globe,
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
    title: 'Votre page prête en 10 minutes',
    description:
      "Pas besoin d'acheter un nom de domaine ni de configurer quoi que ce soit. Vous obtenez votre lien personnalisé immédiatement.",
  },
  {
    icon: Clock,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    title: 'Commandes 24h/24',
    description:
      'Vos clients commandent à toute heure via votre lien ou QR code. Acceptation automatique ou manuelle, à vous de choisir.',
  },
  {
    icon: ShoppingBag,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-500',
    title: 'Prenez les commandes sur site',
    description: 'Depuis votre tableau de bord, prenez les commandes sans arrêter de cuisiner.',
  },
  {
    icon: MapPin,
    iconBg: 'bg-green-50',
    iconColor: 'text-green-600',
    title: 'Emplacements & horaires flexibles',
    description:
      "Configurez votre planning hebdomadaire une fois, modifiez n'importe quel jour en 2 clics. Vacances ? Fermez votre établissement en un clic.",
  },
  {
    icon: UtensilsCrossed,
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-500',
    title: 'Menus et offres configurables',
    description:
      'Catégories, options, tailles, suppléments, formules, codes promo, plat du jour — vous configurez tout. Rupture de stock ? Un clic.',
  },
  {
    icon: Wallet,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    title: 'Vous encaissez comme vous voulez',
    description:
      "OnMange gère les commandes, pas les paiements. Vos clients paient sur place, comme d'habitude.",
    highlight: true,
  },
  {
    icon: Mail,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-500',
    title: 'Confirmation & rappels par email',
    description:
      "Le client reçoit un email quand sa commande est acceptée. Si elle a été passée à l'avance, un rappel lui est envoyé avant le retrait. Vous recevez un résumé de chaque commande.",
  },
  {
    icon: BarChart3,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    title: 'Comprenez votre activité',
    description:
      'Plats vendus, heures de pointe, fidélité client. Des stats simples pour faire les bons choix.',
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 lg:py-28 bg-gray-50/70">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Conçu pour les food trucks. <span className="text-primary-500">Vraiment.</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Pas un outil générique : OnMange comprend votre quotidien — emplacements qui changent,
            rush du midi, congés imprévus.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {BENEFITS.map((benefit, i) => (
            <AnimatedSection key={benefit.title} delay={i * 80}>
              <div
                className={`rounded-2xl p-6 lg:p-7 transition-all duration-300 h-full group hover:-translate-y-0.5 ${
                  benefit.highlight
                    ? 'bg-emerald-50 ring-2 ring-emerald-200 shadow-card hover:shadow-card-hover'
                    : 'bg-white shadow-card hover:shadow-card-hover'
                }`}
              >
                <div
                  className={`w-14 h-14 ${benefit.iconBg} rounded-2xl flex items-center justify-center mb-4`}
                >
                  <benefit.icon className={`w-7 h-7 ${benefit.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-anthracite mb-1.5">{benefit.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
