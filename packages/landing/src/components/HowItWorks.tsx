import { ClipboardList, Share2, ShoppingBag } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const STEPS = [
  {
    number: 1,
    icon: ClipboardList,
    title: 'Créez votre menu',
    subtitle: 'en 10 minutes',
    description: 'Ajoutez vos plats, prix et options. Le menu est prêt en quelques clics.',
  },
  {
    number: 2,
    icon: Share2,
    title: 'Partagez votre lien',
    subtitle: 'partout',
    description:
      'Envoyez votre lien par SMS, sur vos réseaux, ou imprimez votre QR code sur le comptoir. Vos clients cliquent et commandent.',
  },
  {
    number: 3,
    icon: ShoppingBag,
    title: 'Recevez vos commandes',
    subtitle: 'en temps réel',
    description: "Une notification à chaque commande. Vous préparez, ils retirent. C'est tout.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 lg:py-28">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14 lg:mb-20">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Lancez-vous en <span className="text-primary-500">10 minutes</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Trois étapes simples pour moderniser votre food truck.
          </p>
        </AnimatedSection>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute top-24 left-[16.7%] right-[16.7%] h-0.5 bg-gradient-to-r from-primary-200 via-primary-300 to-primary-200" />

          <div className="grid lg:grid-cols-3 gap-12 lg:gap-8">
            {STEPS.map((step, i) => (
              <AnimatedSection key={step.number} delay={i * 180}>
                <div className="text-center relative">
                  {/* Step number */}
                  <div className="relative inline-flex items-center justify-center w-14 h-14 bg-primary-500 text-white text-xl font-extrabold rounded-2xl mb-8 shadow-cta z-10">
                    {step.number}
                  </div>

                  {/* Icon card */}
                  <div className="bg-white rounded-2xl shadow-card p-8 mb-6 mx-auto max-w-[240px] aspect-square flex flex-col items-center justify-center border border-gray-100">
                    <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mb-4">
                      <step.icon className="w-8 h-8 text-primary-500" />
                    </div>
                    <p className="text-sm font-semibold text-primary-500">{step.subtitle}</p>
                  </div>

                  <h3 className="text-lg font-bold text-anthracite mb-2">{step.title}</h3>
                  <p className="text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
