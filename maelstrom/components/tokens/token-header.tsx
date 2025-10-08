"use client";

import { Badge } from "@/components/ui/badge";
import { Token } from "@/types/token";

interface TokenHeaderProps {
  token: Token;
}

export function TokenHeader({ token }: TokenHeaderProps) {
  return (
    <div className="relative p-6 rounded-lg overflow-hidden">
      {/* Glass background with gradient */}
      <div className="absolute inset-0 bg-background-800/40 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
      <div className="absolute inset-0 border border-white/[0.05] rounded-lg" />

      {/* Content */}
      <div className="relative flex items-start gap-3">
        {/* Enhanced token icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-primary-600 p-[1px]">
          <div className="w-full h-full rounded-xl bg-gradient-to-br from-background-900 to-background-800 flex items-center justify-center">
            <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-accent-500 to-primary-500">
              {token.symbol.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Token info */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold flex items-center gap-2 font-clash-display">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">
              {token.symbol.toUpperCase()} / ETH Pool
            </span>
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className="text-xs bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 text-emerald-400"
            >
              Active
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
