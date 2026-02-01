'use client';

import { useState } from 'react';
import { BTC_WRAPPERS, POPULAR_TOKENS, BTCWrapper } from '@/lib/tokens';

type Token = typeof BTC_WRAPPERS[0] | typeof POPULAR_TOKENS[0];

interface TokenSelectorProps {
  selected: Token | null;
  onSelect: (token: Token) => void;
  label: string;
  prioritizeBTC?: boolean;
}

export function TokenSelector({ selected, onSelect, label, prioritizeBTC = true }: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const btcTokens = BTC_WRAPPERS;
  const otherTokens = POPULAR_TOKENS;

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
  };

  const isBTCWrapper = (token: Token): token is BTCWrapper => {
    return 'custodyModel' in token;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-bg-input border border-border rounded-input px-3 py-2
                   hover:border-text-muted transition-colors min-w-[140px]"
      >
        {selected ? (
          <>
            <div className="w-6 h-6 rounded-full bg-bg-hover flex items-center justify-center text-xs">
              {selected.symbol.charAt(0)}
            </div>
            <span className="text-text-primary">{selected.symbol}</span>
            {isBTCWrapper(selected) && selected.custodyModel === 'mpc' && (
              <span className="badge-purple text-[10px] px-1 py-0.5">MPC</span>
            )}
          </>
        ) : (
          <span className="text-text-muted">Select</span>
        )}
        <svg 
          className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute top-full left-0 mt-2 w-64 bg-bg-card border border-border 
                          rounded-card shadow-lg z-50 max-h-80 overflow-y-auto">
            {prioritizeBTC && (
              <>
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-xs text-accent-btc font-bold uppercase tracking-wider">
                    BTC Wrappers
                  </span>
                </div>
                {btcTokens.map((token) => (
                  <button
                    key={token.mint}
                    onClick={() => handleSelect(token)}
                    className="w-full flex items-center gap-3 px-3 py-3 hover:bg-bg-hover transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-accent-btc/20 flex items-center justify-center">
                      <span className="text-accent-btc font-bold text-sm">₿</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-text-primary">{token.symbol}</span>
                        {token.custodyModel === 'mpc' && (
                          <span className="badge-purple text-[10px] px-1 py-0.5">MPC</span>
                        )}
                        {token.custodyModel === 'custodial' && (
                          <span className="badge-btc text-[10px] px-1 py-0.5">CUSTODIAL</span>
                        )}
                      </div>
                      <span className="text-text-muted text-xs">{token.issuer}</span>
                    </div>
                  </button>
                ))}
              </>
            )}
            
            <div className="px-3 py-2 border-b border-border border-t">
              <span className="text-xs text-text-muted font-bold uppercase tracking-wider">
                Other Tokens
              </span>
            </div>
            {otherTokens.map((token) => (
              <button
                key={token.mint}
                onClick={() => handleSelect(token)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-bg-hover transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-bg-hover flex items-center justify-center">
                  <span className="text-text-primary font-bold text-sm">{token.symbol.charAt(0)}</span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-text-primary">{token.symbol}</span>
                  <span className="text-text-muted text-xs block">{token.name}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
