"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

interface HeaderProps {
  breadcrumb?: string;
}

export default function Header({ breadcrumb }: HeaderProps) {
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const shortenAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  return (
    <header className="border-b border-[#222] bg-black">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo + Beta Badge */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-wide">SOLIS</span>
            </Link>
            <span className="text-[9px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 tracking-[0.15em] uppercase font-medium">
              BETA
            </span>
            
            {/* Breadcrumb */}
            {breadcrumb && (
              <div className="hidden md:flex items-center gap-2 text-[#666]">
                <span>/</span>
                <span className="text-white">{breadcrumb}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-[#666] hover:text-white text-sm tracking-wider transition-colors">
              Markets
            </Link>
            <Link href="/swap" className="text-[#666] hover:text-white text-sm tracking-wider transition-colors">
              Swap
            </Link>
            <Link href="/docs" className="text-[#666] hover:text-white text-sm tracking-wider transition-colors">
              Docs
            </Link>
          </nav>

          {/* Wallet Button */}
          <div className="flex items-center gap-3">
            {connected && publicKey ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#222] hover:border-[#444] text-white text-xs font-mono tracking-wider transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {shortenAddress(publicKey.toBase58())}
                  <span className="text-[#666]">▾</span>
                </button>
                
                {showDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-black border border-[#222] shadow-lg z-50">
                    <a
                      href={`https://solscan.io/account/${publicKey.toBase58()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#111] transition-colors"
                    >
                      View on Solscan ↗
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(publicKey.toBase58());
                        setShowDropdown(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#111] transition-colors"
                    >
                      Copy Address
                    </button>
                    <div className="border-t border-[#222]" />
                    <button
                      onClick={handleDisconnect}
                      className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-[#111] transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setVisible(true)}
                className="px-4 py-1.5 bg-white text-black text-xs font-bold tracking-wider uppercase hover:bg-[#e0e0e0] transition-colors"
              >
                Connect
              </button>
            )}

            {/* Mobile Menu Button */}
            <button className="md:hidden p-2 text-[#666] hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
