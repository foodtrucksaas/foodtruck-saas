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
        <div className="space-y-6 py-4">{children}</div>
      </div>

      {/* Fixed action buttons */}
      {!hideActions && (
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 sm:px-6 py-3 safe-area-bottom">
          <div className="flex items-center gap-3">
            {showBack && onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-3 min-h-[48px] text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                disabled={nextDisabled || nextLoading}
                className="flex-1 sm:flex-none sm:ml-auto flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all shadow-lg shadow-primary-500/25 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {nextLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    {nextLabel}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
