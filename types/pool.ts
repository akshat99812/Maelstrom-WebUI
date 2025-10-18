import { LiquidityPoolToken, Token } from "./token"
import { parseEther } from "viem"

export interface Pool {
  token: Token
  reserve: Reserve
  lpToken: LiquidityPoolToken
  buyPrice: string
  sellPrice: string
  avgPrice: string
  tokenRatio: string  
  volume24h: string
  totalLiquidty: string
  apr: number
  lastExchangeTs: number 
  lastUpdated: number
}

export interface RowPool{
  token: Token,
  buyPrice: string,
  sellPrice: string,
  totalLiquidity: string
  lpToken?: LiquidityPoolToken
}

const ETH: Token = {
  address: "0x0000000000000000000000000000000000000000",
  symbol: "ETH",
  name: "Ether",
  decimals: 18,
}

export const ETH_ROW_POOL: RowPool = {
  token: ETH,
  buyPrice: parseEther("1").toString(),
  sellPrice: parseEther("1").toString(),
  totalLiquidity: parseEther("0").toString(),
}

export interface InitPool{
  token: string
  ethAmount: string
  tokenAmount: string
  inititalBuyPrice: string
  initialSellPrice: string
}

export interface InitPoolResult{
  success: boolean
  txHash: string
  timestamp: number
  error?: string
}

export interface Reserve {
  tokenReserve: string,
  ethReserve: string
}

export interface PoolFeesEvent {
  timestamp: number
  fee: string
}