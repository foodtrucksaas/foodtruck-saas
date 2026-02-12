interface AssistantBubbleProps {
  message: string;
  emoji?: string;
  variant?: 'default' | 'success' | 'info' | 'tip';
}

export function AssistantBubble({ message, emoji, variant = 'default' }: AssistantBubbleProps) {
  const isDefault = variant === 'default';

  // Non-default variants: subtle colored banner
  if (!isDefault) {
    const bannerStyles = {
      success: 'bg-success-50 text-success-700 border-success-100',
      info: 'bg-blue-50 text-blue-700 border-blue-100',
      tip: 'bg-amber-50 text-amber-700 border-amber-100',
    };

    return (
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border ${bannerStyles[variant]} animate-fade-in-up`}
      >
        {emoji && <span className="text-lg flex-shrink-0">{emoji}</span>}
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
    );
  }

  // Default: centered title pattern (matches Onboarding page 1)
  return (
    <div className="text-center animate-fade-in-up">
      {emoji && <div className="text-4xl mb-3">{emoji}</div>}
      <p className="text-lg font-semibold text-gray-900 leading-relaxed">{message}</p>
    </div>
  );
}
