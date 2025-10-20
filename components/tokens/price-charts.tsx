"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { RefreshCw, Clock, TrendingUp } from "lucide-react";

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

const BLOCKS_PER_FETCH = 999; // Load 1000 blocks at a time

export function PriceCharts({ token, pool }: PriceChartsProps) {
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextBlockToFetch, setNextBlockToFetch] = useState<number | null>(null);
  const [hasMoreData, setHasMoreData] = useState(true);
  const { chainId } = useAccount();
  const contractClient = useMemo(
    () => new ContractClient(writeContractAsync, publicClient, chainId),
    [chainId]
  );

  const generateChartData = useCallback(
    (buyTrades: BuyTrade[], sellTrades: SellTrade[]): ChartDataPoint[] => {
      // Combine and sort all trades by timestamp
      const allTrades = [
        ...buyTrades.map((trade) => ({
          ...trade,
          type: "buy" as const,
          buyPrice: parseFloat(formatEther(BigInt(trade.buyPrice))),
          sellPrice: 0,
        })),
        ...sellTrades.map((trade) => ({
          ...trade,
          type: "sell" as const,
          buyPrice: 0,
          sellPrice: parseFloat(formatEther(BigInt(trade.sellPrice))),
        })),
      ].sort((a, b) => a.timestamp - b.timestamp);

      if (allTrades.length === 0) {
        return [];
      }

      // Create chart data points from trades
      // Use the last known price for missing values
      let lastBuyPrice = parseFloat(formatEther(BigInt(pool.buyPrice)));
      let lastSellPrice = parseFloat(formatEther(BigInt(pool.sellPrice)));

      return allTrades.map((trade) => {
        if (trade.type === "buy" && trade.buyPrice > 0) {
          lastBuyPrice = trade.buyPrice;
        }
        if (trade.type === "sell" && trade.sellPrice > 0) {
          lastSellPrice = trade.sellPrice;
        }

        const tradeDate = new Date(trade.timestamp);
        return {
          time: tradeDate.toISOString(),
          buyPrice: trade.type === "buy" ? trade.buyPrice : lastBuyPrice,
          sellPrice: trade.type === "sell" ? trade.sellPrice : lastSellPrice,
          formattedTime: tradeDate.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          timestamp: trade.timestamp,
        };
      });
    },
    [pool.buyPrice, pool.sellPrice]
  );

  const fetchNextBatch = useCallback(async () => {
    if (loading || !hasMoreData) return;

    setLoading(true);
    setError(null);

    try {
      // Get the current block if we don't have it yet
      let toBlock: number;
      if (nextBlockToFetch === null) {
        const latestBlock = await publicClient?.getBlockNumber();
        if (!latestBlock) {
          throw new Error("Unable to get current block number");
        }
        toBlock = Number(latestBlock);
      } else {
        toBlock = nextBlockToFetch;
      }

      const fromBlock = Math.max(0, toBlock - BLOCKS_PER_FETCH);

      // Fetch trades for this block range
      const [buyTrades, sellTrades] = await Promise.all([
        contractClient.getBuyTradeEventLogs(fromBlock, toBlock, token),
        contractClient.getSellTradeEventLogs(fromBlock, toBlock, token),
      ]);

      console.log("Fetched trades from blocks", fromBlock, "to", toBlock);

      // Generate chart data from trades
      const newChartData = generateChartData(buyTrades, sellTrades);

      // Add new data to existing data
      setChartData((prevData) => {
        const combined = [...prevData, ...newChartData];
        // Sort by timestamp and remove duplicates
        const uniqueData = Array.from(
          new Map(combined.map((item) => [item.timestamp, item])).values()
        ).sort((a, b) => a.timestamp - b.timestamp);
        return uniqueData;
      });
      // Update next block to fetch
      if (fromBlock > 0) {
        setNextBlockToFetch(fromBlock - 1);
      } else {
        setHasMoreData(false);
      }
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
    nextBlockToFetch,
    hasMoreData,
    loading,
  ]);

  // Initial data fetch
  useEffect(() => {
    fetchNextBatch();
  }, []); // Only run on mount

  const currentBuyPrice = parseFloat(formatEther(BigInt(pool.buyPrice)));
  const currentSellPrice = parseFloat(formatEther(BigInt(pool.sellPrice)));

  // Display data - use chart data if available, otherwise show current pool prices
  const displayData = useMemo(() => {
    if (chartData.length > 0) {
      return chartData;
    }
    // Show current pool prices as a single data point when no historical data
    const now = new Date();
    return [
      {
        time: now.toISOString(),
        buyPrice: currentBuyPrice,
        sellPrice: currentSellPrice,
        formattedTime: now.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        timestamp: Date.now(),
      },
    ];
  }, [chartData, currentBuyPrice, currentSellPrice]);

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
                  {currentBuyPrice} ETH
                </p>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
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
                  <AreaChart data={displayData}>
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
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 25, 40, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        backdropFilter: "blur(16px)",
                      }}
                      labelStyle={{ color: "rgb(148, 163, 184)" }}
                      labelFormatter={(label) => label}
                      formatter={(value: number) => [
                        `${value.toFixed(8)} ETH`,
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
                  {currentSellPrice} ETH
                </p>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
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
                  <AreaChart data={displayData}>
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
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(17, 25, 40, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "8px",
                        backdropFilter: "blur(16px)",
                      }}
                      labelStyle={{ color: "rgb(148, 163, 184)" }}
                      labelFormatter={(label) => label}
                      formatter={(value: number) => [
                        `${value} ETH`,
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
                  )}{" "}
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
                  )}{" "}
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
