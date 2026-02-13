import { Check, X } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

type CellValue = true | false | string;

interface Row {
  label: string;
  sublabel?: string;
  onmange: CellValue;
  telephone: CellValue;
  generic: CellValue;
}

const ROWS: Row[] = [
  {
    label: 'Conçu pour les food trucks',
    sublabel: 'Itinérant, multi-emplacements',
    onmange: true,
    telephone: 'N/A',
    generic: false,
  },
  {
    label: 'Planning hebdomadaire',
    sublabel: 'Emplacements & horaires par jour',
    onmange: true,
    telephone: false,
    generic: false,
  },
  {
    label: 'Prise de commande 24h/24',
    onmange: true,
    telephone: false,
    generic: true,
  },
  {
    label: 'Menu digital avec photos',
    onmange: true,
    telephone: false,
    generic: true,
  },
  {
    label: 'Programme de fidélité',
    onmange: true,
    telephone: false,
    generic: false,
  },
  {
    label: 'CRM & marketing',
    sublabel: 'Emails, SMS, segments',
    onmange: true,
    telephone: false,
    generic: false,
  },
  {
    label: 'Analytics',
    sublabel: 'CA, heures de pointe, plats vendus',
    onmange: true,
    telephone: false,
    generic: false,
  },
  {
    label: 'Commandes sur site (POS)',
    onmange: true,
    telephone: 'N/A',
    generic: false,
  },
  {
    label: 'Fermeture vacances/congés',
    onmange: '1 clic',
    telephone: 'Répondeur',
    generic: true,
  },
  {
    label: 'Votre marque, votre lien',
    sublabel: 'Pas de place de marché intermédiaire',
    onmange: true,
    telephone: true,
    generic: 'Leur marque',
  },
  {
    label: 'Gestion des paiements',
    onmange: 'Non ✌️',
    telephone: 'Non',
    generic: 'Oui (Stripe)',
  },
  {
    label: 'Frais de mise en service',
    onmange: '0€',
    telephone: '0€',
    generic: '400-1 100€',
  },
  {
    label: 'Coût mensuel',
    onmange: '29€/mois',
    telephone: '"Gratuit"',
    generic: '29-69€/mois',
  },
];

function CellContent({ value, isOnMange }: { value: CellValue; isOnMange?: boolean }) {
  if (value === true)
    return <Check className={`${isOnMange ? 'w-6 h-6' : 'w-5 h-5'} text-success-500 mx-auto`} />;
  if (value === false) return <X className="w-5 h-5 text-gray-300 mx-auto" />;
  return <span className="text-sm font-medium">{value}</span>;
}

export default function ComparisonTable() {
  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-anthracite">
            OnMange vs les alternatives
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Comparez OnMange avec le téléphone et les solutions de click & collect généralistes.
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-[600px] px-4 sm:px-0">
              <table className="w-full max-w-4xl mx-auto">
                <thead>
                  <tr>
                    <th className="text-left py-4 pr-4 text-sm font-medium text-gray-500 w-[200px]" />
                    <th className="py-4 px-3 text-center w-[140px]">
                      <div className="bg-primary-50 border-2 border-primary-200 rounded-t-xl px-3 py-3.5 -mb-4">
                        <span className="text-lg font-extrabold text-primary-600">OnMange</span>
                      </div>
                    </th>
                    <th className="py-4 px-3 text-center w-[140px] text-sm font-medium text-gray-500">
                      Téléphone
                    </th>
                    <th className="py-4 px-3 text-center w-[140px] text-sm font-medium text-gray-500">
                      Click & Collect
                      <br />
                      <span className="text-xs text-gray-400">généraliste</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((row, i) => {
                    const isLast = i === ROWS.length - 1;
                    const isCostRow =
                      row.label === 'Coût mensuel' || row.label === 'Frais de mise en service';
                    return (
                      <tr
                        key={row.label}
                        className={
                          isCostRow ? 'bg-primary-50/40' : i % 2 === 0 ? 'bg-gray-50/50' : ''
                        }
                      >
                        <td
                          className={`py-3.5 pr-4 text-sm ${isCostRow ? 'text-anthracite font-bold' : 'text-gray-700 font-medium'}`}
                        >
                          <div>{row.label}</div>
                          {row.sublabel && (
                            <div className="text-xs text-gray-400 font-normal mt-0.5">
                              {row.sublabel}
                            </div>
                          )}
                        </td>
                        <td
                          className={`py-3.5 px-3 text-center bg-primary-50/50 border-l-2 border-r-2 border-primary-200 ${isLast ? 'border-b-2 rounded-b-xl' : ''}`}
                        >
                          <CellContent value={row.onmange} isOnMange />
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-500">
                          <CellContent value={row.telephone} />
                        </td>
                        <td className="py-3.5 px-3 text-center text-gray-500">
                          <CellContent value={row.generic} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
