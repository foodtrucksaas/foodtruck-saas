import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import { ProgressBar } from './components';
import {
  Step1Locations,
  Step2Schedule,
  Step3Menu,
  Step4Offers,
  Step5Settings,
  StepComplete,
} from './steps';
import { useOnboardingAssistant } from './hooks/useOnboardingAssistant';
import { useFoodtruck } from '../../contexts/FoodtruckContext';

const STEP_LABELS = ['Emplacements', 'Planning', 'Menu', 'Offres', 'Parametres'];
const TOTAL_STEPS = 5;

function OnboardingAssistantContent() {
  const navigate = useNavigate();
  const { state } = useOnboarding();
  const { saveAllData, updateProgress } = useOnboardingAssistant();
  const { foodtruck } = useFoodtruck();

  // Save all data when reaching step 6 (complete)
  useEffect(() => {
    const save = async () => {
      if (state.currentStep === 6) {
        const success = await saveAllData();
        if (!success) {
          // If save failed, log the error (UI shows it via StepComplete)
          console.error('Failed to save onboarding data');
        }
      }
    };
    save();
  }, [state.currentStep, saveAllData]);

  // Update progress in database when step changes
  useEffect(() => {
    if (state.currentStep <= TOTAL_STEPS) {
      updateProgress(state.currentStep);
    }
  }, [state.currentStep, updateProgress]);

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <Step1Locations />;
      case 2:
        return <Step2Schedule />;
      case 3:
        return <Step3Menu />;
      case 4:
        return <Step4Offers />;
      case 5:
        return <Step5Settings />;
      case 6:
        return <StepComplete />;
      default:
        return <Step1Locations />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-semibold text-gray-900">MonTruck</span>
                {foodtruck && <p className="text-xs text-gray-500">{foodtruck.name}</p>}
              </div>
            </div>
            {state.currentStep <= TOTAL_STEPS && (
              <button
                onClick={() => navigate('/')}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] px-2"
              >
                Passer
              </button>
            )}
          </div>

          {/* Progress bar - only show during steps, not on complete */}
          {state.currentStep <= TOTAL_STEPS && (
            <ProgressBar
              currentStep={state.currentStep}
              totalSteps={TOTAL_STEPS}
              labels={STEP_LABELS}
              completedSteps={state.completedSteps}
            />
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">{renderStep()}</div>
    </div>
  );
}

export default function OnboardingAssistant() {
  return (
    <OnboardingProvider>
      <OnboardingAssistantContent />
    </OnboardingProvider>
  );
}
