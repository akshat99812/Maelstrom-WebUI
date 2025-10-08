"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LiquidityPreviewModal } from "./liquidity-preview-modal";
import { useToast } from "@/hooks/use-toast";
import { LiquidityPoolToken, Token } from "@/types/token";
import { usePublicClient, useWriteContract } from "wagmi";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { Reserve } from "@/types/pool";
import { parseEther } from "viem";

interface LiquidityActionsProps {
  token: Token;
  lpToken: LiquidityPoolToken;
  reserve: Reserve;
  poolRatio: number; //token/eth
}

export function LiquidityActions({
  token,
  reserve,
  lpToken,
  poolRatio,
}: LiquidityActionsProps) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const contractClient = new ContractClient(
    CONTRACT_ADDRESS,
    writeContractAsync,
    publicClient
  );
  const [tokenAmount, setTokenAmount] = useState("");
  const [ethAmount, setEthAmount] = useState("");
  const [lpAmount, setLpAmount] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState<"add" | "remove">("add");
  const { toast } = useToast();

  const handleTokenAmountChange = useCallback(
    (value: string) => {
      setTokenAmount(value);
      const ethAmount = Number(value) / Number(poolRatio);
      const proportion = Number(value) / Number(reserve.tokenReserve);
      const lpTokenAmount = proportion * Number(lpToken.totalSupply);
      setEthAmount(ethAmount.toFixed(3));
      setLpAmount(lpTokenAmount.toFixed(3));
    },
    [reserve, poolRatio, lpToken.totalSupply]
  );

  const handleEthAmountChange = useCallback(
    (value: string) => {
      setEthAmount(value);
      const tokenAmount = Number(value) * Number(poolRatio);
      const proportion = Number(value) / Number(reserve.ethReserve);
      const lpTokenAmount = proportion * Number(lpToken.totalSupply);
      setTokenAmount(tokenAmount.toFixed(3));
      setLpAmount(lpTokenAmount.toFixed(3));
    },
    [reserve, poolRatio, lpToken.totalSupply]
  );

  const handleLpAmountChange = useCallback(
    (value: string) => {
      setLpAmount(value);
      const proportion = Number(value) / Number(lpToken.totalSupply);
      const ethAmount = proportion * Number(reserve.ethReserve);
      const tokenAmount = proportion * Number(reserve.tokenReserve);
      setEthAmount(ethAmount.toFixed(3));
      setTokenAmount(tokenAmount.toFixed(3));
    },
    [reserve, lpToken.totalSupply]
  );

  const handleLiquidityAdditon = async () => {
    setLoading(true);
    try {
      const depositRequest = {
        token: token,
        tokenAmount: parseEther(tokenAmount).toString(),
        ethAmount: parseEther(ethAmount).toString(),
      };
      const depositResult = await contractClient.deposit(depositRequest);
      if (!depositResult.success) {
        throw new Error(depositResult.error || "Deposit failed");
      }
      toast({
        title: "Success",
        description: `TxHash: ${depositResult.txHash}`,
      });
      // Reset form after successful transaction
      setTokenAmount("");
      setEthAmount("");
      setLpAmount("");
      setShowPreview(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process liquidity operation",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLiquidityRemoval = async () => {
    setLoading(true);
    try {
      const withdrawRequest = {
        token: token,
        lpToken: lpToken,
        lpTokenAmount: parseEther(lpAmount).toString(),
      };
      const withdrawResult = await contractClient.withdraw(withdrawRequest);
      if (!withdrawResult.success) {
        throw new Error(withdrawResult.error || "Deposit failed");
      }
      toast({
        title: "Success",
        description: `TxHash: ${withdrawResult.txHash}`,
      });
      // Reset form after successful transaction
      setTokenAmount("");
      setEthAmount("");
      setLpAmount("");
      setShowPreview(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process liquidity operation",
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLiquidity = async () => {
    if (currentTab === "add") {
      await handleLiquidityAdditon();
    } else {
      await handleLiquidityRemoval();
    }
  };

  return (
    <Card className="relative overflow-hidden border-0 flex-col items-center justify-center">
      <div className="absolute inset-0 bg-background-800/40 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
      <div className="absolute inset-0 border border-white/[0.05] rounded-lg bg-gradient-to-b from-white/[0.05] to-transparent" />
      <CardContent className="relative w-full">
        <Tabs defaultValue="add" onValueChange={(value) => setCurrentTab(value as "add" | "remove")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4 bg-black/20 p-1 rounded-2xl backdrop-blur-md border border-white/[0.05]">
            <TabsTrigger
              value="add"
              className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-accent-cyan/20 data-[state=active]:to-primary-600/20 data-[state=active]:border-accent-cyan/20 data-[state=active]:shadow-lg data-[state=active]:text-accent-cyan rounded-xl transition-all duration-200"
            >
              Add Liquidity
            </TabsTrigger>
            <TabsTrigger
              value="remove"
              className="data-[state=active]:bg-gradient-to-b data-[state=active]:from-accent-cyan/20 data-[state=active]:to-primary-600/20 data-[state=active]:border-accent-cyan/20 data-[state=active]:shadow-lg data-[state=active]:text-accent-cyan rounded-xl transition-all duration-200"
            >
              Remove Liquidity
            </TabsTrigger>
          </TabsList>

          {/* ADD LIQUIDITY TAB */}
          <TabsContent value="add" className="space-y-6">
            {/* "You are depositing" Section */}
            <div className="space-y-4 bg-white/[0.01] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
              <h3 className="text-md font-semibold text-white/90 font-plus-jakarta">
                You are depositing
              </h3>

              {/* Token Pair Inputs - Horizontal Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Token Input Panel */}
                <div className="relative bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-accent-cyan">
                          {token.symbol.toUpperCase()[0]}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {token.symbol.toUpperCase()}
                      </span>
                    </div>
                    {/* <div className="text-right">
                      <div className="text-xs text-foreground/60">
                        balance: {tokenBalance}
                      </div>
                    </div> */}
                  </div>
                  <input
                    type="text"
                    value={tokenAmount}
                    onChange={(e) => handleTokenAmountChange(e.target.value)}
                    className="w-full h-16 text-2xl font-medium bg-black/10 rounded-xl px-4 
                  border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                  placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                    placeholder="0.0"
                  />
                </div>

                {/* ETH Input Panel */}
                <div className="relative bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-500">
                          Ξ
                        </span>
                      </div>
                      <span className="text-sm font-medium">ETH</span>
                    </div>
                    {/* <div className="text-right">
                      <div className="text-xs text-foreground/60">
                        balance: {ethBalance}
                      </div>
                    </div> */}
                  </div>
                  <input
                    type="text"
                    value={ethAmount}
                    onChange={(e) => handleEthAmountChange(e.target.value)}
                    className="w-full h-16 text-2xl font-medium bg-black/10 rounded-xl px-4 
                  border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                  placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                    placeholder="0.0"
                  />
                </div>
              </div>

              {/* Exchange Rate Display */}
              {(parseFloat(tokenAmount) > 0 ||
                parseFloat(ethAmount) > 0 ||
                parseFloat(lpAmount) > 0) && (
                <div className="text-center space-y-1 pt-2">
                  <div className="text-sm text-foreground/60">
                    1 {token.symbol} = {poolRatio.toFixed(6)} ETH
                    <span className="mx-2">•</span>1 ETH ={" "}
                    {(1 / poolRatio).toLocaleString()} {token.symbol}
                  </div>
                </div>
              )}
            </div>

            {/* "You'll mint" Section */}
            <div className="space-y-4 bg-white/[0.01] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
              <h3 className="text-md font-semibold text-white/90 font-plus-jakarta">
                You'll mint
              </h3>

              <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white/80">
                        LP
                      </span>
                    </div>
                    <span className="text-sm font-medium">LP Token</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/60">
                      Total Supply: {lpToken.totalSupply}
                    </div>
                  </div>
                </div>

                <input
                  type="text"
                  value={lpAmount}
                  onChange={(e) => handleLpAmountChange(e.target.value)}
                  className="w-full h-16 text-2xl font-medium bg-black/10 rounded-xl px-4 
                    border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                    placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                  placeholder="0.0"
                />

                {lpAmount && parseFloat(lpAmount) > 0 && (
                  <div className="mt-3 text-xs text-foreground/60 text-center">
                    {(
                      (parseFloat(lpAmount) / parseFloat(lpToken.totalSupply)) *
                      100
                    ).toFixed(3)}
                    % of pool
                  </div>
                )}
              </div>
            </div>

            {/* Add Liquidity Button */}
            <Button
              className="w-full h-14 bg-gradient-to-r from-accent-cyan to-primary-500 hover:from-accent-cyan/90 hover:to-primary-500/90 
                text-white font-semibold rounded-xl shadow-lg hover:shadow-accent-cyan/25 transition-all duration-300 
                disabled:from-gray-600/50 disabled:to-gray-700/50 disabled:cursor-not-allowed disabled:text-white/50
                border border-white/[0.05] backdrop-blur-sm font-plus-jakarta text-base"
              variant="default"
              onClick={() => {
                setCurrentTab("add");
                setShowPreview(true);
              }}
              disabled={
                !tokenAmount ||
                !ethAmount ||
                parseFloat(tokenAmount) === 0 ||
                parseFloat(ethAmount) === 0 ||
                loading
              }
            >
              Preview Deposit
            </Button>
          </TabsContent>

          {/* REMOVE LIQUIDITY TAB */}
          <TabsContent value="remove" className="space-y-6">
            {/* "You are redeeming" Section */}
            <div className="space-y-4 bg-white/[0.01] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
              <h3 className="text-md font-semibold text-white/90 font-plus-jakarta">
                You are redeeming
              </h3>

              <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white/80">
                        LP
                      </span>
                    </div>
                    <span className="text-sm font-medium">LP Token</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-foreground/60">
                      LP Balance: {lpToken.balance}
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={lpAmount}
                  onChange={(e) => {
                    handleLpAmountChange(e.target.value);
                  }}
                  className="w-full h-16 text-2xl font-medium bg-black/10 rounded-xl px-4 
                    border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                    placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                  placeholder="0.0"
                />

                <div className="mt-3 text-xs text-foreground/60 text-center">
                  {(
                    (parseFloat(lpAmount) / parseFloat(lpToken.totalSupply)) *
                    100
                  ).toFixed(3)}
                  % of pool
                </div>
              </div>
            </div>

            {/* "You'll receive" Section */}
            <div className="space-y-4 bg-white/[0.01] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
              <h3 className="text-md font-semibold text-white/90 font-plus-jakarta">
                You'll receive
              </h3>

              {/* Token Pair Outputs - Horizontal Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Token Output Panel */}
                <div className="relative bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-accent-cyan">
                          {token.symbol.toUpperCase()[0]}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {token.symbol.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={tokenAmount}
                    onChange={(e) => handleTokenAmountChange(e.target.value)}
                    className="w-full h-16 text-2xl font-medium bg-black/10 rounded-xl px-4 
                        border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                        placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                    placeholder="0.0"
                  />
                </div>

                {/* ETH Output Panel */}
                <div className="relative bg-white/[0.02] rounded-2xl p-5 border border-white/[0.05] shadow-lg backdrop-blur-md">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-500">
                          Ξ
                        </span>
                      </div>
                      <span className="text-sm font-medium">ETH</span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={ethAmount}
                    onChange={(e) => handleEthAmountChange(e.target.value)}
                    className="w-full h-16 text-2xl font-medium bg-black/10 rounded-xl px-4 
                        border border-white/[0.05] focus:border-accent-cyan/30 focus:ring-2 focus:ring-accent-cyan/20
                        placeholder:text-white/20 transition-all duration-300 font-plus-jakarta"
                    placeholder="0.0"
                  />
                </div>
              </div>

              {/* Exchange Rate Display */}
              {parseFloat(lpAmount) > 0 && (
                <div className="text-center space-y-1 pt-2">
                  <div className="text-sm text-foreground/60">
                    1 {token.symbol} = {(poolRatio).toFixed(6)} ETH
                    <span className="mx-2">•</span>1 ETH ={" "}
                    {(1/poolRatio).toLocaleString()} {token.symbol}
                  </div>
                </div>
              )}
            </div>

            {/* Remove Liquidity Button */}
            <Button
              className="w-full h-14 bg-gradient-to-r from-accent-cyan to-primary-500 hover:from-accent-cyan/90 hover:to-primary-500/90 
                text-white font-semibold rounded-xl shadow-lg hover:shadow-accent-cyan/25 transition-all duration-300 
                disabled:from-gray-600/50 disabled:to-gray-700/50 disabled:cursor-not-allowed disabled:text-white/50
                border border-white/[0.05] backdrop-blur-sm font-plus-jakarta text-base"
              variant="default"
              onClick={() => {
                setCurrentTab("remove");
                setShowPreview(true);
              }}
              disabled={!lpAmount || parseFloat(lpAmount) === 0 || loading}
            >
              Preview Withdraw
            </Button>
          </TabsContent>
        </Tabs>

        <LiquidityPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          onConfirm={handleConfirmLiquidity}
          token={token}
          isWithdraw={currentTab === "remove"}
          tokenAmount={tokenAmount}
          ethAmount={ethAmount}
          lpAmount={lpAmount}
          loading={loading}
        />
      </CardContent>
    </Card>
  );
}
