import type { Metadata } from 'next';
import { SolanaProvider } from '@/components/SolanaProvider';
import { BitcoinWalletProvider } from '@/contexts/BitcoinWalletProvider';
import { ZplClientProvider } from '@/contexts/ZplClientProvider';
import { PrivacyCashProvider } from '@/contexts/PrivacyCashContext';
import './globals.css';

export const metadata: Metadata = {
  title: 'Solis | Bridge & Swap BTC on Solana',
  description: 'The simplest way to bridge native BTC to zBTC and swap on Solana. Free bridging, powered by Zeus Network.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-primary min-h-screen flex flex-col font-mono antialiased">
        <SolanaProvider>
          <BitcoinWalletProvider>
            <ZplClientProvider>
              <PrivacyCashProvider>
                {children}
              </PrivacyCashProvider>
            </ZplClientProvider>
          </BitcoinWalletProvider>
        </SolanaProvider>
      </body>
    </html>
  );
}
