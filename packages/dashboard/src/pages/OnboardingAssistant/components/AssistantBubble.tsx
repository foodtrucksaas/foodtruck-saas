import { Bot } from 'lucide-react';

interface AssistantBubbleProps {
  message: string;
  emoji?: string;
  variant?: 'default' | 'success' | 'info' | 'tip';
}

const variantStyles = {
  default: 'bg-white border-gray-200',
  success: 'bg-success-50 border-success-200',
  info: 'bg-blue-50 border-blue-200',
  tip: 'bg-amber-50 border-amber-200',
};

const avatarStyles = {
  default: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  info: 'bg-blue-100 text-blue-600',
  tip: 'bg-amber-100 text-amber-600',
};

export function AssistantBubble({ message, emoji, variant = 'default' }: AssistantBubbleProps) {
  return (
    <div className="flex items-start gap-3 animate-fade-in-up">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${avatarStyles[variant]}`}
      >
        {emoji ? <span className="text-lg">{emoji}</span> : <Bot className="w-5 h-5" />}
      </div>
      <div
        className={`flex-1 rounded-2xl rounded-tl-md px-4 py-3 border shadow-sm ${variantStyles[variant]}`}
      >
        <p className="text-gray-800 text-base leading-relaxed">{message}</p>
      </div>
    </div>
  );
}
