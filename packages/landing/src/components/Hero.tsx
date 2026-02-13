import { useState, FormEvent } from 'react';
import { ArrowRight, Check, Mail, Loader2 } from 'lucide-react';

const TRUST_ITEMS = ['0% de commission', 'Sans engagement', 'Prêt en 10 minutes'];

function WaitlistForm({
  email,
  setEmail,
  onSubmit,
  status,
  buttonLabel,
}: {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  status: string;
  buttonLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-2 shadow-xl ring-1 ring-gray-200/60">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            required
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-12 pr-4 py-4 text-base bg-gray-50/80 border-0 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-200 outline-none transition-all placeholder:text-gray-400"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading'}
          className="flex items-center justify-center gap-2 px-8 py-4 text-base font-bold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98] disabled:opacity-70 whitespace-nowrap"
        >
          {status === 'loading' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              {buttonLabel}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function Hero() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) {
        await new Promise((r) => setTimeout(r, 800));
        setStatus('success');
        setEmail('');
        return;
      }
      const res = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok || res.status === 409) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

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
              Lancement en cours — Inscriptions ouvertes
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-anthracite leading-[1.1] tracking-tight animate-fade-in-up">
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
              Vos clients commandent à l'avance via votre lien ou QR code. Même quand vous cuisinez,
              conduisez ou dormez.
            </p>

            {/* Email capture form */}
            <div
              id="waitlist"
              className="mt-8 animate-fade-in-up scroll-mt-24"
              style={{ animationDelay: '200ms' }}
            >
              {status === 'success' ? (
                <div className="flex items-center gap-3 p-5 bg-success-50 border border-success-200 rounded-2xl">
                  <div className="w-11 h-11 bg-success-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-success-700">Vous êtes sur la liste !</p>
                    <p className="text-sm text-success-600">On vous prévient dès que c'est prêt.</p>
                  </div>
                </div>
              ) : (
                <>
                  {status === 'error' && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-3">
                      <p className="text-sm text-red-600 font-medium">
                        Une erreur est survenue, veuillez réessayer.
                      </p>
                    </div>
                  )}
                  <WaitlistForm
                    email={email}
                    setEmail={setEmail}
                    onSubmit={handleSubmit}
                    status={status}
                    buttonLabel={status === 'error' ? 'Réessayer' : 'Rejoindre la liste'}
                  />
                </>
              )}
              <p className="mt-3 text-sm text-gray-400">
                30 jours gratuits à l'ouverture · Pas de spam · Pas de carte bancaire
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
          </div>

          {/* Right: Product mockup — BIGGER */}
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
                        <img src="/logo.svg" alt="OnMange" className="h-6" />
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
                          desc: 'Bœuf, cheddar, salade, tomate',
                        },
                        {
                          name: 'Le Cheese Bacon',
                          price: '11,00€',
                          desc: 'Double bœuf, bacon, cheddar',
                        },
                        { name: 'Le Veggie', price: '9,00€', desc: 'Galette de légumes, avocat' },
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
