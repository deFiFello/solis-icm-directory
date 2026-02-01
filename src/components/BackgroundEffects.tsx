"use client";
import { useEffect, useState } from "react";

export const BackgroundEffects = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevents the "Prop style did not match" error by not rendering 
  // random values until the browser has taken over.
  if (!mounted) return null;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Your existing background circles/animations go here */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#111,black)]" />
      {[...Array(20)].map((_, i) => (
        <div 
          key={i}
          className="absolute bg-white/5 rounded-full blur-xl animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 300}px`,
            height: `${Math.random() * 300}px`,
          }}
        />
      ))}
    </div>
  );
};