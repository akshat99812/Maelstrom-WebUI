"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TokenRow } from "../tokens/TokenRow";
import { TokenRowSkeleton } from "../tokens/TokenRowSkeleton";
import { RowPool } from "@/types/pool";

interface PoolsTableProps {
  pools: RowPool[];
  loading: boolean;
}

export function PoolsTable(
  {pools, loading}: PoolsTableProps
) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/90">
          Your Active Pools
        </h2>
        <div className="text-sm text-muted-foreground/70">
          Total Pools: {pools.length}
        </div>
      </div>
      <div className="relative space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <TokenRowSkeleton key={i} />)
        ) : pools.length > 0 ? (
          pools.map((pool, ind) => (
            <div
              key={ind}
              className="transform transition-all duration-200 hover:scale-[1.02] hover:shadow-glow-sm"
            >
              <TokenRow poolToken={pool} />
            </div>
          ))
        ) : (
          <div
            className="relative rounded-lg p-8 text-center backdrop-blur-sm border border-white/[0.05]
            before:absolute before:inset-0 before:bg-background-800/30 before:-z-10"
          >
            <p className="text-muted-foreground/70">No active pools found</p>
            <Button asChild className="mt-4">
              <Link href="/pools">Explore Available Pools</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
