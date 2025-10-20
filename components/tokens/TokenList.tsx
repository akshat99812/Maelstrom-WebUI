"use client";

import { TokenRow } from "./TokenRow";
import { TokenRowSkeleton } from "./TokenRowSkeleton";
import { TokenSearchBar } from "./TokenSearchBar";
import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ContractClient } from "@/lib/contract-client";
import { RowPool } from "@/types/pool";
import { debounce } from "lodash";
import { Input } from "../ui/input";
import { toast } from "sonner";
import Link from "next/link";

const ITEMS_PER_PAGE = 20;

export function TokenList() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const { chainId } = useAccount();
  const contractClient = useMemo(
    () => new ContractClient(writeContractAsync, publicClient, chainId),
    [chainId]
  );

  const [tokens, setTokens] = useState<RowPool[]>([]);
  const [totalPools, setTotalPools] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadedTokens, setLoadedTokens] = useState(0);
  const [search, setSearch] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allPoolsLoaded, setAllPoolsLoaded] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const getPoolLength = useCallback(async () => {
    try {
      const poolCount = await contractClient.getPoolCount();
      setTotalPools(poolCount);
      console.log("Total pools available:", poolCount);
    } catch (error) {
      console.error("Error fetching total pools:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Failed to fetch total pools count: ${errorMessage}`);
    }
  }, [contractClient]);

  const loadMorePools = useCallback(async () => {
    if (loadedTokens >= totalPools || isLoadingMore || allPoolsLoaded) return; // No more pools to load

    setIsLoadingMore(true);
    try {
      const newPools = await contractClient.getPools(
        loadedTokens,
        ITEMS_PER_PAGE >= totalPools ? totalPools - 1 : ITEMS_PER_PAGE
      );
      setTokens((prev) => [...prev, ...newPools]);
      setLoadedTokens((prev) => prev + newPools.length);

      if (loadedTokens + newPools.length >= totalPools) {
        setAllPoolsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading more pools:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(
        `Failed to load pools (${loadedTokens}-${
          loadedTokens + ITEMS_PER_PAGE
        }): ${errorMessage}`
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [contractClient, loadedTokens, totalPools, isLoadingMore, allPoolsLoaded]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearch(value);
    }, 300),
    []
  );

  const filteredTokens = useMemo(() => {
    if (!search) return tokens;
    const lowerSearch = search.toLowerCase();
    return tokens.filter(
      (pool) =>
        pool.token.name.toLowerCase().includes(lowerSearch) ||
        pool.token.symbol.toLowerCase().includes(lowerSearch)
    );
  }, [search, tokens]);

  // Reset display count when filters change
  useEffect(() => {
    const init = async () => {
      try {
        await getPoolLength();
        await loadMorePools();
      } catch (err) {
        console.error("Initialization failed:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Initialization failed: ${errorMessage}`);
      } finally {
        setInitialLoad(false);
      }
    };
    init();
  }, [getPoolLength, loadMorePools]);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (
          target.isIntersecting &&
          !isLoadingMore &&
          !allPoolsLoaded &&
          !search
        ) {
          loadMorePools();
        }
      },
      {
        threshold: 1.0,
        rootMargin: "100px",
      }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [isLoadingMore, allPoolsLoaded, search, loadMorePools]);

  if (initialLoad && loadedTokens === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 5 }).map((_, i) => (
          <TokenRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredTokens.length === 0 && !initialLoad) {
    return (
      <div>
        <div className="mb-6">
          <div className="relative flex items-center justify-between w-full p-4  border-white/[0.05] rounded-lg">
            <div className="text-lg font-semibold text-blue-300">
              Available Pools
            </div>
            <div className="relative w-1/2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground/70 transform -translate-y-1/2" />
              <Input
                placeholder="Search by token name or symbol..."
                className="w-full pl-10 bg-background/50 border-white/[0.05] focus:border-accent/30 transition-colors 
        placeholder:text-muted-foreground/50 hover:border-white/[0.08]"
                onChange={(e) => debouncedSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="relative flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-foreground/90">
              {search ? "No matches found" : "No pools available"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {search
                ? "Try adjusting your search terms"
                : "Check back later for new liquidity pools"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search Bar */}
      <div className="mb-6">
        <TokenSearchBar onSearch={setSearch} />
      </div>

      {/* Pool List */}
      <div className="space-y-3">
        {filteredTokens.map((token, index) => (
          <div
            key={index}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TokenRow poolToken={token} />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Link
          href="/create"
          className="relative z-50 p-2 rounded-2xl bg-accent hover:bg-accent-cyan-2 text-accent-foreground glow-primary"
        >
          Create Pool
        </Link>
      </div>

      {/* Loading indicator for infinite scroll
      {!search && (
        <div ref={observerRef} className="py-4 flex justify-center">
          {isLoadingMore && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more pools...</span>
            </div>
          )}
          {allPoolsLoaded && totalPools > 0 && (
            <div className="text-center text-muted-foreground">
              <p className="text-sm font-medium">
                All {totalPools} pools have been loaded
              </p>
            </div>
          )}
        </div>
      )} */}
    </div>
  );
}
