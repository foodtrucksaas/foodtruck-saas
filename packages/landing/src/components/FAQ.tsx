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
    q: "Je ne suis pas à l'aise avec la technologie",
    a: "OnMange a été conçu pour être aussi simple qu'un smartphone. Créez votre menu, partagez votre lien, et c'est parti. On est là pour vous accompagner à chaque étape.",
    popular: true,
  },
  {
    q: "Mes clients n'utiliseront pas ça",
    a: "Rien à télécharger, rien à installer. Vos clients cliquent sur votre lien ou scannent un QR code et commandent depuis leur navigateur en 2 minutes. C'est comme consulter un site web.",
  },
  {
    q: "J'ai déjà mon téléphone, ça marche",
    a: "Ça marche… quand vous pouvez décrocher. En plein rush, en conduisant, le soir après le service — toutes ces commandes passent à la trappe. Avec OnMange, elles arrivent même quand vous n'êtes pas disponible.",
    popular: true,
  },
  {
    q: "C'est un outil de comptabilité ?",
    a: 'Non. OnMange gère uniquement les commandes : le quoi, le quand, pour qui. Les paiements se font sur place, directement entre vous et vos clients. Aucune transaction financière ne passe par OnMange.',
  },
  {
    q: "Je change d'emplacement et d'horaires tout le temps",
    a: "C'est justement le cœur d'OnMange. Vous configurez votre planning hebdomadaire une fois (lundi marché X, jeudi spot Y…), et vous pouvez modifier n'importe quel jour en 2 clics si besoin. Vos clients voient toujours les bonnes infos. Et quand vous partez en vacances, fermez votre établissement en un clic.",
  },
  {
    q: 'Je dois acheter un nom de domaine ?',
    a: "Non. Dès votre inscription, vous obtenez votre lien personnalisé (votrenom.onmange.app) prêt à partager. Aucun nom de domaine à acheter, aucune configuration technique. Vous pouvez l'envoyer par SMS, le mettre sur vos réseaux ou l'imprimer en QR code.",
  },
  {
    q: 'Comment mes clients passent commande ?',
    a: "Ils cliquent sur votre lien (partagé sur vos réseaux, votre vitrine…) ou scannent votre QR code. Ils consultent votre menu, choisissent leurs plats, sélectionnent un créneau de retrait et valident. C'est tout — 2 minutes. Ils reçoivent un rappel par email avant le retrait.",
  },
  {
    q: 'Et si je veux arrêter ?',
    a: 'Aucun engagement. Vous résiliez en un clic depuis votre tableau de bord. Pas de frais cachés, pas de période minimum.',
  },
  {
    q: "29€/mois, c'est rentable ?",
    a: "2 à 3 commandes supplémentaires par semaine suffisent à le rentabiliser. Et c'est 29€ tout inclus : fidélité, CRM, analytics, offres — là où les concurrents facturent 49 à 69€/mois pour les mêmes fonctionnalités, plus 400 à 1 100€ de mise en service. Avec OnMange, c'est 0€ pour démarrer.",
  },
  {
    q: 'Pourquoi pas un outil de click & collect classique ?',
    a: "Les solutions généralistes sont pensées pour des commerces fixes. Elles ne gèrent pas les emplacements qui changent chaque jour, le planning hebdomadaire d'un itinérant, ni la prise de commande sur site. En plus, elles imposent souvent un système de paiement (Stripe) et leur propre marque. OnMange c'est votre lien, votre marque, et vous encaissez comme vous voulez.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 lg:py-24 bg-white">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Tout ce que vous devez savoir avant de vous lancer.
          </p>
        </AnimatedSection>

        <div className="max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, i) => (
            <AnimatedSection key={i} delay={i * 50}>
              <div className="border-b border-gray-200 last:border-0">
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
