import { useScrollPosition } from '../hooks/useScrollPosition';

const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#benefits' },
  { label: 'Tarif', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const scrollY = useScrollPosition();
  const scrolled = scrollY > 50;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-transparent'
      }`}
    >
      <nav className="section-container section-padding">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a href="#" className="flex items-center">
            <img src="/logo.svg" alt="OnMange" className="h-9" />
          </a>

          {/* Nav links - desktop only */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 hover:text-primary-500 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA - scrolls to hero email form */}
          <a
            href="#hero"
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-95"
          >
            Rejoindre la liste
          </a>
        </div>
      </nav>
    </header>
  );
}
