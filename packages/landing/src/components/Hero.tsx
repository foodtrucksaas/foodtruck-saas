import { ArrowRight, Check, Star } from 'lucide-react';
import { Logo } from '@foodtruck/shared';

const TRUST_ITEMS = ['0% de commission', 'Sans engagement', 'Prêt en 10 min'];

export default function Hero() {
  return (
    <section id="hero" className="relative pt-28 pb-16 lg:pt-36 lg:pb-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-orange-50/30 -z-10" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/30 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2" />

      <div className="section-container section-padding">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100/80 text-primary-700 rounded-full text-sm font-semibold mb-6 animate-fade-in">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-500" />
              </span>
              Essai gratuit — 14 jours offerts
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-anthracite leading-[1.1] tracking-tight animate-fade-in-up">
              Recevez des commandes{' '}
              <span className="relative">
                <span className="text-primary-500">avant même d'ouvrir</span>
                <svg
                  className="absolute -bottom-1 left-0 w-full text-primary-500"
                  height="6"
                  viewBox="0 0 200 6"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 5 Q50 0 100 3 T200 2"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    opacity="0.4"
                  />
                </svg>
              </span>{' '}
              votre camion
            </h1>

            <p
              className="mt-5 text-lg text-gray-600 leading-relaxed animate-fade-in-up"
              style={{ animationDelay: '100ms' }}
            >
              Pendant que vous conduisez, cuisinez ou dormez —{' '}
              <strong className="text-anthracite">
                vos clients consultent votre menu et commandent.
              </strong>{' '}
              Vous arrivez, c'est déjà prêt à préparer.
            </p>

            {/* CTA */}
            <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <a
                href="https://pro.onmange.app/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98]"
              >
                Essayer gratuitement 14 jours
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="mt-3 text-sm text-gray-400">
                14 jours gratuits · Aucune carte bancaire · Annulation en 1 clic
              </p>
            </div>

            {/* Trust bar */}
            <div
              className="mt-6 flex flex-wrap gap-x-6 gap-y-2 animate-fade-in-up"
              style={{ animationDelay: '300ms' }}
            >
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-sm text-gray-500 font-medium"
                >
                  <Check className="w-4 h-4 text-success-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div
              className="mt-6 flex items-center gap-3 animate-fade-in-up"
              style={{ animationDelay: '400ms' }}
            >
              <div className="flex -space-x-2">
                {['bg-orange-400', 'bg-blue-400', 'bg-green-400', 'bg-purple-400'].map((bg, i) => (
                  <div
                    key={i}
                    className={`w-8 h-8 ${bg} rounded-full ring-2 ring-white flex items-center justify-center`}
                  >
                    <span className="text-[10px] font-bold text-white">
                      {['BN', 'TG', 'LP', 'MC'][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-xs">Rejoint par des food trucks partout en France</span>
              </div>
            </div>
          </div>

          {/* Right: Product mockup */}
          <div
            className="relative flex justify-center lg:justify-end animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <div className="relative">
              {/* Phone frame */}
              <div className="relative w-[280px] sm:w-[320px]">
                <div className="bg-gray-900 rounded-[2.5rem] p-[10px] shadow-2xl ring-1 ring-gray-800">
                  {/* Dynamic island */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-10" />
                  <div className="bg-white rounded-[2.1rem] overflow-hidden">
                    {/* App header */}
                    <div className="bg-gradient-to-b from-primary-50 to-white pt-10 px-5 pb-3">
                      <div className="flex items-center gap-2 mb-4">
                        <Logo size="md" />
                        <div>
                          <p className="text-[11px] font-bold text-anthracite">Le Burger Nomade</p>
                          <p className="text-[9px] text-green-600 font-medium">
                            Ouvert · Retrait dès 12h00
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Menu items */}
                    <div className="px-4 pb-4 space-y-2.5">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Burgers
                      </p>
                      {[
                        {
                          name: 'Le Classic Burger',
                          price: '9,50€',
                          desc: 'Boeuf, cheddar, salade, tomate',
                        },
                        {
                          name: 'Le Cheese Bacon',
                          price: '11,00€',
                          desc: 'Double boeuf, bacon, cheddar',
                        },
                        {
                          name: 'Le Veggie',
                          price: '9,00€',
                          desc: 'Galette de légumes, avocat',
                        },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className="flex items-start justify-between p-2.5 bg-gray-50 rounded-xl"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-anthracite">{item.name}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">{item.desc}</p>
                          </div>
                          <p className="text-[11px] font-bold text-primary-500 flex-shrink-0 ml-2">
                            {item.price}
                          </p>
                        </div>
                      ))}
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pt-2">
                        Accompagnements
                      </p>
                      {[
                        { name: 'Frites Maison', price: '4,00€' },
                        { name: 'Onion Rings', price: '4,50€' },
                      ].map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"
                        >
                          <p className="text-[11px] font-semibold text-anthracite">{item.name}</p>
                          <p className="text-[11px] font-bold text-primary-500">{item.price}</p>
                        </div>
                      ))}
                    </div>
                    {/* Bottom cart bar */}
                    <div className="mx-3 mb-3">
                      <div className="bg-primary-500 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-white/20 text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                            3
                          </span>
                          <span className="text-[11px] font-semibold">Voir le panier</span>
                        </div>
                        <span className="text-[12px] font-bold">24,50€</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single floating notification */}
              <div
                className="absolute -left-4 sm:-left-16 top-[28%] bg-white rounded-2xl shadow-xl ring-1 ring-black/5 p-4 max-w-[200px] animate-bounce-in"
                style={{ animationDelay: '1000ms' }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-success-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-success-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-anthracite leading-tight">
                      Nouvelle commande !
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Classic Burger + Frites</p>
                    <p className="text-[10px] text-primary-500 font-semibold mt-0.5">
                      13,50€ · 12h30
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
