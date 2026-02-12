import { ReactNode, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

interface StepContainerProps {
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  showBack?: boolean;
  hideActions?: boolean;
}

export function StepContainer({
  children,
  onBack,
  onNext,
  nextLabel = 'Continuer',
  nextDisabled = false,
  nextLoading = false,
  showBack = true,
  hideActions = false,
}: StepContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to top and focus first interactive element on mount
  useEffect(() => {
    window.scrollTo(0, 0);
    containerRef.current?.scrollTo(0, 0);
    // Focus first focusable element inside content
    const firstInput = containerRef.current?.querySelector<HTMLElement>(
      'input, select, textarea, button[type="button"]:not([disabled])'
    );
    if (firstInput && firstInput.getAttribute('autoFocus') !== null) {
      firstInput.focus();
    }
  }, []);

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Content */}
      <div className="flex-1 px-4 sm:px-6 pb-4">
        <div className="space-y-6 py-6">{children}</div>
      </div>

      {/* Fixed action buttons */}
      {!hideActions && (
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 sm:px-6 py-3 safe-area-bottom">
          <div className="flex flex-col gap-2">
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || nextLoading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-2xl font-semibold text-lg transition-all shadow-lg shadow-primary-500/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {nextLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    {nextLabel}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
            {showBack && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full flex items-center justify-center gap-2 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors active:scale-[0.98] focus:outline-none"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
