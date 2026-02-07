"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useState, useRef, useEffect } from "react";

interface HeaderProps {
  breadcrumb?: string;
}

export default function Header({ breadcrumb }: HeaderProps) {
  const pathname = usePathname();
  const { connected, publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleWalletClick = () => {
    if (connected) {
      setShowDropdown(!showDropdown);
    } else {
      setVisible(true);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowDropdown(false);
  };

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const navItems = [
    { href: "/", label: "HOME" },
    { href: "/swap", label: "SWAP" },
    { href: "/docs", label: "DOCS" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="border-b border-slate-800 bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo + Nav */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-wider">Solis</span>
            </Link>

            {/* Breadcrumb (mobile: show instead of full nav) */}
            {breadcrumb && (
              <div className="flex items-center gap-2 text-sm md:hidden">
                <span className="text-slate-600">/</span>
                <span className="text-white font-medium">{breadcrumb}</span>
              </div>
            )}

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm tracking-wider transition-colors ${
                    isActive(item.href)
                      ? "text-white font-medium"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right Side: Mobile Nav + Wallet */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile Navigation Links */}
            <nav className="flex md:hidden items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2 py-1 text-xs tracking-wider transition-colors ${
                    isActive(item.href)
                      ? "text-white font-medium"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Wallet Button with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={handleWalletClick}
                disabled={connecting}
                className={`px-3 md:px-4 py-2 text-xs md:text-sm font-bold tracking-wider uppercase transition-colors ${
                  connected
                    ? "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"
                    : "bg-white text-black hover:bg-slate-100"
                }`}
              >
                {connecting ? (
                  "CONNECTING..."
                ) : connected && publicKey ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    {shortenAddress(publicKey.toBase58())}
                  </span>
                ) : (
                  "CONNECT WALLET"
                )}
              </button>

              {/* Dropdown Menu */}
              {showDropdown && connected && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-50">
                  <div className="p-3 border-b border-slate-800">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                      Connected
                    </div>
                    <div className="text-sm text-white font-mono">
                      {publicKey ? shortenAddress(publicKey.toBase58()) : ""}
                    </div>
                  </div>
                  <div className="p-2">
                    <a
                      href={`https://solscan.io/account/${publicKey?.toBase58()}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    >
                      View on Solscan ↗
                    </a>
                    <button
                      onClick={handleDisconnect}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
