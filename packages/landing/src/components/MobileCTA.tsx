import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

export default function MobileCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 lg:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-lg px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <a
          href="#hero"
          className="flex items-center justify-center gap-2 w-full py-3.5 text-base font-semibold text-white bg-primary-500 rounded-xl hover:bg-primary-600 transition-all shadow-cta active:scale-[0.98]"
        >
          Rejoindre la liste d'attente
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
