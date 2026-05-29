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
    iconBg: 'bg-corail-50',
    iconColor: 'text-corail-500',
    title: 'En ligne en 10 minutes',
    description:
      'Votre lien personnalisé (votrenom.onmange.app) est prêt instantanément. Rien à installer, rien à configurer.',
  },
  {
    icon: Clock,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-500',
    title: 'Commandes 24h/24',
    description:
      'Vos clients commandent la veille, le matin, pendant le rush. Vous ne ratez plus aucune vente.',
  },
  {
    icon: ShoppingBag,
    iconBg: 'bg-corail-50',
    iconColor: 'text-corail-500',
    title: 'Commandes sur place aussi',
    description:
      "Prise de commande directe depuis votre tableau de bord. Fini les post-it et l'attente au comptoir.",
  },
  {
    icon: MapPin,
    iconBg: 'bg-marine-50',
    iconColor: 'text-marine-500',
    title: 'Multi-emplacements en 2 clics',
    description:
      "Lundi marché, jeudi zone industrielle ? Votre planning s'adapte. Vacances ? Un clic pour fermer.",
  },
  {
    icon: UtensilsCrossed,
    iconBg: 'bg-corail-50',
    iconColor: 'text-corail-500',
    title: 'Menu 100% personnalisable',
    description:
      'Options, suppléments, formules, plat du jour, offres. Rupture de stock ? Désactivez en un clic.',
  },
  {
    icon: Wallet,
    iconBg: 'bg-success-50',
    iconColor: 'text-success-500',
    title: 'Vous gardez 100% de vos paiements',
    description:
      "Aucune commission, aucun intermédiaire. Vos clients paient sur place, comme d'habitude. C'est vous le patron.",
    highlight: true,
  },
  {
    icon: Mail,
    iconBg: 'bg-error-50',
    iconColor: 'text-error-500',
    title: 'Zéro no-show',
    description:
      "Confirmation automatique + rappel avant le retrait. Vos clients n'oublient plus de venir chercher leur commande.",
  },
  {
    icon: BarChart3,
    iconBg: 'bg-marine-50',
    iconColor: 'text-marine-500',
    title: 'Décidez avec des données',
    description:
      'Plats stars, heures de pointe, meilleurs emplacements. Arrêtez de deviner, regardez vos chiffres.',
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="py-20 lg:py-28 bg-sand-100">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <p className="text-sm font-semibold text-primary-500 uppercase tracking-wider mb-3">
            La solution
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-anthracite">
            Conçu pour les foodtrucks. <span className="text-primary-500">Vraiment.</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Pas un outil générique. OnMange comprend votre quotidien — emplacements qui changent,
            rush du midi, congés imprévus.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {BENEFITS.map((benefit, i) => (
            <AnimatedSection key={benefit.title} delay={i * 80}>
              <div
                className={`rounded-2xl p-6 lg:p-7 transition-all duration-300 h-full group hover:-translate-y-0.5 ${
                  benefit.highlight
                    ? 'bg-success-50 ring-2 ring-success-500/20 shadow-card hover:shadow-card-hover'
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
