import { useState, useEffect, useRef } from 'react';

interface NumberRollProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export default function NumberRoll({
  value,
  decimals = 0,
  duration = 600,
  suffix = '',
  className = '',
}: NumberRollProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(Number(currentValue.toFixed(decimals)));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, decimals, duration]);

  return (
    <span className={`animate-number-roll ${className}`}>
      {displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}
