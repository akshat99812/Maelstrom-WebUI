"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ContractClient } from "@/lib/contract-client";
import { InitPool } from "@/types/pool";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { parseEther, isAddress, Address } from "viem";
import { Loader2, Plus } from "lucide-react";

export default function CreatePoolPage() {
  const {chainId} = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const contractClient = useMemo(
    () => new ContractClient(
      writeContractAsync,
      publicClient,
      chainId
    ),
    [chainId]
  );
  const { chain, isConnected } = useAccount();
  const baseUrl = chain?.blockExplorers?.default.url;

  const [formData, setFormData] = useState<InitPool>({
    token: "",
    ethAmount: "",
    tokenAmount: "",
    inititalBuyPrice: "",
    initialSellPrice: "",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{
    symbol: string;
    name: string;
    decimals: number;
  } | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  const handleInputChange = (field: keyof InitPool, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateTokenAddress = async (tokenAddress: string) => {
    if (!isAddress(tokenAddress)) {
      setTokenInfo(null);
      return;
    }

    setIsValidatingToken(true);
    try {
      const token = await contractClient.getToken(tokenAddress as Address);
      setTokenInfo({
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
      });
    } catch (error) {
      console.error("Error validating token:", error);
      setTokenInfo(null);
      toast.error("Invalid token address or token not found.");
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleTokenAddressChange = (value: string) => {
    handleInputChange("token", value);
    if (value.trim()) {
      validateTokenAddress(value.trim());
    } else {
      setTokenInfo(null);
    }
  };

  const validateForm = (): boolean => {
    if (!isConnected) {
      toast.error("Please connect your wallet first.");
      return false;
    }

    if (!isAddress(formData.token)) {
      toast.error("Please enter a valid token address.");
      return false;
    }

    if (!formData.ethAmount || parseFloat(formData.ethAmount) <= 0) {
      toast.error("Please enter a valid ETH amount.");
      return false;
    }

    if (!formData.tokenAmount || parseFloat(formData.tokenAmount) <= 0) {
      toast.error("Please enter a valid token amount.");
      return false;
    }

    if (
      !formData.inititalBuyPrice ||
      parseFloat(formData.inititalBuyPrice) <= 0
    ) {
      toast.error("Please enter a valid initial buy price.");
      return false;
    }

    if (
      !formData.initialSellPrice ||
      parseFloat(formData.initialSellPrice) <= 0
    ) {
      toast.error("Please enter a valid initial sell price.");
      return false;
    }

    if (
      parseFloat(formData.inititalBuyPrice) <=
      parseFloat(formData.initialSellPrice)
    ) {
      toast.error("Buy price must be higher than sell price.");
      return false;
    }

    return true;
  };

  const handleCreatePool = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    try {
      // Convert amounts to wei (assuming 18 decimals for ETH and proper decimals for token)
      const ethAmountWei = parseEther(formData.ethAmount).toString();
      const tokenAmountWei = parseEther(formData.tokenAmount).toString();
      const buyPriceWei = parseEther(formData.inititalBuyPrice).toString();
      const sellPriceWei = parseEther(formData.initialSellPrice).toString();

      const initPoolData: InitPool = {
        ...formData,
        ethAmount: ethAmountWei,
        tokenAmount: tokenAmountWei,
        inititalBuyPrice: buyPriceWei,
        initialSellPrice: sellPriceWei,
      };
      
      const result = await contractClient.initializePool(initPoolData);

      if (result.success) {
        toast.success(
          <div>
            <div>Pool created successfully! </div>
            <div>
              <a
                href={`${baseUrl}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-400"
              >
                View on block explorer
              </a>
            </div>
          </div>
        );
        // Reset form
        setFormData({
          token: "",
          ethAmount: "",
          tokenAmount: "",
          inititalBuyPrice: "",
          initialSellPrice: "",
        });
        setTokenInfo(null);
      }
    } catch (error) {
      console.error("Error creating pool:", error);
      toast.error(`Failed to create pool: ${(error as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const estimatedSpread =
    formData.inititalBuyPrice && formData.initialSellPrice
      ? (
          ((parseFloat(formData.inititalBuyPrice) -
            parseFloat(formData.initialSellPrice)) /
            parseFloat(formData.inititalBuyPrice)) *
          100
        ).toFixed(2)
      : "0";

  return (
    <div className="min-h-screen relative bg-gradient-pattern overflow-hidden">
      <main className="container relative mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Page Header with glass effect */}
          <div className="relative rounded-xl p-8 overflow-hidden backdrop-blur-xl border border-white/[0.05]">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
            <div className="absolute inset-0 border border-white/[0.05] rounded-xl" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-clash-display text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                  Create New Pool
                </h1>
              </div>
              <p className="text-muted-foreground/70 font-plus-jakarta">
                Initialize a new liquidity pool with your token. Set initial
                prices and provide liquidity to start trading.
              </p>
            </div>
          </div>

          {/* Create Pool Form */}
          <div className="relative rounded-xl overflow-hidden backdrop-blur-xl border border-white/[0.05]">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
            <div className="absolute inset-0 border border-white/[0.05] rounded-xl" />
            <Card className="relative border-0 bg-transparent shadow-none">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-white">
                  Pool Configuration
                </CardTitle>
                <CardDescription className="text-muted-foreground/70">
                  Configure your new liquidity pool parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Token Address */}
                <div className="space-y-2">
                  <Label htmlFor="token" className="text-white">
                    Token Contract Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="token"
                      placeholder="0x..."
                      value={formData.token}
                      onChange={(e) => handleTokenAddressChange(e.target.value)}
                      className="pr-10"
                    />
                    {isValidatingToken && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {tokenInfo && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-white">
                        <span className="font-medium">{tokenInfo.symbol}</span>{" "}
                        - {tokenInfo.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Decimals: {tokenInfo.decimals}
                      </p>
                    </div>
                  )}
                </div>

                {/* Liquidity Amounts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="ethAmount"
                      className="text-white flex items-center gap-2"
                    >
                      ETH Amount
                    </Label>
                    <Input
                      id="ethAmount"
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={formData.ethAmount}
                      onChange={(e) =>
                        handleInputChange("ethAmount", e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="tokenAmount"
                      className="text-white flex items-center gap-2"
                    >
                      Token Amount
                    </Label>
                    <Input
                      id="tokenAmount"
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={formData.tokenAmount}
                      onChange={(e) =>
                        handleInputChange("tokenAmount", e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Price Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">
                    Initial Price Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="buyPrice" className="text-white">
                        Initial Buy Price (ETH per Token)
                      </Label>
                      <Input
                        id="buyPrice"
                        type="number"
                        step="0.000001"
                        placeholder="0.0"
                        value={formData.inititalBuyPrice}
                        onChange={(e) =>
                          handleInputChange("inititalBuyPrice", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sellPrice" className="text-white">
                        Initial Sell Price (ETH per Token)
                      </Label>
                      <Input
                        id="sellPrice"
                        type="number"
                        step="0.000001"
                        placeholder="0.0"
                        value={formData.initialSellPrice}
                        onChange={(e) =>
                          handleInputChange("initialSellPrice", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* Price Summary */}
                  {formData.inititalBuyPrice && formData.initialSellPrice && (
                    <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
                      <h4 className="text-sm font-medium text-white mb-2">
                        Price Summary
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Buy Price:</p>
                          <p className="text-green-400 font-medium">
                            {formData.inititalBuyPrice} ETH
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Sell Price:</p>
                          <p className="text-red-400 font-medium">
                            {formData.initialSellPrice} ETH
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Spread:</p>
                          <p className="text-white font-medium">
                            {estimatedSpread}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreatePool}
                  disabled={isCreating || !isConnected || !tokenInfo}
                  className="w-full h-12 text-lg font-medium"
                  size="lg"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Creating Pool...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5 mr-2" />
                      Create Pool
                    </>
                  )}
                </Button>

                {!isConnected && (
                  <p className="text-center text-muted-foreground text-sm">
                    Please connect your wallet to create a pool
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative rounded-xl overflow-hidden backdrop-blur-xl border border-white/[0.05] p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
              <div className="absolute inset-0 border border-white/[0.05] rounded-xl" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-3">
                  📋 Requirements
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Valid ERC-20 token contract address</li>
                  <li>• Initial ETH and token liquidity</li>
                  <li>• Buy price must be higher than sell price</li>
                  <li>• Sufficient token allowance for the contract</li>
                </ul>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden backdrop-blur-xl border border-white/[0.05] p-6">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
              <div className="absolute inset-0 border border-white/[0.05] rounded-xl" />
              <div className="relative">
                <h3 className="text-lg font-semibold text-white mb-3">
                  💡 Tips
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Set realistic initial prices based on market value</li>
                  <li>• Higher spread provides more stability</li>
                  <li>• Consider liquidity depth for trading volume</li>
                  <li>• Review all parameters before creating</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Dynamic glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--accent-cyan)/10%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--primary-500)/5%,transparent_50%)]" />
      </div>
    </div>
  );
}
