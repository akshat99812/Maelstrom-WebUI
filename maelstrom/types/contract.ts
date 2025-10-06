import { Address, ReadContractReturnType } from "viem";
import { Config, UsePublicClientReturnType, UseReadContractReturnType } from "wagmi";
import { WriteContractMutateAsync } from "wagmi/query";
import { BuyRequest, BuyResult, BuyTrade, Deposit, DepositRequest, DepositResult, SellRequest, SellResult, SellTrade, SwapRequest, SwapResult, SwapTrade, Withdraw, WithdrawRequest, WithdrawResult } from "./trades";
import { LiquidityPoolToken, Token } from "./token";
import { InitPool, InitPoolResult, Pool, Reserve, RowPool } from "./pool";

export const CONTRACT_ADDRESS = "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC" as Address;

export interface IContractClient {
    contractAddress: Address;
    writeContract: WriteContractMutateAsync<Config, unknown>;
    publicClient: UsePublicClientReturnType;

    initializePool(initPool: InitPool): Promise<InitPoolResult>;
    deposit(depositReq: DepositRequest): Promise<DepositResult>
    withdraw(withdrawReq: WithdrawRequest): Promise<WithdrawResult>
    swap(swapReq: SwapRequest): Promise<SwapResult>
    buy(buyReq: BuyRequest): Promise<BuyResult>
    sell(sellReq: SellRequest): Promise<SellResult>

    getPool(token: Token, user: Address): Promise<Pool>
    getToken(token: Address): Promise<Token>
    getLPToken(token: Token, user: Address): Promise<LiquidityPoolToken>
    getReserves(token: Token): Promise<Reserve>
    getTokenRatio(token: Token): Promise<string>
    getBuyPrice(token: Token): Promise<string>
    getSellPrice(token: Token): Promise<string>
    getUserBalance(token: Token, user: Address): Promise<Reserve>

    getBuyTradeEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<BuyTrade[]>
    getSellTradeEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<SellTrade[]>
    getSwapTradeEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<SwapTrade[]>
    getDepositEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<Deposit[]>
    getWithdrawEventLogs(fromBlock: number, toBlock: number, token: Token, user?: Address): Promise<Withdraw[]>

    getPools(startIndex: number, offset: number): Promise<RowPool[]>
    getUserPools(user: Address, startIndex: number, offset: number): Promise<RowPool[]>
    getPoolCount(): Promise<number>
    getUserPoolCount(user: Address): Promise<number>
}

export const ABI = [
    {
        "type": "function",
        "name": "buy",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "deposit",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "ethBalance",
        "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getPoolList",
        "inputs": [
            { "name": "start", "type": "uint256", "internalType": "uint256" },
            { "name": "end", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [
            { "name": "", "type": "address[]", "internalType": "address[]" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getTotalPools",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getUserPools",
        "inputs": [
            { "name": "user", "type": "address", "internalType": "address" },
            { "name": "start", "type": "uint256", "internalType": "uint256" },
            { "name": "end", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [
            { "name": "", "type": "address[]", "internalType": "address[]" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getUserTotalPools",
        "inputs": [
            { "name": "user", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "initializePool",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" },
            { "name": "amount", "type": "uint256", "internalType": "uint256" },
            {
                "name": "initialPriceBuy",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "initialPriceSell",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "payable"
    },
    {
        "type": "function",
        "name": "poolList",
        "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "poolToken",
        "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "outputs": [
            {
                "name": "",
                "type": "address",
                "internalType": "contract LiquidityPoolToken"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "poolUserBalances",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" },
            { "name": "user", "type": "address", "internalType": "address" }
        ],
        "outputs": [
            { "name": "", "type": "uint256", "internalType": "uint256" },
            { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "pools",
        "inputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "outputs": [
            {
                "name": "lastBuyPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "lastSellPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "lastExchangeTimestamp",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "initialSellPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "initialBuyPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "finalBuyPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "finalSellPrice",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "lastBuyTimestamp",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "lastSellTimestamp",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "decayedBuyTime",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "decayedSellTime",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "decayedBuyVolume",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "decayedSellVolume",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "priceBuy",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "priceSell",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "reserves",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" }
        ],
        "outputs": [
            { "name": "", "type": "uint256", "internalType": "uint256" },
            { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "sell",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" },
            { "name": "amount", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "swap",
        "inputs": [
            { "name": "tokenSell", "type": "address", "internalType": "address" },
            { "name": "tokenBuy", "type": "address", "internalType": "address" },
            {
                "name": "amountToSell",
                "type": "uint256",
                "internalType": "uint256"
            },
            {
                "name": "minimumAmountToBuy",
                "type": "uint256",
                "internalType": "uint256"
            }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "tokenPerETHRatio",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "userPoolIndex",
        "inputs": [
            { "name": "", "type": "address", "internalType": "address" },
            { "name": "", "type": "address", "internalType": "address" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "userPools",
        "inputs": [
            { "name": "", "type": "address", "internalType": "address" },
            { "name": "", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "withdraw",
        "inputs": [
            { "name": "token", "type": "address", "internalType": "address" },
            { "name": "amount", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "event",
        "name": "BuyTrade",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "trader",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "ethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "tokenAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "buyPrice",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Deposit",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "user",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "ethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "tokenAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "lpTokensMinted",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PoolInitialized",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "ethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "initialPriceBuy",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "initialPriceSell",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "SellTrade",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "trader",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "ethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "sellPrice",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "SwapTrade",
        "inputs": [
            {
                "name": "tokenSold",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenBought",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "trader",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "tokenAmountSold",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "tokenAmountBought",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "sellPrice",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "buyPrice",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "Withdraw",
        "inputs": [
            {
                "name": "token",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "user",
                "type": "address",
                "indexed": true,
                "internalType": "address"
            },
            {
                "name": "ethAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "tokenAmount",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            },
            {
                "name": "lpTokensBurned",
                "type": "uint256",
                "indexed": false,
                "internalType": "uint256"
            }
        ],
        "anonymous": false
    },
    {
        "type": "error",
        "name": "PRBMath_MulDiv18_Overflow",
        "inputs": [
            { "name": "x", "type": "uint256", "internalType": "uint256" },
            { "name": "y", "type": "uint256", "internalType": "uint256" }
        ]
    },
    {
        "type": "error",
        "name": "PRBMath_SD59x18_Exp2_InputTooBig",
        "inputs": [{ "name": "x", "type": "int256", "internalType": "SD59x18" }]
    },
    {
        "type": "error",
        "name": "PRBMath_SD59x18_Exp_InputTooBig",
        "inputs": [{ "name": "x", "type": "int256", "internalType": "SD59x18" }]
    },
    {
        "type": "error",
        "name": "PRBMath_SD59x18_Mul_InputTooSmall",
        "inputs": []
    },
    {
        "type": "error",
        "name": "PRBMath_SD59x18_Mul_Overflow",
        "inputs": [
            { "name": "x", "type": "int256", "internalType": "SD59x18" },
            { "name": "y", "type": "int256", "internalType": "SD59x18" }
        ]
    }
] as const;