"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SwapPreviewModal } from "@/components/swap/swap-preview-modal";
import { useTrade } from "@/hooks/use-mock-api";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownUp } from "lucide-react";
import { TokenSelector } from "./token-selector";
import { Token } from "@/types/token";
import { BuyRequest, BuyResult } from "@/types/trades";
import { usePublicClient, useWriteContract } from "wagmi";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { ETH } from "@/types/token";

export function BuyForm() {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const contractClient = new ContractClient(
    CONTRACT_ADDRESS,
    writeContractAsync,
    publicClient
  );
  const [ethAmount, setEthAmount] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isEthInput, setIsEthInput] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [buyPrice, setBuyPrice] = useState<bigint>(BigInt(0));
  const { toast } = useToast();
  const [token, setToken] = useState<Token | undefined>(undefined);

  const handleTokenChange = async (selctedToken: Token) => {
    setToken(selctedToken);
    if (!selctedToken) return;
    setIsFetchingRates(true);
    try {
      const price = await contractClient.getBuyPrice(selctedToken);
      setBuyPrice(BigInt(price));
    } catch (error) {
      console.error("Error fetching price:", error);
      toast({
        title: "Error fetching price",
        description: (error as Error).message,
      });
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handleInputChange = async (value: string) => {
    if (!token) return;
    if (!isEthInput) {
      setTokenAmount(value);
      const ethValue = Number(BigInt(value) * BigInt(buyPrice));
      setEthAmount(ethValue.toFixed(6));
    } else {
      setEthAmount(value);
      if (buyPrice === BigInt(0)) {
        await handleTokenChange(token);
      }
      console.log(buyPrice);
      const tokenValue = Number(BigInt(value) / BigInt(buyPrice));
      setTokenAmount(tokenValue.toFixed(6));
    }
  };

  const handleSwapInputType = () => {
    setIsEthInput(!isEthInput);
  };

  const handlePreview = () => {
    if (!ethAmount || !tokenAmount || !token) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount to swap",
      });
      return;
    }
    setShowPreview(true);
  };

  const handleConfirmBuy = async () => {
    if (!token) return;
    setIsSwapping(true);
    const request: BuyRequest = {
      token,
      amountIn: ethAmount,
    };
    const result: BuyResult = await contractClient.buy(request);
    if (result.success) {
      toast({
        title: "Buy Successful!",
        description: `Tx Hash: ${result.txHash}`,
      });
    } else {
      toast({
        title: "Buy Failed",
        description:
          result.error || "An error occurred during the buy process.",
      });
    }
    setIsSwapping(false);
    if (result) {
      setEthAmount("");
      setTokenAmount("");
      setShowPreview(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/70 font-medium font-plus-jakarta">
            You're {isEthInput ? "paying" : "receiving"}
          </span>
          <button
            onClick={handleSwapInputType}
            className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/[0.05] bg-white/[0.02]"
          >
            <ArrowDownUp className="h-4 w-4 text-accent-cyan" />
          </button>
        </div>
        <div className="relative flex items-center bg-black/10 group-hover:bg-black/20 rounded-xl p-4 transition-all duration-300">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            disabled={!token && isSwapping && isFetchingRates}
            value={isEthInput ? ethAmount : tokenAmount}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full bg-transparent text-4xl font-medium outline-none placeholder:text-white/20 
              [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
              font-plus-jakarta text-white/90 transition-all duration-300"
          />
          {!isEthInput && (
            <div className="ml-2">
              <TokenSelector
                selectedToken={token}
                onTokenChange={handleTokenChange}
              />
            </div>
          )}
          {isEthInput && (
            <Button
              variant="ghost"
              className="h-10 px-3 hover:bg-accent/10 font-medium ml-2"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">E</span>
                </div>
                <span className="text-base">ETH</span>
              </div>
            </Button>
          )}
        </div>
      </div>

      <div className="relative bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300 rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md group">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/70 font-medium font-plus-jakarta">
            You'll {isEthInput ? "receive" : "pay"}
          </span>
        </div>
        <div className="relative flex items-center bg-black/10 group-hover:bg-black/20 rounded-xl p-4 transition-all duration-300">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={isEthInput ? tokenAmount : ethAmount}
            disabled={!token && isSwapping && isFetchingRates}
            readOnly
            className="w-full bg-transparent text-4xl font-medium outline-none placeholder:text-white/20 
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                font-plus-jakarta text-white/90 transition-all duration-300"
          />
          {isEthInput && (
            <div className="ml-2">
              <TokenSelector
                selectedToken={token}
                onTokenChange={handleTokenChange}
              />
            </div>
          )}
          {!isEthInput && (
            <Button
              variant="ghost"
              className="h-10 px-3 hover:bg-accent/10 font-medium ml-2 flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-accent">E</span>
                </div>
                <span className="text-base">ETH</span>
              </div>
            </Button>
          )}
        </div>
      </div>

      <Button
        onClick={handlePreview}
        disabled={!ethAmount || !tokenAmount || isSwapping || isFetchingRates}
        className="w-full h-14 mt-6 bg-gradient-to-r from-accent-cyan to-primary-500 hover:from-accent-cyan/90 hover:to-primary-500/90 
          text-white font-semibold rounded-xl shadow-lg hover:shadow-accent-cyan/25 transition-all duration-300 
          disabled:from-gray-600/50 disabled:to-gray-700/50 disabled:cursor-not-allowed disabled:text-white/50
          border border-white/[0.05] backdrop-blur-sm font-plus-jakarta text-base"
      >
        {(isSwapping || isFetchingRates) ? (
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" />
        ) : (
          `Preview Buy`
        )}
      </Button>

      <SwapPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        onConfirm={handleConfirmBuy}
        tokenIn={ETH}
        tokenOut={token}
        amountIn={ethAmount}
        amountOut={tokenAmount}
        loading={isSwapping}
      />
    </div>
  );
}
