import { Smartphone, ShoppingCart, LayoutDashboard, BarChart3 } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const SCREENSHOTS = [
  {
    icon: Smartphone,
    color: 'from-primary-400 to-primary-500',
    title: 'Menu client',
    description: 'Vos clients consultent le menu et commandent en 2 minutes.',
  },
  {
    icon: ShoppingCart,
    color: 'from-orange-400 to-orange-500',
    title: 'Page de commande',
    description: 'Choix du créneau, personnalisation, validation simple.',
  },
  {
    icon: LayoutDashboard,
    color: 'from-blue-400 to-blue-500',
    title: 'Gestion des commandes',
    description: 'Recevez et gérez toutes les commandes en temps réel.',
  },
  {
    icon: BarChart3,
    color: 'from-purple-400 to-purple-500',
    title: 'Statistiques',
    description: 'CA, heures de pointe, plats les plus vendus.',
  },
];

export default function ProductDemo() {
  return (
    <section id="product-demo" className="py-20 lg:py-28 bg-gray-50/60">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Découvrez OnMange <span className="text-primary-500">en action</span>
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Un aperçu de l'expérience pour vous et vos clients.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
          {SCREENSHOTS.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 100}>
              <div className="group">
                <div className="bg-white rounded-2xl shadow-card overflow-hidden mb-4 group-hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-1">
                  <div
                    className={`aspect-[9/14] bg-gradient-to-br ${item.color} flex items-center justify-center relative overflow-hidden`}
                  >
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 opacity-10">
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                          backgroundSize: '16px 16px',
                        }}
                      />
                    </div>
                    <div className="text-center relative z-10">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <item.icon className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-white/90">Capture à venir</p>
                    </div>
                  </div>
                </div>
                <h3 className="text-base font-bold text-anthracite">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
