import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Loader2 } from 'lucide-react';
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

const STEP_LABELS = ['Emplacements', 'Planning', 'Menu', 'Offres', 'Paramètres'];
const TOTAL_STEPS = 5;

function OnboardingAssistantContent() {
  const navigate = useNavigate();
  const { state, goToStep } = useOnboarding();
  const {
    saveAllData,
    saveStepData,
    updateProgress,
    saveLocations,
    saveSchedules,
    saveMenu,
    saveOffers,
    loaded,
  } = useOnboardingAssistant();
  const { foodtruck } = useFoodtruck();
  const [skipping, setSkipping] = useState(false);
  const prevStepRef = useRef(state.currentStep);

  // Save all data when reaching step 6 (complete) — only once
  const hasSavedComplete = useRef(false);
  useEffect(() => {
    if (state.currentStep === 6 && !hasSavedComplete.current) {
      hasSavedComplete.current = true;
      saveAllData().then((success) => {
        if (!success) {
          console.error('Failed to save onboarding data');
        }
      });
    }
  }, [state.currentStep, saveAllData]);

  // Progressive save: when step increases, save the completed step's data
  // Only after initial load to avoid overwriting DB with default state
  useEffect(() => {
    if (!loaded) return;
    const prev = prevStepRef.current;
    if (state.currentStep > prev && prev <= TOTAL_STEPS) {
      saveStepData(prev);
    }
    prevStepRef.current = state.currentStep;
  }, [state.currentStep, saveStepData, loaded]);

  // Update progress in database when step changes
  // Only after initial load to avoid overwriting saved step with 1
  useEffect(() => {
    if (!loaded) return;
    if (state.currentStep <= TOTAL_STEPS) {
      updateProgress(state.currentStep);
    }
  }, [state.currentStep, updateProgress, loaded]);

  // Save whatever data has been entered so far before leaving
  const handleSkip = async () => {
    const hasData =
      state.locations.length > 0 ||
      state.schedules.length > 0 ||
      state.categories.length > 0 ||
      state.offers.length > 0;

    if (hasData && !window.confirm("Vos données seront sauvegardées. Quitter l'assistant ?")) {
      return;
    }

    setSkipping(true);
    try {
      if (state.locations.length > 0) {
        const locationIds = await saveLocations();
        if (state.schedules.length > 0) {
          await saveSchedules(locationIds);
        }
      }
      if (state.categories.length > 0) {
        await saveMenu();
      }
      if (state.offers.length > 0) {
        await saveOffers();
      }
    } catch (err) {
      console.error('Error saving partial onboarding data:', err);
    }
    navigate('/');
  };

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

  // Show loader until data is ready (prevents flash of wrong step)
  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

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
                onClick={handleSkip}
                disabled={skipping}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] px-2 disabled:opacity-50"
              >
                {skipping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Passer'}
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
              onStepClick={goToStep}
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
