import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { supabase } from '../../lib/supabase';
import { ProgressBar } from './components';
import { Step1Locations, Step2Schedule, Step3Menu, StepComplete } from './steps';

const STEP_LABELS = ['Emplacements', 'Planning', 'Menu'];
const TOTAL_STEPS = 3;

export default function OnboardingAssistant() {
  const navigate = useNavigate();
  const { foodtruck, refresh } = useFoodtruck();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [skipping, setSkipping] = useState(false);

  // Load initial step from DB
  useEffect(() => {
    if (!foodtruck) return;
    const dbStep = foodtruck.onboarding_step || 0;
    // If onboarding was completed, show the complete screen
    if (foodtruck.onboarding_completed_at) {
      setCurrentStep(TOTAL_STEPS + 1);
    } else if (dbStep >= 1 && dbStep <= TOTAL_STEPS) {
      setCurrentStep(dbStep);
    } else {
      // Step 0 (new), or > TOTAL_STEPS (old 6-step system) → start from 1
      setCurrentStep(1);
    }
  }, [foodtruck]);

  const updateStepInDB = useCallback(
    async (step: number) => {
      if (!foodtruck) return;
      await supabase.from('foodtrucks').update({ onboarding_step: step }).eq('id', foodtruck.id);
    },
    [foodtruck]
  );

  const handleNext = useCallback(async () => {
    if (currentStep === null) return;
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await updateStepInDB(nextStep);
  }, [currentStep, updateStepInDB]);

  const handleBack = useCallback(async () => {
    if (currentStep === null || currentStep <= 1) return;
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);
    await updateStepInDB(prevStep);
  }, [currentStep, updateStepInDB]);

  const handleGoToStep = useCallback(
    async (step: number) => {
      if (currentStep === null || step >= currentStep) return;
      setCurrentStep(step);
      await updateStepInDB(step);
    },
    [currentStep, updateStepInDB]
  );

  const handleSkip = async () => {
    if (!window.confirm("Vos données sont sauvegardées. Quitter l'assistant ?")) return;
    setSkipping(true);
    navigate('/');
  };

  const handleComplete = useCallback(async () => {
    if (!foodtruck) return;
    await supabase
      .from('foodtrucks')
      .update({
        onboarding_completed_at: new Date().toISOString(),
        onboarding_step: TOTAL_STEPS + 1,
      })
      .eq('id', foodtruck.id);
    setCurrentStep(TOTAL_STEPS + 1);
  }, [foodtruck]);

  const handleGoToDashboard = useCallback(async () => {
    await refresh();
    navigate('/');
  }, [refresh, navigate]);

  // Loading
  if (!foodtruck || currentStep === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isComplete = currentStep > TOTAL_STEPS;

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Locations foodtruckId={foodtruck.id} onNext={handleNext} />;
      case 2:
        return <Step2Schedule foodtruckId={foodtruck.id} onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <Step3Menu foodtruckId={foodtruck.id} onNext={handleNext} onBack={handleBack} />;
      default:
        return (
          <StepComplete
            foodtruck={foodtruck}
            onComplete={handleComplete}
            onGoToDashboard={handleGoToDashboard}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      {!isComplete && (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{foodtruck.name}</p>
                <p className="text-xs text-gray-400">Configuration initiale</p>
              </div>
              <button
                onClick={handleSkip}
                disabled={skipping}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] px-2 disabled:opacity-50"
              >
                {skipping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Terminer plus tard'}
              </button>
            </div>
            <ProgressBar
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              labels={STEP_LABELS}
              onStepClick={handleGoToStep}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">{renderStep()}</div>
    </div>
  );
}
