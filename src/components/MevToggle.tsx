'use client';

import { useSwapStore } from '@/stores/swap';

export function MevToggle() {
  const { mevProtection, setMevProtection } = useSwapStore();

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">🛡️</span>
        <span className="text-text-secondary text-sm">MEV Protection</span>
      </div>
      
      <button
        onClick={() => setMevProtection(!mevProtection)}
        className={`
          px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors
          ${mevProtection 
            ? 'bg-accent-green/20 text-accent-green' 
            : 'bg-bg-hover text-text-muted'
          }
        `}
      >
        {mevProtection ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}
