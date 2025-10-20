import React, { useMemo } from 'react';

interface GlowingBackgroundProps {
  text?: string;
  instanceCount?: number;
  className?: string;
}

const GlowingBackground: React.FC<GlowingBackgroundProps> = ({
  text = 'Tikka',
  instanceCount = 15,
  className = ''
}) => {
  // Generate random positions and animation delays
  const instances = useMemo(() => {
    return Array.from({ length: instanceCount }, (_, index) => ({
      id: index,
      // Random positioning across the screen
      left: Math.random() * 100,
      top: Math.random() * 100,
      // Random rotation for variety
      rotation: (Math.random() - 0.5) * 30, // -15 to +15 degrees
      // Random scale for size variation
      scale: 0.8 + Math.random() * 0.6, // 0.8 to 1.4
      // Random animation delay (0 to 8 seconds)
      delay: Math.random() * 8,
      // Random animation duration (3 to 7 seconds)
      duration: 3 + Math.random() * 4,
    }));
  }, [instanceCount]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {instances.map((instance) => (
        <div
          key={instance.id}
          className="absolute text-white font-extrabold select-none text-[clamp(2rem,8vw,6rem)] animate-glow-pulse"
          style={{
            left: `${instance.left}%`,
            top: `${instance.top}%`,
            transform: `translate(-50%, -50%) rotate(${instance.rotation}deg) scale(${instance.scale})`,
            animationDelay: `${instance.delay}s`,
            animationDuration: `${instance.duration}s`,
            zIndex: 1,
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
};

export default GlowingBackground;
