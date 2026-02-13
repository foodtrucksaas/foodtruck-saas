const PRODUCT_LINKS = [
  { label: 'Fonctionnalités', href: '#benefits' },
  { label: 'Tarif', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

const LEGAL_LINKS = [
  { label: 'CGV', href: '/cgv.html' },
  { label: 'Mentions légales', href: '/mentions-legales.html' },
  { label: 'Confidentialité', href: '/confidentialite.html' },
];

export default function Footer() {
  return (
    <footer className="bg-anthracite text-white">
      <div className="section-container section-padding py-12 lg:py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3">
              <img src="/logo.svg" alt="OnMange" className="h-8 brightness-0 invert" />
            </div>
            <p className="text-gray-400 text-sm max-w-xs">
              La solution de pré-commandes pour les food trucks. Simple, sans commission, efficace.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Produit
            </h3>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Légal
            </h3>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">
              Contact
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:contact@onmange.app"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                >
                  contact@onmange.app
                </a>
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-gray-700 my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} OnMange. Tous droits réservés.
          </p>
          <p className="text-sm text-gray-500">Fait avec passion à Paris, France</p>
        </div>
      </div>
    </footer>
  );
}
