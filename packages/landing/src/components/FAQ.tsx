import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

interface FAQItem {
  q: string;
  a: string;
  popular?: boolean;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: '"Je ne suis pas à l\'aise avec la technologie"',
    a: "Si vous savez envoyer un SMS, vous savez utiliser OnMange. Ajoutez vos plats, partagez votre lien, c'est en ligne. On vous accompagne à chaque étape — et la plupart de nos utilisateurs sont opérationnels en moins de 15 minutes.",
    popular: true,
  },
  {
    q: '"Mes clients n\'utiliseront jamais ça"',
    a: "Vos clients n'ont rien à installer. Ils cliquent sur un lien ou scannent un QR code et commandent depuis leur navigateur — comme quand ils consultent un site web. 2 minutes, c'est plié. Les foodtrucks qui utilisent OnMange voient 20% de commandes en plus.",
  },
  {
    q: '"Mon téléphone me suffit"',
    a: "Votre téléphone fonctionne… quand vous pouvez décrocher. En plein rush, en conduisant, le soir après le service — ces commandes-là passent à la trappe. Avec OnMange, elles arrivent même quand vous n'êtes pas disponible. C'est du chiffre d'affaires en plus, pas en remplacement.",
    popular: true,
  },
  {
    q: '"Vous prenez une commission sur mes ventes ?"',
    a: 'Non, jamais. 0 % de commission, garanti. OnMange ne traite aucun paiement client. Toutes vos transactions se font sur place, directement entre vous et vos clients. Vous gardez 100 % du CA.',
  },
  {
    q: '"Je change d\'emplacement tous les jours"',
    a: "C'est justement pour ça qu'on a créé OnMange. Vous configurez votre planning une fois (lundi marché X, jeudi spot Y…), et vous modifiez n'importe quel jour en 2 clics. Vacances ? Fermez en un clic. Vos clients voient toujours les bonnes infos, au bon endroit.",
  },
  {
    q: '"29€ HT/mois, c\'est rentable ?"',
    a: "Faites le calcul : 2 à 3 commandes supplémentaires par semaine à 12 € de panier moyen = 100 à 150 € de CA en plus. Moins les 29 € HT d'abonnement = 70 à 120 € de bénéfice net. Et c'est sans compter la fidélisation, le CRM, les analytics. Les concurrents facturent 49 à 69 €/mois + 400 à 1 100 € de mise en service.",
  },
  {
    q: '"Et si je veux arrêter ?"',
    a: "Aucun engagement, aucune durée minimum. Vous résiliez en un clic depuis votre espace. Votre accès reste actif jusqu'à la fin de la période déjà payée, puis votre compte passe en lecture seule. Pas de frais cachés, pas de pénalité.",
  },
  {
    q: '"Pourquoi pas une solution de click & collect classique ?"',
    a: "Les solutions généralistes sont pensées pour des commerces fixes. Elles ne gèrent pas les emplacements qui changent, le planning d'un itinérant, ni la prise de commande sur site. En plus, elles imposent Stripe et leur propre marque. OnMange, c'est votre lien, votre marque, et vous encaissez comme vous voulez.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 lg:py-24 bg-canvas">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-12">
          <p className="text-sm font-semibold text-marine-500 uppercase tracking-wider mb-3">
            Vos questions
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-anthracite">
            On répond à vos objections
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Ce que les foodtrucks nous disent avant de s'inscrire — et pourquoi ils changent d'avis.
          </p>
        </AnimatedSection>

        <div className="max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, i) => (
            <AnimatedSection key={i} delay={i * 50}>
              <div className="border-b border-marine-100 last:border-0">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left group"
                  aria-expanded={openIndex === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span className="text-lg font-semibold text-anthracite pr-4 group-hover:text-primary-500 transition-colors flex items-center gap-2.5 flex-wrap">
                    {item.q}
                    {item.popular && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide bg-primary-100 text-primary-600 rounded-full whitespace-nowrap">
                        Populaire
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openIndex === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openIndex === i ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'
                  }`}
                >
                  <p className="text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
