import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}

export function AnimatedText({
  text,
  className = '',
  delay = 0,
  stagger = 0.05,
  duration = 1.2,
}: AnimatedTextProps) {
  const containerRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chars = containerRef.current.querySelectorAll('.char');
    
    gsap.fromTo(
      chars,
      {
        opacity: 0,
        rotateX: 90,
        y: -50,
      },
      {
        opacity: 1,
        rotateX: 0,
        y: 0,
        duration,
        stagger,
        delay,
        ease: 'power3.out',
      }
    );
  }, [text, delay, stagger, duration]);

  return (
    <h1
      ref={containerRef}
      className={`${className}`}
      style={{ perspective: '1000px' }}
    >
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="char inline-block"
          style={{
            transformStyle: 'preserve-3d',
            opacity: 0,
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
    </h1>
  );
}

interface AnimatedWordsProps {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
}

export function AnimatedWords({
  text,
  className = '',
  delay = 0,
  stagger = 0.1,
  duration = 0.8,
}: AnimatedWordsProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const words = containerRef.current.querySelectorAll('.word');
    
    gsap.fromTo(
      words,
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        delay,
        ease: 'power2.out',
      }
    );
  }, [text, delay, stagger, duration]);

  return (
    <p ref={containerRef} className={className}>
      {text.split(' ').map((word, index) => (
        <span
          key={index}
          className="word inline-block mr-[0.25em]"
          style={{ opacity: 0 }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}
