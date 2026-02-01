// @ts-nocheck
import { create } from 'zustand';
import { JupiterQuote } from '@/lib/jupiter';
import { BTC_WRAPPERS, POPULAR_TOKENS } from '@/lib/tokens';

interface SwapState {
  // Token selection
  inputToken: typeof BTC_WRAPPERS[0] | typeof POPULAR_TOKENS[0] | null;
  outputToken: typeof BTC_WRAPPERS[0] | typeof POPULAR_TOKENS[0] | null;
  
  // Amounts
  inputAmount: string;
  outputAmount: string;
  
  // Quote
  quote: JupiterQuote | null;
  quoteLoading: boolean;
  quoteError: string | null;
  
  // Settings
  slippageBps: number;
  mevProtection: boolean;
  
  // Swap execution
  swapLoading: boolean;
  swapError: string | null;
  swapTxId: string | null;
  
  // Actions
  setInputToken: (token: typeof BTC_WRAPPERS[0] | typeof POPULAR_TOKENS[0] | null) => void;
  setOutputToken: (token: typeof BTC_WRAPPERS[0] | typeof POPULAR_TOKENS[0] | null) => void;
  setInputAmount: (amount: string) => void;
  setOutputAmount: (amount: string) => void;
  setQuote: (quote: JupiterQuote | null) => void;
  setQuoteLoading: (loading: boolean) => void;
  setQuoteError: (error: string | null) => void;
  setSlippageBps: (bps: number) => void;
  setMevProtection: (enabled: boolean) => void;
  setSwapLoading: (loading: boolean) => void;
  setSwapError: (error: string | null) => void;
  setSwapTxId: (txId: string | null) => void;
  switchTokens: () => void;
  reset: () => void;
}

const initialState = {
  inputToken: BTC_WRAPPERS[0], // zBTC as default (MPC-first)
  outputToken: POPULAR_TOKENS[0], // SOL
  inputAmount: '',
  outputAmount: '',
  quote: null,
  quoteLoading: false,
  quoteError: null,
  slippageBps: 50, // 0.5%
  mevProtection: true, // ON by default
  swapLoading: false,
  swapError: null,
  swapTxId: null,
};

export const useSwapStore = create<SwapState>((set, get) => ({
  ...initialState,
  
  setInputToken: (token) => set({ inputToken: token, quote: null }),
  setOutputToken: (token) => set({ outputToken: token, quote: null }),
  setInputAmount: (amount) => set({ inputAmount: amount }),
  setOutputAmount: (amount) => set({ outputAmount: amount }),
  setQuote: (quote) => set({ quote }),
  setQuoteLoading: (loading) => set({ quoteLoading: loading }),
  setQuoteError: (error) => set({ quoteError: error }),
  setSlippageBps: (bps) => set({ slippageBps: bps }),
  setMevProtection: (enabled) => set({ mevProtection: enabled }),
  setSwapLoading: (loading) => set({ swapLoading: loading }),
  setSwapError: (error) => set({ swapError: error }),
  setSwapTxId: (txId) => set({ swapTxId: txId }),
  
  switchTokens: () => {
    const { inputToken, outputToken, inputAmount, outputAmount } = get();
    set({
      inputToken: outputToken,
      outputToken: inputToken,
      inputAmount: outputAmount,
      outputAmount: inputAmount,
      quote: null,
    });
  },
  
  reset: () => set(initialState),
}));
