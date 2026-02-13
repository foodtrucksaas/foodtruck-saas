import { ArrowRight, Users } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

export default function FinalCTA() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-primary-50 to-primary-100/60 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary-200/20 rounded-full blur-3xl" />

      <div className="section-container section-padding text-center relative z-10">
        <AnimatedSection>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Prêt à simplifier votre quotidien ?
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            Inscrivez-vous maintenant et soyez parmi les premiers à lancer votre menu digital.
          </p>

          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-primary-600">
              30 jours gratuits
            </span>
            <span className="block text-sm text-gray-500 mt-1">Sans carte bancaire requise</span>
          </div>

          <a
            href="#waitlist"
            className="mt-8 inline-flex items-center justify-center gap-2 px-10 py-5 text-lg font-bold text-white bg-primary-500 rounded-2xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98]"
          >
            Rejoindre la liste d'attente
            <ArrowRight className="w-5 h-5" />
          </a>

          <div className="mt-5 inline-flex items-center gap-2 text-sm text-gray-500">
            <Users className="w-4 h-4 text-primary-400" />
            <span>Rejoignez les premiers food trucks inscrits</span>
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Sans engagement · Sans commission · Annulation en 1 clic
          </p>
        </AnimatedSection>
      </div>
    </section>
  );
}
