"use client";

import Link from "next/link";
import Image from "next/image";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface HeaderProps {
  activePage?: "assets" | "swap" | "docs";
  breadcrumb?: string;
}

export default function Header({ activePage, breadcrumb }: HeaderProps) {
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <header className="border-b border-[#222] bg-black sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center">
            <Image src="/solis-logo.png" alt="Solis" width={120} height={48} className="h-8 w-auto" />
          </Link>
          {breadcrumb && (
            <div className="flex items-center gap-2 text-[11px] tracking-[0.15em] text-[#666]">
              <Link href="/" className="hover:text-white transition-colors">Assets</Link>
              <span>/</span>
              <span className="text-white">{breadcrumb}</span>
            </div>
          )}
        </div>
        <nav className="flex items-center gap-6 text-[11px] tracking-[0.2em] uppercase">
          <Link href="/" className={`transition-colors ${activePage === "assets" ? "text-white font-bold border-b border-white pb-0.5" : "text-[#666] hover:text-white"}`}>Assets</Link>
          <Link href="/swap" className={`transition-colors ${activePage === "swap" ? "text-white font-bold border-b border-white pb-0.5" : "text-[#666] hover:text-white"}`}>Swap</Link>
          <Link href="/docs" className={`transition-colors ${activePage === "docs" ? "text-white font-bold border-b border-white pb-0.5" : "text-[#666] hover:text-white"}`}>Docs</Link>
        </nav>
        {connected ? (
          <div className="flex items-center gap-2 text-[11px] text-[#a0a0a0] tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#14F195]" />
            {publicKey?.toBase58().slice(0, 4)}...{publicKey?.toBase58().slice(-4)}
          </div>
        ) : (
          <button onClick={() => setVisible(true)} className="px-4 py-2 bg-white text-black text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-slate-200 transition-colors">
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
