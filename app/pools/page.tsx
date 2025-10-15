"use client";

import { TokenList } from "@/components/tokens/TokenList";
import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import TokenPage from "./pool-detail";

export default function TokensPage() {
  const searchParams = useSearchParams();
  const tokenAddress = searchParams.get("tokenAddress");
  if (tokenAddress) {
    return <TokenPage tokenAddress={tokenAddress} />;
  }
  return (
    <div className="min-h-screen overflow-hidden bg-gradient-pattern relative">
      <main className="container mx-auto px-4 py-8 relative">
        <div className="max-w-screen-xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text-animated font-clash-display">
              Liquidity Pools
            </h1>
            <p className="text-lg text-white/60 max-w-2xl mx-auto font-plus-jakarta">
              Browse and interact with liquidity pools across the protocol,
              monitor performance, and find trading opportunities.
            </p>
          </div>

          {/* Main Content */}
          <Card className="relative overflow-hidden rounded-3xl shadow-2xl border-0">
            <div className="absolute inset-0 bg-gradient-to-b from-bg-800/95 to-bg-900/95 backdrop-blur-xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--accent-cyan)/5%,transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--primary-500)/5%,transparent_50%)]" />
            <div className="absolute inset-0 border border-white/[0.05] rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent" />
            <CardContent className="mt-4">
              <TokenList />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
