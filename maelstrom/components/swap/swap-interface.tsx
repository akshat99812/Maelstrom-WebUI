"use client";

import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenSelector } from "@/components/swap/token-selector";
import { SwapPreviewModal } from "@/components/swap/swap-preview-modal";
import { BuyForm } from "@/components/swap/buy-form";
import { SellForm } from "@/components/swap/sell-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownUp } from "lucide-react";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { Token } from "@/types/token";
import { SwapRequest } from "@/types/trades";

interface SwapState {
  tokenIn: Token | undefined;
  tokenOut: Token | undefined;
  amountIn: string;
  amountOut: string;
}

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
  });
  const [showPreview, setShowPreview] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<bigint>(BigInt(0));
  const [tokenInSellPrice, setTokenInSellPrice] = useState<bigint>(BigInt(0));
  const [tokenOutBuyPrice, setTokenOutBuyPrice] = useState<bigint>(BigInt(0));
  const [fetchingRates, setFetchingRates] = useState(false);
  const { toast } = useToast();

  const calculateOutput = (amount: string, isInput: boolean) => {
    if (!amount) return "";
    if (isInput) {
      const output = (BigInt(amount) * tokenInSellPrice) / tokenOutBuyPrice;
      return Number(output).toFixed(3);
    }
    const output = (tokenOutBuyPrice * BigInt(amount)) / tokenInSellPrice;
    return Number(output).toFixed(3);
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
      const sellPrice = await contractClient.getSellPrice(token);
      setExchangeRate(BigInt(tokenOutBuyPrice)/BigInt(sellPrice));
      setTokenInSellPrice(BigInt(sellPrice));
      setSwapState((prev) => {
        const newState = { ...prev, tokenIn: token };
        if (prev.amountIn) {
          newState.amountOut = calculateOutput(prev.amountIn, true);
        }
        return newState;
      });
      setFetchingRates(false);
    } catch (error) {
      console.error(`Error getting exchnage rates:,${error}`);
    }
  };

  const handletokenOutChange = async (token: Token) => {
    try {
      setFetchingRates(true);
      const buyPrice = await contractClient.getBuyPrice(token);
      setTokenOutBuyPrice(BigInt(buyPrice));
      setExchangeRate(BigInt(buyPrice)/BigInt(tokenInSellPrice));
      setSwapState((prev) => {
        const newState = { ...prev, tokenOut: token };
        if (prev.amountIn) {
          newState.amountOut = calculateOutput(prev.amountIn, true);
        }
        return newState;
      });
      setFetchingRates(false);
    } catch (error) {
      console.error(`Error getting exchnage rates:,${error}`);
    }
  };

  const handleSwapTokens = () => {
    if(!swapState.tokenOut || !swapState.tokenIn) return;
    setIsSwapping(true);
    setSwapState((prev) => ({
      tokenIn: prev.tokenOut,
      tokenOut: prev.tokenIn,
      amountIn: prev.amountOut,
      amountOut: prev.amountIn,
    }));
    handletokenInChange(swapState.tokenOut);
    handletokenOutChange(swapState.tokenIn);
    handleAmountInChange(swapState.amountOut);
    setIsSwapping(false);
  };

  const handlePreviewSwap = () => {
    if (
      !swapState.amountIn ||
      !swapState.amountOut ||
      !swapState.tokenIn ||
      !swapState.tokenOut
    ) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount to swap",
      });
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmSwap = async () => {
    if (!swapState.tokenIn || !swapState.tokenOut) {
      toast({
        title: "Select Tokens",
        description: "Please select both input and output tokens.",
      });
      return;
    }
    const swapRequest: SwapRequest = {
      tokenIn: swapState.tokenIn,
      tokenOut: swapState.tokenOut,
      amountIn: swapState.amountIn,
      minimumTokenOut: swapState.amountOut, // TODO: Develop UI to set slippage tolerance
    };
    const result = await contractClient.swap(swapRequest);
    if (result.success) {
      toast({
        title: "Swap Successful!",
        description: `Tx Hash: ${result.txHash}`,
      });
    } else {
      toast({
        title: "Swap Failed",
        description:
          result.error || "An error occurred during the swap process.",
      });
    }
  };

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
                        selectedToken={swapState.tokenIn}
                        onTokenChange={handletokenInChange}
                      />
                    </div>
                    <div className="relative">
                      <input
                        placeholder="0.00"
                        value={swapState.amountIn}
                        disabled={!swapState.tokenIn || fetchingRates || !swapState.tokenOut || isSwapping}
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
                        selectedToken={swapState.tokenOut}
                        onTokenChange={handletokenOutChange}
                      />
                    </div>
                    <div className="relative">
                      <input
                        placeholder="0.00"
                        value={swapState.amountOut}
                        onChange={(e) => handleAmountOutChange(e.target.value)}
                        disabled={!swapState.tokenIn || fetchingRates || !swapState.tokenOut || isSwapping}
                        className="w-full h-16 text-3xl font-medium bg-black/20 rounded-lg px-4 
                          border-transparent focus:border-accent/50 focus:ring-1 focus:ring-accent/50
                          placeholder:text-white/30 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Swap Details */}
                {swapState.amountIn && swapState.amountOut && (
                  <div className="mt-5 space-y-3 p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl backdrop-blur-sm">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50 font-medium">Rate</span>
                      {swapState.tokenIn && swapState.tokenOut && !fetchingRates && (
                        <span className="text-white/80 font-medium">
                          1 {swapState.tokenIn.symbol.toUpperCase()} ={" "}
                          {Number(exchangeRate).toFixed(3)}{" "}
                          {swapState.tokenOut.symbol.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50 font-medium">Fee</span>
                      <span className="text-white/80 font-medium">~$12.50</span>
                    </div>
                  </div>
                )}

                {/* Swap Action Button */}
                <Button
                  onClick={handlePreviewSwap}
                  disabled={
                    !swapState.amountIn || !swapState.amountOut || isSwapping
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
                <BuyForm />
              </TabsContent>

              <TabsContent value="sell" className="mt-2">
                <SellForm />
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
            loading={isSwapping}
          />
        </div>
      </div>
    </div>
  );
}
