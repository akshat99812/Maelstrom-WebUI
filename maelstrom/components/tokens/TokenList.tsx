"use client";

import { TokenRow } from "./TokenRow";
import { TokenRowSkeleton } from "./TokenRowSkeleton";
import { TokenSearchBar } from "./TokenSearchBar";
import { usePools } from "@/hooks/use-pools";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { RowPool } from "@/types/pool";
import { debounce } from "lodash";
import { Input } from "../ui/input";

const ITEMS_PER_PAGE = 20;

export function TokenList() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const contractClient = new ContractClient(
    CONTRACT_ADDRESS,
    writeContractAsync,
    publicClient
  );
  const [tokens, setTokens] = useState<RowPool[]>([]);
  const [totalPools, setTotalPools] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [loadedTokens, setLoadedTokens] = useState(0);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allPoolsLoaded, setAllPoolsLoaded] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const getPoolLength = async () => {
    try {
      const totalPools = await contractClient.getPoolCount();
      setTotalPools(totalPools);
    } catch (error) {
      console.error("Error fetching total pools:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to fetch total pools count: ${errorMessage}`);
    }
  };

  const loadMorePools = async () => {
    if (loadedTokens >= totalPools || isLoadingMore || allPoolsLoaded) return; // No more pools to load
    
    setIsLoadingMore(true);
    try {
      const newPools = await contractClient.getPools(
        loadedTokens,
        ITEMS_PER_PAGE
      );
      setTokens((prev) => [...prev, ...newPools]);
      setLoadedTokens((prev) => prev + newPools.length);
      
      // Check if all pools have been loaded
      if (loadedTokens + newPools.length >= totalPools) {
        setAllPoolsLoaded(true);
      }
    } catch (error) {
      console.error("Error loading more pools:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Failed to load pools (${loadedTokens}-${loadedTokens + ITEMS_PER_PAGE}): ${errorMessage}`);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      search;
    }, 300),
    [search]
  );

  const filteredTokens = useMemo(() => {
    if (!search) return tokens;
    const lowerSearch = search.toLowerCase();
    return tokens.filter(pool => 
      pool.token.name.toLowerCase().includes(lowerSearch) || 
      pool.token.symbol.toLowerCase().includes(lowerSearch)
    );
  },[search, tokens])

  // Reset display count when filters change
  useEffect(() => {
    const init = async () => {
      try {
        await getPoolLength();
        await loadMorePools();
        setInitialLoad(false);
      } catch (err) {
        console.error("Initialization failed:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to initialize token list: ${errorMessage}`);
        setInitialLoad(false);
      }
    };
    init();
  }, []);

  // Intersection Observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !isLoadingMore && !allPoolsLoaded && !search) {
          loadMorePools();
        }
      },
      {
        threshold: 1.0,
        rootMargin: "100px"
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
  }, [isLoadingMore, allPoolsLoaded, loadedTokens, totalPools, search]);

  // Reset state when search changes
  useEffect(() => {
    debouncedSearch(search);
  }, [search, debouncedSearch]);

  if (error) {
    return (
      <div className="relative min-h-[400px] flex flex-col items-center justify-center py-12 px-4 z-50">
        <div className="relative z-50 overflow-hidden rounded-3xl shadow-2xl max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-800/95 to-bg-900/95 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--destructive)/20%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--destructive)/15%,transparent_50%)]" />
          <div className="absolute inset-0 border border-destructive/20 rounded-3xl bg-gradient-to-b from-destructive/5 to-transparent" />
          
          <div className="relative p-8 backdrop-blur-sm text-center">
            <div className="text-destructive/80 mb-6">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white/90 mb-4 font-plus-jakarta">
              Something went wrong
            </h3>
            <p className="text-white/70 text-sm mb-8 break-words leading-relaxed max-w-sm mx-auto">
              {error}
            </p>
            <Button
              onClick={() => {
                setError(null);
                setTokens([]);
                setLoadedTokens(0);
                setAllPoolsLoaded(false);
                setInitialLoad(true);
                // Retry loading
                const init = async () => {
                  try {
                    await getPoolLength();
                    await loadMorePools();
                    setInitialLoad(false);
                  } catch (err) {
                    console.error("Retry failed:", err);
                    setError(`Retry failed: ${err}`);
                  }
                };
                init();
              }}
              className="bg-gradient-to-r from-accent-cyan to-primary-500 hover:from-accent-cyan/90 hover:to-primary-500/90 
                text-white font-semibold rounded-xl shadow-lg hover:shadow-accent-cyan/25 transition-all duration-300 
                border border-white/[0.05] backdrop-blur-sm font-plus-jakarta px-6 py-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (initialLoad && loadedTokens === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        {Array.from({ length: 5 }).map((_, i) => (
          <TokenRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (filteredTokens.length === 0) {
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

  const displayedTokens = filteredTokens;

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

      {/* Loading indicator for infinite scroll */}
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
      )}
    </div>
  );
}
