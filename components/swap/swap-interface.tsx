"use client";

import { useState, useEffect, use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenSelector } from "@/components/swap/token-selector";
import { SwapPreviewModal } from "@/components/swap/swap-preview-modal";
import { BuyForm } from "@/components/swap/buy-form";
import { SellForm } from "@/components/swap/sell-form";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ArrowDownUp, Settings } from "lucide-react";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { usePublicClient, useWriteContract } from "wagmi";
import { Token } from "@/types/token";
import { BuyRequest, SellRequest, SwapRequest } from "@/types/trades";
import { ETH_ROW_POOL, RowPool } from "@/types/pool";
import { parseEther } from "viem";

interface SwapState {
  tokenIn: Token | undefined;
  tokenOut: Token | undefined;
  amountIn: string;
  amountOut: string;
  exchangeRate: string;
}
const ITEMS_PER_PAGE = 10;

export function SwapInterface() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const contractClient = new ContractClient(
    CONTRACT_ADDRESS,
    writeContractAsync,
    publicClient
  );
  const [swapState, setSwapState] = useState<SwapState>({
    tokenIn: undefined,
    tokenOut: undefined,
    amountIn: "",
    amountOut: "",
    exchangeRate: "",
  });
  const [tokens, setTokens] = useState<RowPool[]>([ETH_ROW_POOL]);
  const [loadedTokens, setLoadedTokens] = useState<number>(0);
  const [tokensInitialized, setTokensInitialized] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInSellPrice, setTokenInSellPrice] = useState<number>(0);
  const [tokenOutBuyPrice, setTokenOutBuyPrice] = useState<number>(0);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5); // Default 0.5%

  const calculateOutput = (amount: string, isInput: boolean) => {
    if (!amount || !tokenInSellPrice || !tokenOutBuyPrice) return "";

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) return "";

    if (isInput) {
      // Converting tokenIn to tokenOut: amount * sellPrice / buyPrice
      const output = (amountNum * tokenInSellPrice) / tokenOutBuyPrice;
      return output.toString();
    } else {
      // Converting tokenOut to tokenIn: amount * buyPrice / sellPrice
      const output = (amountNum * tokenOutBuyPrice) / tokenInSellPrice;
      return output.toString();
    }
  };

  const handleAmountInChange = async (value: string) => {
    setSwapState((prev) => ({
      ...prev,
      amountIn: value,
      amountOut: calculateOutput(value, true),
    }));
  };

  const handleAmountOutChange = (value: string) => {
    setSwapState((prev) => ({
      ...prev,
      amountOut: value,
      amountIn: calculateOutput(value, false),
    }));
  };

  const handletokenInChange = async (token: Token) => {
    try {
      setFetchingRates(true);
      let sellPrice = parseEther("1").toString();
      if (!(token.name === "Ether" && token.symbol === "ETH")) {
        sellPrice = await contractClient.getSellPrice(token);
      }

      const newSellPrice = Number(sellPrice);
      const newExchangeRate = tokenOutBuyPrice / newSellPrice;

      setTokenInSellPrice(newSellPrice);

      setSwapState((prev) => {
        const formattedExchangeRate =
          isFinite(newExchangeRate) && newExchangeRate > 0
            ? newExchangeRate.toString()
            : "0";
        const newState = {
          ...prev,
          tokenIn: token,
          exchangeRate: formattedExchangeRate,
        };
        if (prev.amountIn) {
          newState.amountOut = calculateOutput(prev.amountIn, true);
        }
        return newState;
      });
      setFetchingRates(false);
    } catch (error) {
      console.error(`Error getting exchange rates:,${error}`);
      setFetchingRates(false);
    }
  };

  const handletokenOutChange = async (token: Token) => {
    try {
      setFetchingRates(true);
      let buyPrice = parseEther("1").toString();
      if (!(token.name === "Ether" && token.symbol === "ETH")) {
        buyPrice = await contractClient.getBuyPrice(token);
      }

      const newBuyPrice = Number(buyPrice);
      const newExchangeRate = newBuyPrice / tokenInSellPrice;

      setTokenOutBuyPrice(newBuyPrice);

      setSwapState((prev) => {
        const formattedExchangeRate =
          isFinite(newExchangeRate) && newExchangeRate > 0
            ? newExchangeRate.toString()
            : "0";
        const newState = {
          ...prev,
          tokenOut: token,
          exchangeRate: formattedExchangeRate,
        };
        if (prev.amountIn) {
          newState.amountOut = calculateOutput(prev.amountIn, true);
        }
        return newState;
      });
      setFetchingRates(false);
    } catch (error) {
      console.error(`Error getting exchange rates:,${error}`);
      setFetchingRates(false);
    }
  };

  const handleSwapTokens = async () => {
    if (!swapState.tokenOut || !swapState.tokenIn) return;
    setIsSwapping(true);
    try {
      // Store the current tokens before swapping
      const currentTokenIn = swapState.tokenIn;
      const currentTokenOut = swapState.tokenOut;

      // Swap the tokens in state first
      setSwapState((prev) => ({
        tokenIn: prev.tokenOut,
        tokenOut: prev.tokenIn,
        amountIn: "",
        amountOut: "",
        exchangeRate: prev.exchangeRate, // Keep current rate temporarily
      }));

      // Now update the exchange rates for the swapped tokens
      await handletokenInChange(currentTokenOut);
      await handletokenOutChange(currentTokenIn);
    } catch (error) {
      console.error("Error swapping tokens:", error);
    } finally {
      setIsSwapping(false);
    }
  };

  const handlePreviewSwap = () => {
    if (
      !swapState.amountIn ||
      !swapState.amountOut ||
      !swapState.tokenIn ||
      !swapState.tokenOut
    ) {
      toast.error(`Invalid Amount: Please enter an amount to swap`);
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSwap = async () => {
    if (!swapState.tokenIn || !swapState.tokenOut) {
      toast.error(`Select Tokens: Please select both input and output tokens.`);
      return;
    }
    setLoading(true);

    // Calculate minimum tokens out with slippage tolerance
    const amountOutNum = parseFloat(swapState.amountOut);
    const slippageMultiplier = (100 - slippageTolerance) / 100;
    const minimumTokenOut = (amountOutNum * slippageMultiplier).toString();

    if (
      swapState.tokenIn.symbol == "ETH" ||
      swapState.tokenOut.symbol == "ETH"
    ) {
      if (swapState.tokenIn.symbol == "ETH") {
        const buyRequest: BuyRequest = {
          token: swapState.tokenOut,
          amountIn: parseEther(swapState.amountIn).toString(),
        };
        const result = await contractClient.buy(buyRequest);
        if (result.success) {
          toast.success(`Swap Successful! Tx Hash: ${result.txHash}`);
        } else {
          toast.error(
            `Swap Failed!: ${
              result.error || "An error occurred during the swap process."
            }`
          );
        }
        return;
      }

      if (swapState.tokenOut.symbol == "ETH") {
        const sellRequest: SellRequest = {
          token: swapState.tokenIn,
          amountIn: parseEther(swapState.amountIn).toString(),
        };
        const result = await contractClient.sell(sellRequest);
        if (result.success) {
          toast.success(`Swap Successful! Tx Hash: ${result.txHash}`);
        } else {
          toast.error(
            `Swap Failed!: ${
              result.error || "An error occurred during the swap process."
            }`
          );
        }
        return;
      }
    }

    const swapRequest: SwapRequest = {
      tokenIn: swapState.tokenIn,
      tokenOut: swapState.tokenOut,
      amountIn: parseEther(swapState.amountIn).toString(),
      minimumTokenOut: parseEther(minimumTokenOut).toString(),
    };
    const result = await contractClient.swap(swapRequest);
    if (result.success) {
      toast.success(`Swap Successful! Tx Hash: ${result.txHash}`);
    } else {
      toast.error(
        `Swap Failed!: ${
          result.error || "An error occurred during the swap process."
        }`
      );
    }
    setLoading(false);
    setShowPreview(false);
  };

  const getPoolLength = async () => {
    try {
      const poolCount = await contractClient.getPoolCount();
      console.log(`Total pools: ${poolCount}`);
      return poolCount;
    } catch (error) {
      console.error("Error fetching total pools:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Failed to fetch total pools count: ${errorMessage}`);
      return 0;
    }
  };

  const loadAllPools = async (totalPoolsCount: number) => {
    // Skip if we've already loaded the correct number of tokens
    if (tokensInitialized && loadedTokens === totalPoolsCount) return;

    try {
      // Reset tokens to initial state (only ETH_ROW_POOL) before loading
      setTokens([ETH_ROW_POOL]);
      setTokensInitialized(false);

      let currentLoaded = 0;
      let allPools: RowPool[] = [ETH_ROW_POOL];

      while (currentLoaded < totalPoolsCount) {
        const startIndex = currentLoaded;
        const endIndex = Math.min(
          startIndex + ITEMS_PER_PAGE - 1,
          totalPoolsCount - 1
        );
        const newPools = await contractClient.getPools(startIndex, endIndex);
        if (newPools.length === 0) break; // No more pools to load

        allPools = [...allPools, ...newPools];
        setTokens(allPools);
        currentLoaded += newPools.length;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      setTokensInitialized(true);
    } catch (error) {
      console.error("Error loading pools:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      toast.error(`Failed to load pools: ${errorMessage}`);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Skip initialization if tokens are already loaded
      if (tokensInitialized) return;

      setLoading(true);
      try {
        const poolCount = await getPoolLength();
        await loadAllPools(poolCount);
        setLoadedTokens(poolCount);
      } catch (err) {
        console.error("Initialization failed:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        toast.error(`Failed to initialize token list: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [tokensInitialized]);

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-800/95 to-bg-900/95 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--accent-cyan)/10%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--primary-500)/10%,transparent_50%)]" />
        <div className="absolute inset-0 border border-white/[0.05] rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent" />

        <div className="relative p-6 backdrop-blur-sm">
          {/* Top Navigation */}
          <div className="mb-6">
            <Tabs defaultValue="swap" className="w-full">
              <div className="flex items-center justify-between mb-4">
                <TabsList className="grid grid-cols-3 bg-black/20 p-1 rounded-2xl backdrop-blur-md border border-white/[0.05]">
                  <TabsTrigger
                    value="swap"
                    className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-accent-cyan/20 data-[state=active]:to-primary-600/20 data-[state=active]:border-accent-cyan/20 data-[state=active]:shadow-lg data-[state=active]:text-accent-cyan rounded-xl transition-all duration-200"
                  >
                    Swap
                  </TabsTrigger>
                  <TabsTrigger
                    value="buy"
                    className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-accent-cyan/20 data-[state=active]:to-primary-600/20 data-[state=active]:border-accent-cyan/20 data-[state=active]:shadow-lg data-[state=active]:text-accent-cyan rounded-xl transition-all duration-200"
                  >
                    Buy
                  </TabsTrigger>
                  <TabsTrigger
                    value="sell"
                    className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-accent-cyan/20 data-[state=active]:to-primary-600/20 data-[state=active]:border-accent-cyan/20 data-[state=active]:shadow-lg data-[state=active]:text-accent-cyan rounded-xl transition-all duration-200"
                  >
                    Sell
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="swap" className="mt-2">
                <div className="space-y-1">
                  <div className="relative bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md group">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-medium text-white/90 font-plus-jakarta">
                        Sell
                      </div>
                      <TokenSelector
                        Tokens={tokens}
                        selectedToken={swapState.tokenIn}
                        onTokenChange={handletokenInChange}
                      />
                    </div>
                    <div className="relative">
                      <input
                        placeholder="0.00"
                        value={swapState.amountIn}
                        disabled={
                          !swapState.tokenIn ||
                          fetchingRates ||
                          !swapState.tokenOut ||
                          isSwapping
                        }
                        onChange={(e) => handleAmountInChange(e.target.value)}
                        className="w-full h-16 text-3xl font-medium bg-black/10 group-hover:bg-black/20 rounded-xl px-4 
                          border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                          placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                      />
                    </div>
                  </div>

                  {/* Swap Button */}
                  <div className="flex justify-center -my-3 relative z-10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSwapTokens}
                      disabled={isSwapping || fetchingRates}
                      className="h-12 w-12 rounded-2xl bg-gradient-to-b from-accent-cyan/20 to-primary-600/20 hover:from-accent-cyan/30 hover:to-primary-600/30
                        border border-white/10 p-0 shadow-lg hover:shadow-accent-cyan/20 transition-all duration-300 backdrop-blur-sm"
                    >
                      <ArrowDownUp className="h-5 w-5 text-accent-cyan" />
                    </Button>
                  </div>

                  <div className="relative bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-lg font-medium text-white">Buy</div>
                      <TokenSelector
                        Tokens={tokens}
                        selectedToken={swapState.tokenOut}
                        onTokenChange={handletokenOutChange}
                      />
                    </div>
                    <div className="relative">
                      <input
                        placeholder="0.00"
                        value={swapState.amountOut}
                        onChange={(e) => handleAmountOutChange(e.target.value)}
                        disabled={
                          !swapState.tokenIn ||
                          fetchingRates ||
                          !swapState.tokenOut ||
                          isSwapping
                        }
                        className="w-full h-16 text-3xl font-medium bg-black/20 rounded-lg px-4 
                          border-transparent focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                          placeholder:text-white/30 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Swap Details */}
                {swapState.amountIn &&
                  swapState.amountOut &&
                  swapState.tokenIn &&
                  swapState.tokenOut &&
                  !fetchingRates &&
                  !isSwapping && (
                    <div className="mt-5 space-y-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-sm">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 font-medium">Rate</span>
                        <span className="text-white/80 font-medium">
                          1 {swapState.tokenIn!.symbol.toUpperCase()} ={" "}
                          {(Number(swapState.amountOut) / Number(swapState.amountIn))}{" "}
                          {swapState.tokenOut!.symbol.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/50 font-medium">Fee</span>
                        <span className="text-white/80 font-medium">
                          ~$12.50
                        </span>
                      </div>

                      {/* Slippage Tolerance */}
                      <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/50 font-medium flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Slippage Tolerance
                          </span>
                          <span className="text-white/80 font-medium">
                            {slippageTolerance}%
                          </span>
                        </div>
                        <div className="px-1">
                          <Slider
                            value={[slippageTolerance]}
                            onValueChange={(value) =>
                              setSlippageTolerance(value[0])
                            }
                            min={0.1}
                            max={5.0}
                            step={0.1}
                            className="w-full [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-accent-cyan [&_[data-slot=slider-range]]:to-primary-500 [&_[data-slot=slider-thumb]]:border-accent-cyan/50 [&_[data-slot=slider-thumb]]:bg-gradient-to-b [&_[data-slot=slider-thumb]]:from-accent-cyan/20 [&_[data-slot=slider-thumb]]:to-primary-600/20 [&_[data-slot=slider-thumb]]:shadow-lg [&_[data-slot=slider-thumb]]:shadow-accent-cyan/25"
                          />
                          <div className="flex justify-between text-xs text-white/30 mt-1">
                            <span>0.1%</span>
                            <span>5.0%</span>
                          </div>
                        </div>
                        {swapState.tokenOut && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">
                              Minimum received:
                            </span>
                            <span className="text-white/60">
                              {(
                                (parseFloat(swapState.amountOut) *
                                  (100 - slippageTolerance)) /
                                100
                              ).toFixed(6)}{" "}
                              {swapState.tokenOut.symbol.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Swap Action Button */}
                <Button
                  onClick={handlePreviewSwap}
                  disabled={
                    !swapState.amountIn ||
                    !swapState.amountOut ||
                    isSwapping ||
                    loading
                  }
                  className="w-full h-14 mt-6 bg-gradient-to-r from-accent-cyan to-primary-500 hover:from-accent-cyan/90 hover:to-primary-500/90 
                    text-white font-semibold rounded-xl shadow-lg hover:shadow-accent-cyan/25 transition-all duration-300 
                    disabled:from-gray-600/50 disabled:to-gray-700/50 disabled:cursor-not-allowed disabled:text-white/50
                    border border-white/[0.05] backdrop-blur-sm font-plus-jakarta text-base"
                >
                  {isSwapping ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" />
                  ) : (
                    "Preview Swap"
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="buy" className="mt-2">
                <BuyForm
                  tokens={tokens}
                  handleTokenOutChange={handletokenOutChange}
                  buyPrice={tokenOutBuyPrice.toString()}
                  isFetchingRates={fetchingRates}
                />
              </TabsContent>

              <TabsContent value="sell" className="mt-2">
                <SellForm
                  tokens={tokens}
                  handleTokenInChange={handletokenInChange}
                  sellPrice={tokenInSellPrice.toString()}
                  isFetchingRates={fetchingRates}
                />
              </TabsContent>
            </Tabs>
          </div>

          <SwapPreviewModal
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            onConfirm={handleConfirmSwap}
            tokenIn={swapState.tokenIn!}
            tokenOut={swapState.tokenOut!}
            amountIn={swapState.amountIn}
            amountOut={swapState.amountOut}
            loading={loading}
            slippageTolerance={slippageTolerance}
          />
        </div>
      </div>
    </div>
  );
}
