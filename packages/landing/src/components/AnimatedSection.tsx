import { ReactNode } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: 'fade-in-up' | 'fade-in' | 'slide-in-right' | 'slide-in-left' | 'scale-in';
}

export default function AnimatedSection({
  children,
  className = '',
  delay = 0,
  animation = 'fade-in-up',
}: Props) {
  const { ref, isIntersecting } = useIntersectionObserver();

  const animationClass = isIntersecting ? `animate-${animation}` : '';

  return (
    <div
      ref={ref}
      className={`${className} ${isIntersecting ? animationClass : 'opacity-0'}`}
      style={
        delay
          ? { animationDelay: `${delay}ms`, animationFillMode: 'forwards' }
          : { animationFillMode: 'forwards' }
      }
    >
      {children}
    </div>
  );
}
