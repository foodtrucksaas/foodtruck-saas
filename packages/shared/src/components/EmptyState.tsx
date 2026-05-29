import { ReactNode } from 'react';
import { Button } from './Button';

export type IllustrationId =
  | 'no-orders'
  | 'no-clients'
  | 'no-offers'
  | 'no-menu'
  | 'no-schedule'
  | 'no-data'
  | 'no-campaign'
  | 'no-invoice'
  | 'inbox-empty';

export interface EmptyStateProps {
  illustration?: IllustrationId;
  iconColor?: 'corail' | 'marine';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}

const ILLUSTRATION_LABELS: Record<IllustrationId, string> = {
  'no-orders': 'Aucune commande',
  'no-clients': 'Aucun client',
  'no-offers': 'Aucune offre',
  'no-menu': 'Aucun article',
  'no-schedule': 'Aucun horaire',
  'no-data': 'Aucune donnée',
  'no-campaign': 'Aucune campagne',
  'no-invoice': 'Aucune facture',
  'inbox-empty': 'Boîte vide',
};

const COLOR_CLASS: Record<string, string> = {
  corail: 'text-corail-400',
  marine: 'text-marine-400',
};

const svgProps = {
  width: 80,
  height: 80,
  viewBox: '0 0 80 80',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function NoOrders() {
  return (
    <svg {...svgProps}>
      <path d="M10 50V35h18l5-10h22v25H10Z" />
      <circle cx="22" cy="55" r="5" />
      <circle cx="48" cy="55" r="5" />
      <path d="M55 50h15V40H60l-5 0" />
      <path d="M37 18q-2-4 0-8" />
      <path d="M44 18q2-4 0-8" />
      <path d="M5 60h70" />
    </svg>
  );
}

function NoClients() {
  return (
    <svg {...svgProps}>
      <circle cx="40" cy="28" r="10" />
      <path d="M20 62q0-16 20-16t20 16" />
      <path d="M15 48q0-7 7-7" />
      <path d="M65 48q0-7-7-7" />
    </svg>
  );
}

function NoOffers() {
  return (
    <svg {...svgProps}>
      <path d="M18 20h28l14 14v12L46 60H18V20Z" />
      <circle cx="52" cy="34" r="4" />
      <path d="M26 32h16" strokeDasharray="3 3" />
      <path d="M26 40h12" strokeDasharray="3 3" />
      <path d="M26 48h10" strokeDasharray="3 3" />
    </svg>
  );
}

function NoMenu() {
  return (
    <svg {...svgProps}>
      <circle cx="40" cy="42" r="20" />
      <circle cx="40" cy="42" r="14" />
      <path d="M16 18v10M14 18v6M18 18v6M13 28h6" />
      <path d="M62 18v24M62 18c3 0 4 4 4 8s-1 6-4 6" />
    </svg>
  );
}

function NoSchedule() {
  return (
    <svg {...svgProps}>
      <rect x="12" y="16" width="56" height="48" rx="6" />
      <path d="M12 30h56" />
      <path d="M28 12v8M52 12v8" />
      <circle cx="28" cy="42" r="2" />
      <circle cx="40" cy="42" r="2" />
      <circle cx="52" cy="42" r="2" />
      <circle cx="28" cy="54" r="2" />
    </svg>
  );
}

function NoData() {
  return (
    <svg {...svgProps}>
      <rect x="14" y="44" width="12" height="22" rx="3" />
      <rect x="34" y="30" width="12" height="36" rx="3" />
      <rect x="54" y="18" width="12" height="48" rx="3" />
      <path d="M10 68h60" />
      <path d="M10 68V14" />
    </svg>
  );
}

function NoCampaign() {
  return (
    <svg {...svgProps}>
      <path d="M12 40L68 16L52 64L38 44Z" />
      <path d="M68 16L38 44" />
      <path d="M8 32h10" />
      <path d="M6 40h8" />
      <path d="M10 48h8" />
    </svg>
  );
}

function NoInvoice() {
  return (
    <svg {...svgProps}>
      <rect x="16" y="8" width="40" height="56" rx="4" />
      <path d="M44 8v12h12" />
      <path d="M24 32h24" />
      <path d="M24 40h18" />
      <path d="M24 48h22" />
      <path d="M24 56h12" />
    </svg>
  );
}

function InboxEmpty() {
  return (
    <svg {...svgProps}>
      <path d="M14 34h52v28H14z" />
      <path d="M14 34L22 16h36l8 18" />
      <path d="M14 34h18v8h16v-8h18" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<IllustrationId, () => JSX.Element> = {
  'no-orders': NoOrders,
  'no-clients': NoClients,
  'no-offers': NoOffers,
  'no-menu': NoMenu,
  'no-schedule': NoSchedule,
  'no-data': NoData,
  'no-campaign': NoCampaign,
  'no-invoice': NoInvoice,
  'inbox-empty': InboxEmpty,
};

export function EmptyState({
  illustration,
  iconColor = 'corail',
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  const Illustration = illustration ? ILLUSTRATIONS[illustration] : null;

  return (
    <div className="flex flex-col items-center py-12 gap-4">
      {Illustration && (
        <div
          className={COLOR_CLASS[iconColor]}
          role="img"
          aria-label={ILLUSTRATION_LABELS[illustration!]}
        >
          <Illustration />
        </div>
      )}
      <h3 className="text-lg font-semibold text-anthracite text-center">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs text-center">{description}</p>}
      {action && (
        <Button variant="outline" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {children}
    </div>
  );
}

export default EmptyState;
