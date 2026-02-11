import { useState } from 'react';
import { Code2, Copy, Check, ExternalLink } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';

interface EmbedButtonSectionProps {
  foodtruck: Foodtruck | null;
  clientLink: string;
}

const STYLES = [
  { id: 'filled', label: 'Plein' },
  { id: 'outline', label: 'Contour' },
  { id: 'minimal', label: 'Minimal' },
] as const;

type StyleId = (typeof STYLES)[number]['id'];

function getSnippet(link: string, style: StyleId): string {
  const base = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:600;padding:12px 24px;border-radius:12px;text-decoration:none;display:inline-flex;align-items:center;gap:8px;cursor:pointer;transition:opacity 0.2s`;

  const styles: Record<StyleId, string> = {
    filled: `${base};background:#e85d4a;color:#fff;border:none`,
    outline: `${base};background:transparent;color:#e85d4a;border:2px solid #e85d4a`,
    minimal: `${base};background:transparent;color:#e85d4a;border:none;text-decoration:underline`,
  };

  return `<a href="${link}" target="_blank" rel="noopener noreferrer" style="${styles[style]}">Commander en ligne &#x2197;</a>`;
}

function getPreviewStyles(style: StyleId): string {
  switch (style) {
    case 'filled':
      return 'bg-primary-500 text-white border-transparent';
    case 'outline':
      return 'bg-transparent text-primary-500 border-2 border-primary-500';
    case 'minimal':
      return 'bg-transparent text-primary-500 border-transparent underline';
  }
}

export function EmbedButtonSection({ foodtruck, clientLink }: EmbedButtonSectionProps) {
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<StyleId>('filled');

  if (!foodtruck) return null;

  const snippet = getSnippet(clientLink, style);

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="card p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Code2 className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Bouton site web</h2>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Ajoutez un bouton de commande sur votre site web. Copiez le code HTML ci-dessous et
        collez-le dans votre site.
      </p>

      {/* Style selector */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className={`px-3 py-2 min-h-[44px] text-sm font-medium rounded-lg transition-all active:scale-95 ${
              style === s.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="mb-6">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
          Aperçu
        </span>
        <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center">
          <a
            href={clientLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 active:scale-[0.98] ${getPreviewStyles(style)}`}
          >
            Commander en ligne
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Code snippet */}
      <div>
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 block">
          Code HTML
        </span>
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-300 rounded-xl text-xs overflow-x-auto leading-relaxed">
            <code>{snippet}</code>
          </pre>
          <button
            onClick={copySnippet}
            className="absolute top-2 right-2 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
            title="Copier le code"
          >
            {copied ? <Check className="w-4 h-4 text-success-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        {copied && (
          <p className="text-sm text-success-600 mt-2">Code copié dans le presse-papier</p>
        )}
      </div>
    </section>
  );
}
