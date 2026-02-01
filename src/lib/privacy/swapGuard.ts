/**
 * SWAP GUARD - Fee Calculation & Validation
 * Handles Solis fee tiers and settlement calculation
 */

export const FEES = {
  STANDARD: 50,   // 0.50% - Standard swaps
  PRIVATE: 75,    // 0.75% - Private mode (+0.25% for MEV protection)
};

// Jito tip for private transactions
const JITO_TIP_SOL = 0.0002;

export class SwapGuard {
  /**
   * Calculate settlement breakdown for a swap
   */
  static calculateSettlement(grossAmount: number, privateMode: boolean = false) {
    const feeBps = privateMode ? FEES.PRIVATE : FEES.STANDARD;
    const feePercent = feeBps / 10000;
    const platformFee = grossAmount * feePercent;
    const jitoTip = privateMode ? JITO_TIP_SOL : 0;
    const userNet = grossAmount - platformFee - jitoTip;

    return {
      grossAmount: grossAmount.toFixed(6),
      platformFee: platformFee.toFixed(6),
      platformFeePercent: (feePercent * 100).toFixed(2),
      jitoTip: jitoTip.toFixed(6),
      userNet: userNet.toFixed(6),
      privateMode,
    };
  }

  /**
   * Validate swap parameters
   */
  static validateSwap(amount: number, privateMode: boolean = false): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: "Amount must be greater than 0" };
    }

    // Minimum swap for private mode (to cover Jito tip)
    if (privateMode && amount < 0.001) {
      return { valid: false, error: "Minimum 0.001 SOL for private swaps" };
    }

    return { valid: true };
  }

  /**
   * Get fee info for display
   */
  static getFeeInfo(privateMode: boolean = false) {
    const feeBps = privateMode ? FEES.PRIVATE : FEES.STANDARD;
    
    return {
      feeBps,
      feePercent: (feeBps / 100).toFixed(2),
      label: privateMode ? "Private Swap" : "Standard Swap",
      description: privateMode 
        ? "MEV-protected via Helius Private Sender"
        : "Standard swap with Jupiter routing",
      includes: privateMode 
        ? ["MEV protection", "Hidden mempool", "Priority execution"]
        : ["Best price routing", "Slippage protection"],
    };
  }
}

export default SwapGuard;
