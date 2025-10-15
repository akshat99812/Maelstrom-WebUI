"use client";

import type { RowPool } from "@/types/pool";
import { formatCurrency } from "@/types/pool";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatEther } from "viem";

interface TokenRowProps {
  poolToken: RowPool;
}

export function TokenRow({ poolToken }: TokenRowProps) {
  const { token, buyPrice, sellPrice, totalLiquidity } = poolToken;

  return (
    <Link
      href={`/pools/?tokenAddress=${token.address}`}
    >
      <div
        className="group relative p-4 rounded-lg backdrop-blur-sm border border-white/[0.05] 
        hover:border-accent/20 transition-all duration-300
        before:absolute before:inset-0 before:bg-background-800/30 before:-z-10"
      >
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center gap-4">
          {/* Token Logo */}
          <div className="relative h-12 w-12">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/10 to-primary-500/10" />
            <div className="absolute inset-0 rounded-full backdrop-blur-sm overflow-hidden flex items-center justify-center bg-gradient-to-br from-accent/20 to-primary-500/20">
              <span className="text-lg font-bold text-white/90">
                {token.symbol.charAt(0)}
              </span>
            </div>
          </div>

          {/* Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90 text-lg">
                {token.symbol}
              </span>
              <span className="text-sm text-muted-foreground/70 font-medium">
                {token.name}
              </span>
            </div>
          </div>

          {/* Buy Price */}
          <div className="flex flex-col items-end min-w-[100px]">
            <div className="text-xs text-muted-foreground/60 mb-1">Buy Price</div>
            <div className="text-sm font-medium text-emerald-400">
              {formatEther(BigInt(buyPrice))} ETH
            </div>
          </div>

          {/* Sell Price */}
          <div className="flex flex-col items-end min-w-[100px]">
            <div className="text-xs text-muted-foreground/60 mb-1">Sell Price</div>
            <div className="text-sm font-medium text-red-400">
              {formatEther(BigInt(sellPrice))} ETH
            </div>
          </div>

          {/* Total Liquidity */}
          <div className="hidden lg:flex flex-col items-end min-w-[120px]">
            <div className="text-xs text-muted-foreground/60 mb-1">Total Liquidity</div>
            <div className="text-sm font-medium text-white/90">
              {formatEther(BigInt(totalLiquidity))} ETH
            </div>
          </div>

          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-accent transition-colors duration-200" />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="flex items-center gap-3 mb-3">
            {/* Token Logo */}
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/10 to-primary-500/10" />
              <div className="absolute inset-0 rounded-full backdrop-blur-sm overflow-hidden flex items-center justify-center bg-gradient-to-br from-accent/20 to-primary-500/20">
                <span className="text-lg font-bold text-white/90">
                  {token.symbol.charAt(0)}
                </span>
              </div>
            </div>

            {/* Token Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">
                  {token.symbol}
                </span>
                <span className="text-sm text-muted-foreground/70">
                  {token.name}
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent transition-colors duration-200" />
          </div>

          {/* Price Grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-background/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground/60 mb-1">Buy</div>
              <div className="text-sm font-medium text-emerald-400">
                ${formatCurrency(Number(buyPrice))}
              </div>
            </div>
            <div className="bg-background/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground/60 mb-1">Sell</div>
              <div className="text-sm font-medium text-red-400">
                ${formatCurrency(Number(sellPrice))}
              </div>
            </div>
            <div className="bg-background/30 rounded-lg p-2">
              <div className="text-xs text-muted-foreground/60 mb-1">Liquidity</div>
              <div className="text-sm font-medium text-white/90">
                ${formatCurrency(Number(totalLiquidity))}
              </div>
            </div>
          </div>
        </div>

        {/* Hover gradient */}
        <div
          className="absolute inset-0 -z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300
          bg-gradient-to-r from-accent/5 via-transparent to-transparent rounded-lg"
        />
      </div>
    </Link>
  );
}
