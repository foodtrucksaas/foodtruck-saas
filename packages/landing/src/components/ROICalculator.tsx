import { useState, useMemo } from 'react';
import { Calculator, TrendingUp, ArrowRight } from 'lucide-react';
import AnimatedSection from './AnimatedSection';

const formatEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);

export default function ROICalculator() {
  const [ordersPerDay, setOrdersPerDay] = useState(15);
  const [avgBasket, setAvgBasket] = useState(12);
  const [daysPerWeek, setDaysPerWeek] = useState(5);

  const results = useMemo(() => {
    const monthlyDays = daysPerWeek * 4.33;
    const currentRevenue = ordersPerDay * avgBasket * monthlyDays;
    const gainedOrders = Math.round(ordersPerDay * 0.2);
    const extraRevenue = Math.round(gainedOrders * avgBasket * monthlyDays);
    const onMangeCost = 29;
    const netBenefit = extraRevenue - onMangeCost;

    return { currentRevenue, gainedOrders, extraRevenue, onMangeCost, netBenefit };
  }, [ordersPerDay, avgBasket, daysPerWeek]);

  const extraRevenueDisplay = Math.round(results.extraRevenue);

  return (
    <section
      id="roi-calculator"
      className="py-20 lg:py-28 bg-gradient-to-b from-primary-50/60 to-white"
    >
      <div className="section-container section-padding">
        <AnimatedSection className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            <Calculator className="w-4 h-4" />
            Simulateur
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-anthracite">
            Calculez combien OnMange vous rapporte
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Sliders */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-card border border-gray-100">
              <h3 className="text-lg font-bold text-anthracite mb-8">Votre activité</h3>
              <div className="space-y-8">
                <SliderInput
                  label="Commandes par jour (actuelles)"
                  value={ordersPerDay}
                  onChange={setOrdersPerDay}
                  min={5}
                  max={50}
                  suffix=""
                />
                <SliderInput
                  label="Panier moyen"
                  value={avgBasket}
                  onChange={setAvgBasket}
                  min={5}
                  max={25}
                  suffix="€"
                />
                <SliderInput
                  label="Jours d'ouverture / semaine"
                  value={daysPerWeek}
                  onChange={setDaysPerWeek}
                  min={3}
                  max={7}
                  suffix=""
                />
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-card border border-gray-100 flex flex-col">
              <h3 className="text-lg font-bold text-anthracite mb-6">Vos résultats</h3>
              <div className="space-y-3.5 flex-1">
                <ResultRow
                  label="CA actuel estimé"
                  value={`${formatEur(results.currentRevenue)}/mois`}
                />
                <ResultRow
                  label="Commandes gagnées grâce à OnMange"
                  value={`+${results.gainedOrders}/jour`}
                  className="text-primary-500"
                />
                <p className="text-xs text-gray-400 -mt-1 leading-snug">
                  Commandes en ligne reçues en dehors du service, pendant le rush, ou via le
                  bouche-à-oreille digital
                </p>
                <ResultRow
                  label="CA supplémentaire"
                  value={`+${formatEur(results.extraRevenue)}/mois`}
                  className="text-success-600"
                />
                <ResultRow
                  label="Coût OnMange"
                  value={`-${formatEur(results.onMangeCost)}/mois`}
                  className="text-gray-400"
                />

                {/* Visual bar comparison */}
                <div className="pt-2 pb-1">
                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">Coût OnMange</span>
                        <span className="text-xs font-bold text-primary-500">
                          {formatEur(results.onMangeCost)}/mois
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min((results.onMangeCost / (results.extraRevenue + 50)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">CA supplémentaire</span>
                        <span className="text-xs font-bold text-success-600">
                          +{formatEur(results.extraRevenue)}/mois
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success-500 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min((results.extraRevenue / (results.extraRevenue + 50)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100 !my-4" />
                <div className="bg-success-50 rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-success-600" />
                      <span className="font-bold text-success-600">Bénéfice net</span>
                    </div>
                    <span className="text-4xl font-extrabold text-success-600">
                      +{formatEur(results.netBenefit)}
                      <span className="text-sm font-semibold">/mois</span>
                    </span>
                  </div>
                </div>
              </div>

              <a
                href="#hero"
                className="mt-6 flex items-center justify-center gap-2 w-full py-3.5 text-base font-semibold text-white bg-primary-500 rounded-2xl hover:bg-primary-600 transition-all shadow-cta hover:shadow-cta-hover active:scale-[0.98]"
              >
                Gagner {extraRevenueDisplay}€/mois
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  suffix: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-600">{label}</label>
        <span className="text-xl font-extrabold text-primary-500">
          {value}
          {suffix}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full appearance-none h-2 rounded-full bg-gray-200 outline-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, #F97066 0%, #F97066 ${pct}%, #e5e7eb ${pct}%, #e5e7eb 100%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-300 mt-1.5">
        <span>
          {min}
          {suffix}
        </span>
        <span>
          {max}
          {suffix}
        </span>
      </div>
    </div>
  );
}

function ResultRow({
  label,
  value,
  className = 'text-anthracite',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-base font-bold ${className}`}>{value}</span>
    </div>
  );
}
