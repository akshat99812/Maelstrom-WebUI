"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Token } from "@/types/token";
import { Pool } from "@/types/pool";
import { BuyTrade, SellTrade } from "@/types/trades";
import { ContractClient } from "@/lib/contract-client";
import { CONTRACT_ADDRESS } from "@/types/contract";
import { usePublicClient, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { RefreshCw, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface PriceChartsProps {
  token: Token;
  pool: Pool;
}

interface ChartDataPoint {
  time: string;
  buyPrice: number;
  sellPrice: number;
  formattedTime: string;
  timestamp: number;
}

interface BatchConfig {
  batchSize: number;
  maxBatches: number;
  delayBetweenBatches: number;
}

export function PriceCharts({ token, pool }: PriceChartsProps) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [hasMoreData, setHasMoreData] = useState(true);

  const contractClient = new ContractClient(
    CONTRACT_ADDRESS,
    writeContractAsync,
    publicClient
  );

  const batchConfig: BatchConfig = {
    batchSize: 1000, // Blocks per batch
    maxBatches: 50, // Maximum number of batches total
    delayBetweenBatches: 100, // ms delay between batches
  };

  const generateChartData = useCallback(
    (buyTrades: BuyTrade[], sellTrades: SellTrade[]): ChartDataPoint[] => {
      // Combine and sort all trades by timestamp
      const allTrades = [
        ...buyTrades.map((trade) => ({
          ...trade,
          type: "buy" as const,
          price: parseFloat(formatEther(BigInt(trade.buyPrice))),
        })),
        ...sellTrades.map((trade) => ({
          ...trade,
          type: "sell" as const,
          price: parseFloat(formatEther(BigInt(trade.sellPrice))),
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);

      if (allTrades.length === 0) {
        // Fallback to current pool prices if no trades
        const currentBuyPrice = parseFloat(formatEther(BigInt(pool.buyPrice)));
        const currentSellPrice = parseFloat(
          formatEther(BigInt(pool.sellPrice))
        );
        const now = Date.now();

        return [
          {
            time: new Date(now).toISOString(),
            buyPrice: currentBuyPrice,
            sellPrice: currentSellPrice,
            formattedTime: new Date(now).toLocaleTimeString(),
            timestamp: now,
          },
        ];
      }

      // Group trades by time intervals and calculate average prices
      const intervalMs = 600000; // 10 minutes in milliseconds
      const groupedData = new Map<
        number,
        { buyPrices: number[]; sellPrices: number[]; timestamp: number }
      >();

      allTrades.forEach((trade) => {
        const intervalKey =
          Math.floor(trade.timestamp / intervalMs) * intervalMs;

        if (!groupedData.has(intervalKey)) {
          groupedData.set(intervalKey, {
            buyPrices: [],
            sellPrices: [],
            timestamp: intervalKey,
          });
        }

        const group = groupedData.get(intervalKey)!;
        if (trade.type === "buy") {
          group.buyPrices.push(trade.price);
        } else {
          group.sellPrices.push(trade.price);
        }
      });

      // Convert to chart data points
      return Array.from(groupedData.values())
        .map((group) => {
          const avgBuyPrice =
            group.buyPrices.length > 0
              ? group.buyPrices.reduce((sum, price) => sum + price, 0) /
                group.buyPrices.length
              : parseFloat(formatEther(BigInt(pool.buyPrice)));

          const avgSellPrice =
            group.sellPrices.length > 0
              ? group.sellPrices.reduce((sum, price) => sum + price, 0) /
                group.sellPrices.length
              : parseFloat(formatEther(BigInt(pool.sellPrice)));

          return {
            time: new Date(group.timestamp).toISOString(),
            buyPrice: avgBuyPrice,
            sellPrice: avgSellPrice,
            formattedTime: new Date(group.timestamp).toLocaleTimeString(),
            timestamp: group.timestamp,
          };
        })
        .sort((a, b) => a.timestamp - b.timestamp);
    },
    [pool.buyPrice, pool.sellPrice]
  );

  const fetchNextBatch = useCallback(async () => {
    if (!hasMoreData || loading) return;

    setLoading(true);
    setError(null);

    try {
      // Get the current block if we don't have it yet
      let blockToFetch = currentBlock;
      if (blockToFetch === 0) {
        const latestBlock = await publicClient?.getBlockNumber();
        if (!latestBlock) {
          throw new Error("Unable to get current block number");
        }
        blockToFetch = Number(latestBlock);
        setCurrentBlock(blockToFetch);
      }

      const fromBlock = Math.max(0, blockToFetch - batchConfig.batchSize);
      const toBlock = blockToFetch;

      // Check if we've reached the maximum number of batches
      const totalDataPoints = chartData.length;
      if (totalDataPoints >= batchConfig.maxBatches * 50) {
        // Rough estimate
        setHasMoreData(false);
        return;
      }

      const [buyTrades, sellTrades] = await Promise.all([
        contractClient.getBuyTradeEventLogs(fromBlock, toBlock, token),
        contractClient.getSellTradeEventLogs(fromBlock, toBlock, token),
      ]);

      // If no trades found in this batch, we might have reached the beginning
      if (buyTrades.length === 0 && sellTrades.length === 0) {
        setHasMoreData(false);
        return;
      }

      // Generate new chart data from this batch
      const newChartData = generateChartData(buyTrades, sellTrades);

      // Merge with existing data, avoiding duplicates
      setChartData((prevData) => {
        const existingTimestamps = new Set(
          prevData.map((point) => point.timestamp)
        );
        const uniqueNewData = newChartData.filter(
          (point) => !existingTimestamps.has(point.timestamp)
        );

        return [...prevData, ...uniqueNewData].sort(
          (a, b) => a.timestamp - b.timestamp
        );
      });

      // Update the current block for the next batch
      setCurrentBlock(fromBlock - 1);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch trade data";
      setError(errorMessage);
      console.error("Error fetching trade data:", err);
    } finally {
      setLoading(false);
    }
  }, [
    publicClient,
    contractClient,
    token,
    generateChartData,
    batchConfig,
    currentBlock,
    hasMoreData,
    loading,
    chartData.length,
  ]);

  const handleRefresh = useCallback(async () => {
    setChartData([]);
    setCurrentBlock(0);
    setHasMoreData(true);
    setError(null);
    await fetchNextBatch();
  }, [fetchNextBatch]);

  // Initial data fetch
  useEffect(() => {
    fetchNextBatch();
  }, []); // Only run on mount

  const currentBuyPrice = parseFloat(formatEther(BigInt(pool.buyPrice)));
  const currentSellPrice = parseFloat(formatEther(BigInt(pool.sellPrice)));

  return (
    <div className="space-y-6">
      {/* Header with Load More Button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Price Charts</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {chartData.length > 0
              ? `${chartData.length} data points loaded`
              : "No data yet"}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={fetchNextBatch}
            disabled={loading || !hasMoreData}
            className="relative overflow-hidden bg-gradient-to-r from-accent-blue/20 to-primary-500/20 hover:from-accent-blue/30 hover:to-primary-500/30 
              border border-accent-blue/20 hover:border-accent-blue/40 text-accent-blue hover:text-white
              backdrop-blur-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            size="sm"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/5 to-primary-500/5" />
            <div className="relative flex items-center">
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              {loading
                ? "Loading..."
                : hasMoreData
                ? "Load More Data"
                : "No More Data"}
            </div>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="border-white/10 hover:border-accent-blue/30 text-white/70 hover:text-accent-blue transition-all duration-300"
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg backdrop-blur-sm">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Buy Price Chart */}
        <Card className="relative overflow-hidden">
          {/* Glass morphism effects */}
          <div className="absolute inset-0 bg-background-800/40 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
          <div className="absolute inset-0 border border-white/[0.05] rounded-lg" />

          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm text-muted-foreground font-medium">
                  Buy Price
                </h4>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-500">
                  {currentBuyPrice.toFixed(6)} ETH
                </p>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {chartData.length > 0
                    ? `${chartData.length} data points`
                    : "No data"}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">
                    Loading price data...
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="buyGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(16, 185, 129)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="99%"
                          stopColor="rgb(16, 185, 129)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="formattedTime"
                      tick={{ fill: "rgb(148, 163, 184)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgb(148, 163, 184)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(6)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 25, 40, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        backdropFilter: "blur(16px)",
                      }}
                      labelStyle={{ color: "rgb(148, 163, 184)" }}
                      formatter={(value: number) => [
                        `${value.toFixed(6)} ETH`,
                        "Buy Price",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="buyPrice"
                      stroke="rgb(16, 185, 129)"
                      fill="url(#buyGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sell Price Chart */}
        <Card className="relative overflow-hidden">
          {/* Glass morphism effects */}
          <div className="absolute inset-0 bg-background-800/40 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
          <div className="absolute inset-0 border border-white/[0.05] rounded-lg" />

          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="text-sm text-muted-foreground font-medium">
                  Sell Price
                </h4>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-500">
                  {currentSellPrice.toFixed(6)} ETH
                </p>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {chartData.length > 0
                    ? `${chartData.length} data points`
                    : "No data"}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="h-[300px] w-full flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-red-500" />
                  <p className="text-sm text-muted-foreground">
                    Loading price data...
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="sellGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgb(239, 68, 68)"
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="99%"
                          stopColor="rgb(239, 68, 68)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="formattedTime"
                      tick={{ fill: "rgb(148, 163, 184)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fill: "rgb(148, 163, 184)", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value.toFixed(6)}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 25, 40, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        backdropFilter: "blur(16px)",
                      }}
                      labelStyle={{ color: "rgb(148, 163, 184)" }}
                      formatter={(value: number) => [
                        `${value.toFixed(6)} ETH`,
                        "Sell Price",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sellPrice"
                      stroke="rgb(239, 68, 68)"
                      fill="url(#sellGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Price Summary Stats */}
      {chartData.length > 0 && !loading && (
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-background-800/40 backdrop-blur-xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.08] to-primary-500/[0.05]" />
          <div className="absolute inset-0 border border-white/[0.05] rounded-lg" />

          <CardContent className="relative p-6">
            <h4 className="text-lg font-semibold mb-4 text-white">
              Price Statistics
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-xs text-muted-foreground mb-1">
                  Current Spread
                </div>
                <div className="text-sm font-medium text-white">
                  {(
                    ((currentBuyPrice - currentSellPrice) / currentSellPrice) *
                    100
                  ).toFixed(2)}
                  %
                </div>
              </div>

              <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-xs text-muted-foreground mb-1">
                  Avg Buy Price
                </div>
                <div className="text-sm font-medium text-emerald-400">
                  {(
                    chartData.reduce((sum, point) => sum + point.buyPrice, 0) /
                    chartData.length
                  ).toFixed(6)}{" "}
                  ETH
                </div>
              </div>

              <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-xs text-muted-foreground mb-1">
                  Avg Sell Price
                </div>
                <div className="text-sm font-medium text-red-400">
                  {(
                    chartData.reduce((sum, point) => sum + point.sellPrice, 0) /
                    chartData.length
                  ).toFixed(6)}{" "}
                  ETH
                </div>
              </div>

              <div className="text-center p-3 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-xs text-muted-foreground mb-1">
                  Data Points
                </div>
                <div className="text-sm font-medium text-accent-blue">
                  {chartData.length}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.05]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data Points:</span>
                <span className="text-white">{chartData.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="text-white flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
