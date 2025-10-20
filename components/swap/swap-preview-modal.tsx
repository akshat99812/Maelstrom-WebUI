"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Zap } from "lucide-react";
import { Token } from "@/types/token";

interface SwapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  tokenIn: Token | undefined;
  tokenOut: Token | undefined;
  amountIn: string;
  amountOut: string;
  loading: boolean;
  slippageTolerance?: number;
}

export function SwapPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  loading,
  slippageTolerance,
}: SwapPreviewModalProps) {
  if (!tokenIn || !tokenOut) return null;
  const tokenInSymbol = tokenIn.symbol.toUpperCase();
  const tokenOutSymbol = tokenOut.symbol.toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border border-white/[0.05] bg-gradient-to-b from-bg-800/95 to-bg-900/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold font-plus-jakarta text-white/90">
            Swap Preview
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Swap Summary */}
          <Card className="bg-gradient-to-r from-accent-cyan/[0.03] to-primary-500/[0.03] border border-white/[0.05] shadow-lg backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-sm text-white/60 font-medium mb-1 font-plus-jakarta">
                    You pay
                  </p>
                  <p className="text-lg font-semibold text-white/90 font-plus-jakarta">
                    {amountIn} {tokenInSymbol}
                  </p>
                </div>
                <div className="relative px-4">
                  <div className="absolute inset-0 bg-accent-cyan/10 blur-[20px] rounded-full" />
                  <ArrowRight className="h-6 w-6 text-accent-cyan relative z-10" />
                </div>
                <div className="text-center">
                  <p className="text-sm text-white/60 font-medium mb-1 font-plus-jakarta">
                    You receive
                  </p>
                  <p className="text-lg font-semibold text-white/90 font-plus-jakarta">
                    {amountOut} {tokenOutSymbol}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Swap Details */}
          {slippageTolerance && (
            <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] backdrop-blur-sm">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-accent-cyan" />
                    <span className="text-white/70 font-medium font-plus-jakarta">
                      Slippage Tolerance
                    </span>
                  </div>
                  <span className="text-white/90 font-medium font-plus-jakarta">
                    {slippageTolerance}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-white/[0.05] pt-3">
                  <div className="flex items-center gap-2">
                    {/* <AlertTriangle className="h-4 w-4 text-orange-400" /> */}
                    <span className="text-white/70 font-medium font-plus-jakarta">
                      Minimum Received
                    </span>
                  </div>
                  <span className="text-white/90 font-medium font-plus-jakarta">
                    {(
                      (parseFloat(amountOut) * (100 - slippageTolerance)) /
                      100
                    ).toFixed(6)}{" "}
                    {tokenOutSymbol}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] 
                text-white/80 hover:text-white font-medium transition-all duration-200 font-plus-jakarta"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-accent-cyan to-primary-500 hover:from-accent-cyan/90 hover:to-primary-500/90 
                text-white font-semibold shadow-lg hover:shadow-accent-cyan/25 transition-all duration-300 
                disabled:from-gray-600/50 disabled:to-gray-700/50 disabled:cursor-not-allowed disabled:text-white/50
                border border-white/[0.05] backdrop-blur-sm font-plus-jakarta"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
                  <span>Swapping...</span>
                </>
              ) : (
                "Confirm Swap"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
