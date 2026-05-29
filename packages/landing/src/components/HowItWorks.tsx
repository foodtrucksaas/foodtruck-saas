import AnimatedSection from './AnimatedSection';

function IllustrationChrono() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-marine-500"
      role="img"
      aria-label="Chronomètre et items menu"
    >
      {/* Stopwatch body */}
      <circle cx="55" cy="62" r="30" />
      <circle cx="55" cy="62" r="25" />
      {/* Top button */}
      <line x1="55" y1="32" x2="55" y2="26" strokeWidth="3" />
      <rect x="51" y="22" width="8" height="6" rx="2" />
      {/* Side button */}
      <line x1="78" y1="42" x2="84" y2="36" strokeWidth="3" />
      {/* Clock hands */}
      <line x1="55" y1="62" x2="55" y2="45" />
      <line x1="55" y1="62" x2="68" y2="55" />
      <circle cx="55" cy="62" r="2" fill="currentColor" />
      {/* Tick marks */}
      <line x1="55" y1="37" x2="55" y2="40" strokeWidth="1" />
      <line x1="55" y1="84" x2="55" y2="87" strokeWidth="1" />
      <line x1="28" y1="62" x2="31" y2="62" strokeWidth="1" />
      <line x1="79" y1="62" x2="82" y2="62" strokeWidth="1" />
      {/* Small menu items floating */}
      <rect x="92" y="50" width="18" height="5" rx="2" />
      <rect x="95" y="60" width="15" height="5" rx="2" />
      <rect x="92" y="70" width="18" height="5" rx="2" />
      {/* Price tag */}
      <path d="M96 42 L108 42 L112 46 L108 50 L96 50 Z" />
      <circle cx="99" cy="46" r="1.5" />
    </svg>
  );
}

function IllustrationShare() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-marine-500"
      role="img"
      aria-label="QR code et partage"
    >
      {/* Smartphone */}
      <rect x="18" y="20" width="40" height="70" rx="6" />
      <rect x="22" y="28" width="32" height="50" rx="2" />
      {/* QR code pattern on screen */}
      <rect x="26" y="34" width="8" height="8" rx="1" />
      <rect x="40" y="34" width="8" height="8" rx="1" />
      <rect x="26" y="48" width="8" height="8" rx="1" />
      <rect x="33" y="41" width="5" height="5" rx="1" />
      <rect x="40" y="48" width="4" height="4" rx="1" />
      <rect x="46" y="44" width="4" height="4" rx="1" />
      <rect x="34" y="52" width="6" height="4" rx="1" />
      {/* Home button */}
      <line x1="33" y1="83" x2="43" y2="83" strokeWidth="2" />
      {/* Share bubbles */}
      <circle cx="80" cy="32" r="12" />
      <path d="M76 30 L80 26 L84 30" />
      <line x1="80" y1="26" x2="80" y2="38" />
      {/* SMS bubble */}
      <path d="M72 60 L100 60 Q104 60 104 64 L104 76 Q104 80 100 80 L80 80 L76 86 L76 80 L72 80 Q68 80 68 76 L68 64 Q68 60 72 60" />
      <line x1="74" y1="67" x2="98" y2="67" strokeWidth="1" />
      <line x1="74" y1="73" x2="92" y2="73" strokeWidth="1" />
      {/* Instagram-style icon */}
      <rect x="82" y="92" width="16" height="16" rx="4" />
      <circle cx="90" cy="100" r="4" />
      <circle cx="96" cy="94" r="1.5" />
    </svg>
  );
}

function IllustrationNotification() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-marine-500"
      role="img"
      aria-label="Notification de commande et repos"
    >
      {/* Bell */}
      <path d="M45 45 Q45 28 60 25 Q75 28 75 45 L78 65 L42 65 Z" />
      <line x1="60" y1="18" x2="60" y2="25" />
      <circle cx="60" cy="16" r="3" />
      <path d="M52 65 Q52 72 60 72 Q68 72 68 65" />
      {/* Bell ring lines */}
      <path d="M35 40 Q30 45 35 52" />
      <path d="M85 40 Q90 45 85 52" />
      {/* Notification badge */}
      <circle cx="76" cy="35" r="8" fill="white" />
      <circle cx="76" cy="35" r="8" />
      <text
        x="76"
        y="39"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
        fontSize="11"
        fontWeight="bold"
      >
        3
      </text>
      {/* ZZZ - sleeping */}
      <path d="M88 78 L98 78 L88 88 L98 88" />
      <path d="M96 70 L104 70 L96 78 L104 78" />
      <path d="M102 64 L108 64 L102 70 L108 70" />
      {/* Pillow */}
      <path d="M20 85 Q15 80 20 75 L40 75 Q45 80 40 85 Z" />
      {/* Moon */}
      <path d="M25 30 Q35 25 35 38 Q25 38 25 30" />
    </svg>
  );
}

const STEPS = [
  {
    number: 1,
    Illustration: IllustrationChrono,
    title: 'Créez votre menu',
    subtitle: '10 minutes chrono',
    description: 'Ajoutez vos plats, vos prix, vos options. Votre page est en ligne immédiatement.',
  },
  {
    number: 2,
    Illustration: IllustrationShare,
    title: 'Partagez votre lien',
    subtitle: 'SMS, Insta, QR code',
    description:
      'Envoyez votre lien par SMS, postez-le sur Instagram, ou collez votre QR code sur le comptoir.',
  },
  {
    number: 3,
    Illustration: IllustrationNotification,
    title: 'Recevez vos commandes',
    subtitle: 'même en dormant',
    description:
      "Les commandes arrivent sur votre tableau de bord. Vous préparez, vos clients retirent. C'est tout.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-canvas">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14 lg:mb-20">
          <p className="text-sm font-semibold text-marine-500 uppercase tracking-wider mb-3">
            Simple comme bonjour
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-anthracite">
            Lancez-vous en <span className="text-primary-500">3 étapes</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Pas besoin d'être geek. Si vous savez utiliser un smartphone, vous savez utiliser
            OnMange.
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

                  {/* Illustration card */}
                  <div className="bg-white rounded-2xl shadow-card p-6 mb-6 mx-auto max-w-[240px] flex flex-col items-center justify-center border border-gray-100">
                    <div className="mb-3">
                      <step.Illustration />
                    </div>
                    <p className="text-sm font-semibold text-marine-500">{step.subtitle}</p>
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
