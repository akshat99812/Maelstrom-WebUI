"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { Token } from "@/types/token";

interface LiquidityPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  token: Token
  isWithdraw: boolean;
  tokenAmount: string;
  ethAmount: string;
  lpAmount: string;
  loading?: boolean;
}

export function LiquidityPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  token,
  isWithdraw,
  tokenAmount,
  ethAmount,
  lpAmount,
  loading = false,
}: LiquidityPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="border border-white/[0.05] bg-gradient-to-b from-bg-800/95 to-bg-900/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold font-plus-jakarta text-white/90">
            {isWithdraw ? "Remove Liquidity Preview" : "Add Liquidity Preview"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Liquidity Summary */}
          <Card className="bg-gradient-to-r from-accent-cyan/[0.03] to-primary-500/[0.03] border border-white/[0.05] backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-center flex-1 min-w-0">
                  <p className="text-sm text-white/60 font-medium mb-1 font-plus-jakarta">
                    {isWithdraw ? "You remove" : "You provide"}
                  </p>
                  {isWithdraw ? (
                    <p className="text-base font-semibold text-white/90 font-plus-jakarta">
                      {lpAmount} LP
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white/90 font-plus-jakarta break-words">
                        {tokenAmount} {token.symbol.toUpperCase()}
                      </p>
                      <p className="text-base font-semibold text-white/90 font-plus-jakarta">
                        {ethAmount} ETH
                      </p>
                    </div>
                  )}
                </div>
                <div className="relative px-3 flex-shrink-0">
                  <div className="absolute inset-0 bg-accent-cyan/10 blur-[20px] rounded-full" />
                  <ArrowRight className="h-5 w-5 text-accent-cyan relative z-10" />
                </div>
                <div className="text-center flex-1 min-w-0">
                  <p className="text-sm text-white/60 font-medium mb-1 font-plus-jakarta">
                    {isWithdraw ? "You receive" : "You get"}
                  </p>
                  {isWithdraw ? (
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-white/90 font-plus-jakarta break-words">
                        {tokenAmount} {token.symbol.toUpperCase()}
                      </p>
                      <p className="text-base font-semibold text-white/90 font-plus-jakarta">
                        {ethAmount} ETH
                      </p>
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-white/90 font-plus-jakarta">
                      {lpAmount} LP
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details */}
          {/* <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05] backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-cyan" />
                <span className="text-white/70 font-medium font-plus-jakarta">Network Fee</span>
              </div>
              <span className="text-white/90 font-medium font-plus-jakarta">~$12.50</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-accent-cyan" />
                <span className="text-white/70 font-medium font-plus-jakarta">Share of Pool</span>
              </div>
              <span className="text-white/90 font-medium font-plus-jakarta">0.05%</span>
            </div>
          </div> */}

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
                  <span>{isWithdraw ? "Removing..." : "Adding..."}</span>
                </>
              ) : (
                `Confirm ${isWithdraw ? "Removal" : "Addition"}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
