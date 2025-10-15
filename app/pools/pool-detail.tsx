"use client";

import { TokenHeader } from "@/components/tokens/token-header";
import { TokenPairStats } from "@/components/tokens/token-pair-stats";
import { LiquidityBreakdown } from "@/components/tokens/liquidity-breakdown";
import { LiquidityActions } from "@/components/tokens/liquidity-actions";
import { PriceCharts } from "@/components/tokens/price-charts";
import { TokenPageSkeleton } from "@/components/tokens/token-page-skeleton";
import { CSSProperties, useEffect, useState } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { Pool } from "@/types/pool";
import { Address } from "viem";
import { Token } from "@/types/token";

interface TokenPageProps {
  tokenAddress: string;
}

export default function TokenPage({ tokenAddress }: TokenPageProps) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const contractClient = new ContractClient(
    CONTRACT_ADDRESS,
    writeContractAsync,
    publicClient
  );
  const { address } = useAccount();
  const [token, setToken] = useState<Token | null>(null);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (!address) return;
      try {
        const token = await contractClient.getToken(tokenAddress! as Address);
        setToken(token);
        const pool = await contractClient.getPool(token, address);
        setPool(pool);
      } catch (error) {
        setError(
          "Failed to fetch token or pool data." + (error as Error).message
        );
        console.error("Error fetching token or pool data:", error);
        return;
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-gradient-pattern overflow-hidden ">
      <main className="container relative mx-auto px-4 py-8">
        {loading ? (
          <TokenPageSkeleton />
        ) : (
          <div className="space-y-8">
            <TokenHeader token={token!} />

            {/* Token Pair Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <TokenPairStats poolData={pool!} />
            </div>

            {/* Liquidity Breakdown & Actions */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in"
              style={{ "--delay": "200ms" } as CSSProperties}
            >
              <LiquidityBreakdown poolData={pool!} />
              <LiquidityActions
                token={token!}
                lpToken={pool!.lpToken}
                reserve={pool!.reserve}
                poolRatio={Number(pool!.tokenRatio)}
              />
            </div>

            {/* Price Charts */}
            <div
              className="animate-fade-in"
              style={{ "--delay": "600ms" } as CSSProperties}
            >
              <PriceCharts token={token!} pool={pool!} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
