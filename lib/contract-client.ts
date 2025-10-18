import { ABI, IContractClient } from "@/types/contract";
import { InitPool, InitPoolResult, Pool, PoolFeesEvent, Reserve, RowPool } from "@/types/pool";
import { LiquidityPoolToken, Token } from "@/types/token";
import { BuyRequest, BuyResult, BuyTrade, Deposit, DepositRequest, DepositResult, SellRequest, SellResult, SellTrade, SwapRequest, SwapResult, SwapTrade, Withdraw, WithdrawRequest, WithdrawResult } from "@/types/trades";
import { Address, erc20Abi, formatEther, parseAbiItem, parseEther } from "viem";
import { Config, UsePublicClientReturnType } from "wagmi";
import { WriteContractMutateAsync } from "wagmi/query";

export class ContractClient implements IContractClient {
    contractAddress: Address;
    writeContract: WriteContractMutateAsync<Config, unknown>
    publicClient: UsePublicClientReturnType;

    constructor(contractAddress: Address, writeContract: WriteContractMutateAsync<Config, unknown>, publicClient: UsePublicClientReturnType) {
        this.contractAddress = contractAddress;
        this.writeContract = writeContract;
        this.publicClient = publicClient;
    }

    private async approveToken(token: string, amount: bigint): Promise<void> {
        try {
            await this.writeContract({
                address: token as Address,
                abi: erc20Abi,
                functionName: 'approve',
                args: [this.contractAddress, amount]
            })
        } catch (error) {
            throw new Error(`Token approval failed: ${(error as Error).message}`);
        }
    }

    async initializePool(initPool: InitPool): Promise<InitPoolResult> {
        try {
            const result: InitPoolResult = {
                success: true,
                txHash: '',
                timestamp: Date.now(),
                error: ''
            }
            await this.approveToken(initPool.token, BigInt(initPool.tokenAmount));
            const txHash = await this.writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'initializePool',
                args: [initPool.token as Address, BigInt(initPool.tokenAmount), BigInt(initPool.inititalBuyPrice), BigInt(initPool.initialSellPrice)],
                value: BigInt(initPool.ethAmount)
            });
            result.txHash = txHash;
            return result;
        } catch (error) {
            throw new Error(`Pool initialization failed: ${(error as Error).message}`);
        }
    }

    async deposit(depositReq: DepositRequest): Promise<DepositResult> {
        try {
            const result: DepositResult = {
                success: true,
                depositRequest: depositReq,
                txHash: '',
                timestamp: Date.now(),
                error: ''
            }
            await this.approveToken(depositReq.token.address, BigInt(depositReq.tokenAmount));
            const txHash = await this.writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'deposit',
                args: [depositReq.token.address as Address],
                value: BigInt(depositReq.ethAmount)
            });
            result.txHash = txHash;
            return result;
        } catch (error) {
            throw new Error(`Deposit failed: ${(error as Error).message}`);
        }
    }

    async withdraw(withdrawReq: WithdrawRequest): Promise<WithdrawResult> {
        try {
            const result: WithdrawResult = {
                success: true,
                txHash: '',
                timestamp: Date.now(),
                error: '',
                withdrawRequest: withdrawReq
            };
            await this.approveToken(withdrawReq.lpToken.address, BigInt(withdrawReq.lpTokenAmount));
            const txHash = await this.writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'withdraw',
                args: [withdrawReq.token.address, BigInt(withdrawReq.lpTokenAmount)]
            });
            result.txHash = txHash;
            return result;
        } catch (error) {
            throw new Error(`Withdraw failed: ${(error as Error).message}`);
        }
    }

    async swap(swapReq: SwapRequest): Promise<SwapResult> {
        try {
            const result: SwapResult = {
                success: true,
                txHash: '',
                timestamp: Date.now(),
                error: '',
                swapRequest: swapReq
            };
            await this.approveToken(swapReq.tokenIn.address as Address, BigInt(swapReq.amountIn));
            const txHash = await this.writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'swap',
                args: [swapReq.tokenIn.address, swapReq.tokenOut.address, BigInt(swapReq.amountIn), BigInt(swapReq.minimumTokenOut)]
            });
            result.txHash = txHash;
            return result;
        } catch (error) {
            throw new Error(`Swap failed: ${(error as Error).message}`);
        }
    }

    async buy(buyReq: BuyRequest): Promise<BuyResult> {
        try {
            const result: BuyResult = {
                success: true,
                txHash: '',
                buyRequest: buyReq,
                amountOut: '',
                timestamp: Date.now(),
            }
            const txHash = await this.writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'buy',
                args: [buyReq.token.address, BigInt(buyReq.minimumAmountToBuy)],
                value: BigInt(buyReq.amountIn)
            });
            result.txHash = txHash;
            return result;
        } catch (error) {
            throw new Error(`Buy failed: ${(error as Error).message}`);
        }
    }

    async sell(sellReq: SellRequest): Promise<SellResult> {
        try {
            const result: SellResult = {
                success: true,
                txHash: '',
                sellRequest: sellReq,
                amountOut: '',
                timestamp: Date.now(),
            }
            await this.approveToken(sellReq.token.address, BigInt(sellReq.amountIn));
            const txHash = await this.writeContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'sell',
                args: [sellReq.token.address, BigInt(sellReq.amountIn), BigInt(sellReq.minimumEthAmount)]
            })
            result.txHash = txHash;
            return result;
        } catch (error) {
            throw new Error(`Sell failed: ${(error as Error).message}`);
        }
    }

    async getToken(token: Address): Promise<Token> {
        try {
            const [decimals, symbol, name] = await Promise.all([
                this.publicClient?.readContract({
                    address: token as Address,
                    abi: erc20Abi,
                    functionName: 'decimals',
                    args: []
                }),
                this.publicClient?.readContract({
                    address: token as Address,
                    abi: erc20Abi,
                    functionName: 'symbol',
                    args: []
                }),
                this.publicClient?.readContract({
                    address: token as Address,
                    abi: erc20Abi,
                    functionName: 'name',
                    args: []
                })
            ]);

            return {
                address: token,
                symbol: symbol as string,
                name: name as string,
                decimals: decimals as number,
            }
        } catch (error) {
            throw new Error(`Error fetching token data: ${(error as Error).message}`);
        }
    }

    async getLPToken(token: Token, user: Address): Promise<LiquidityPoolToken> {
        try {
            const tokenAddress = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'poolToken',
                args: [token.address]
            });
            if (!tokenAddress) throw new Error(`No LP token found for the given token.`);
            const [totalSupply, balance] = await Promise.all([
                this.publicClient?.readContract({
                    address: tokenAddress as Address,
                    abi: erc20Abi,
                    functionName: 'totalSupply',
                    args: []
                }),
                this.publicClient?.readContract({
                    address: tokenAddress as Address,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [user]
                })
            ]);
            const tokenMetaData = await this.getToken(tokenAddress as Address);
            return {
                address: tokenAddress,
                symbol: tokenMetaData.symbol,
                name: tokenMetaData.name,
                decimals: tokenMetaData.decimals,
                totalSupply: totalSupply!.toString(),
                balance: balance!.toString()
            }
        } catch (error) {
            throw new Error(`Error fetching LP token data: ${(error as Error).message}`);
        }
    }

    async getReserves(token: Token): Promise<Reserve> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'reserves',
                args: [token.address]
            })

            if (!data) throw new Error(`Error fetching reserves`);
            return {
                tokenReserve: data![1].toString(),
                ethReserve: data![0].toString()
            }
        } catch (error) {
            throw new Error(`Error fetching reserves: ${(error as Error).message}`);
        }
    }

    async getBuyPrice(token: Token): Promise<string> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'priceBuy',
                args: [token.address],
            });
            if (!data) throw new Error(`Error fetching buy price`);
            return data!.toString();
        } catch (error) {
            throw new Error(`Error fetching buy price: ${(error as Error).message}`);
        }
    }

    async getSellPrice(token: Token): Promise<string> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'priceSell',
                args: [token.address],
            });
            if (!data) throw new Error("No data returned from readContract");
            return data!.toString();
        } catch (error) {
            throw new Error(`Error fetching sell price: ${(error as Error).message}`);
        }
    }

    async getUserBalance(token: Token, user: Address): Promise<Reserve> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'poolUserBalances',
                args: [token.address, user]
            });
            return {
                tokenReserve: data![0].toString(),
                ethReserve: data![1].toString()
            }
        } catch (error) {
            throw new Error(`Error fetching user reserves: ${(error as Error).message}`);
        }
    }

    async getTokenRatio(token: Token): Promise<string> { //1 token = ? ETH
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'tokenPerETHRatio',
                args: [token.address]
            });
            return data!.toString();
        } catch (error) {
            throw new Error(`Error fetching token ratio: ${(error as Error).message}`);
        }
    }

    private getTotalLiquidity(avgPrice: string, reserve: Reserve): string {
        const tokenInEth = formatEther(BigInt(reserve.tokenReserve));
        const liquidity = (Number(avgPrice) * (Number(tokenInEth))) / Number(1e18) + Number(formatEther(BigInt(reserve.ethReserve)));
        return parseEther(String(liquidity)).toString();
    }

    private getAvgPrice(buyPrice: string, sellPrice: string): string {
        return ((Number(buyPrice) + Number(sellPrice)) / Number(2)).toString();
    }

    private getAPR(volume24h: string, totalLiquidity: string): string {
        return ((Number(volume24h) * Number(0.03) * Number(365)) / Number(totalLiquidity)).toString();//Custom 3% trade fee
    }

    private async getBlockTimestamp(blockNumber: bigint): Promise<number> {
        try {
            const block = await this.publicClient?.getBlock({ blockNumber: blockNumber });
            return Number(block!.timestamp) * 1000; //maybe multiply by 1000?
        } catch (error) {
            throw new Error(`Error fetching block timestamp: ${(error as Error).message}`);
        }
    }

    async getBuyTradeEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<BuyTrade[]> {
        try {
            const logs = await this.publicClient?.getLogs({
                address: this.contractAddress,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                event: parseAbiItem('event BuyTrade(address indexed token, address indexed trader, uint256 ethAmount, uint256 tokenAmount, uint256 buyPrice)'),
                args: {
                    token: (token?.address as Address),
                    trader: user as Address | undefined
                },
                strict: true
            });
            let result: BuyTrade[] = [];
            const timestamps = await Promise.all(
                (logs || []).map(async (log) => await this.getBlockTimestamp(log.blockNumber))
            );
            if (!token) {
                const tokens = await Promise.all(
                    (logs || []).map(async (log) => await this.getToken(log.args.token as Address))
                )
                result = (logs || []).map((log, index) => ({
                    token: tokens[index],
                    buyPrice: log.args.buyPrice.toString(),
                    ethAmount: log.args.ethAmount.toString(),
                    timestamp: timestamps[index],
                }));
                return result;
            }
            result = (logs || []).map((log, index) => ({
                token: token,
                buyPrice: log.args.buyPrice.toString(),
                ethAmount: log.args.ethAmount.toString(),
                timestamp: timestamps[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching 24h volume: ${(error as Error).message}`);
        }
    }

    async getSellTradeEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<SellTrade[]> {
        try {
            const logs = await this.publicClient?.getLogs({
                address: this.contractAddress,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                event: parseAbiItem('event SellTrade(address indexed token, address indexed trader, uint256 tokenAmount, uint256 ethAmount, uint256 sellPrice)'),
                args: {
                    token: (token?.address as Address),
                    trader: user as Address | undefined
                },
                strict: true
            });
            let result: SellTrade[] = [];
            const timestamps = await Promise.all(
                (logs || []).map(log => this.getBlockTimestamp(log.blockNumber))
            );
            if (!token) {
                const tokens = await Promise.all(
                    (logs || []).map(async (log) => await this.getToken(log.args.token as Address))
                )
                result = (logs || []).map((log, index) => ({
                    token: tokens[index],
                    sellPrice: log.args.sellPrice.toString(),
                    ethAmount: log.args.ethAmount.toString(),
                    timestamp: timestamps[index],
                }));
                return result;
            }
            result = (logs || []).map((log, index) => ({
                token: token,
                sellPrice: log.args.sellPrice.toString(),
                ethAmount: log.args.ethAmount.toString(),
                timestamp: timestamps[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching 24h volume: ${(error as Error).message}`);
        }
    }

    private async swapInEventLogs(fromBlock: number, toBlock: number, tokenIn: Token): Promise<SwapTrade[]> {
        try {
            const logs = await this.publicClient?.getLogs({
                address: this.contractAddress,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                event: parseAbiItem('event SwapTrade(address indexed tokenIn, address indexed tokenOut, address indexed trader, uint256 amountIn, uint256 amountOut, uint256 sellPrice, uint256 buyPrice)'),
                args: {
                    tokenIn: tokenIn.address as Address,
                },
                strict: true
            });
            let result: SwapTrade[] = [];
            const timestamps = await Promise.all(
                (logs || []).map(log => this.getBlockTimestamp(log.blockNumber))
            );
            const tokensOut = await Promise.all(
                (logs || []).map(async (log) => await this.getToken(log.args.tokenOut as Address))
            )
            result = (logs || []).map((log, index) => ({
                tokenIn: tokenIn,
                tokenOut: tokensOut[index],
                amountIn: log.args.amountIn.toString(),
                amountOut: log.args.amountOut.toString(),
                sellPrice: log.args.sellPrice.toString(),
                buyPrice: log.args.buyPrice.toString(),
                timestamp: timestamps[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching 24h volume: ${(error as Error).message}`);
        }
    }

    private async swapOutEventLogs(fromBlock: number, toBlock: number, tokenOut: Token): Promise<SwapTrade[]> {
        try {
            const logs = await this.publicClient?.getLogs({
                address: this.contractAddress,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                event: parseAbiItem('event SwapTrade(address indexed tokenIn, address indexed tokenOut, address indexed trader, uint256 amountIn, uint256 amountOut, uint256 sellPrice, uint256 buyPrice)'),
                args: {
                    tokenOut: tokenOut.address as Address,
                },
                strict: true
            });
            let result: SwapTrade[] = [];
            const timestamps = await Promise.all(
                (logs || []).map(log => this.getBlockTimestamp(log.blockNumber))
            );
            const tokensIn = await Promise.all(
                (logs || []).map(async (log) => await this.getToken(log.args.tokenIn as Address))
            )
            result = (logs || []).map((log, index) => ({
                tokenOut: tokenOut,
                tokenIn: tokensIn[index],
                amountIn: log.args.amountIn.toString(),
                amountOut: log.args.amountOut.toString(),
                sellPrice: log.args.sellPrice.toString(),
                buyPrice: log.args.buyPrice.toString(),
                timestamp: timestamps[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching 24h volume: ${(error as Error).message}`);
        }
    }

    async getSwapTradeEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<SwapTrade[]> {
        try {
            if (user) {
                const logs = await this.publicClient?.getLogs({
                    address: this.contractAddress,
                    fromBlock: BigInt(fromBlock),
                    toBlock: BigInt(toBlock),
                    event: parseAbiItem('event SwapTrade(address indexed tokenIn, address indexed tokenOut, address indexed trader, uint256 amountIn, uint256 amountOut, uint256 sellPrice, uint256 buyPrice)'),
                    args: {
                        trader: user as Address,
                    },
                    strict: true
                });
                let result: SwapTrade[] = [];
                const timestamps = await Promise.all(
                    (logs || []).map(log => this.getBlockTimestamp(log.blockNumber))
                );
                const tokensIn = await Promise.all(
                    (logs || []).map(async (log) => await this.getToken(log.args.tokenIn as Address))
                )
                const tokensOut = await Promise.all(
                    (logs || []).map(async (log) => await this.getToken(log.args.tokenOut as Address))
                )
                result = (logs || []).map((log, index) => ({
                    token: token,
                    tokenIn: tokensIn[index],
                    tokenOut: tokensOut[index],
                    amountIn: log.args.amountIn.toString(),
                    amountOut: log.args.amountOut.toString(),
                    sellPrice: log.args.sellPrice.toString(),
                    buyPrice: log.args.buyPrice.toString(),
                    timestamp: timestamps[index],
                }));
                return result;
            }
            const swapInTrades = await this.swapInEventLogs(fromBlock, toBlock, token! as Token);
            const swapOutTrades = await this.swapOutEventLogs(fromBlock, toBlock, token! as Token);
            return swapInTrades.concat(swapOutTrades);
        } catch (error) {
            throw new Error(`Error fetching swap trade logs: ${(error as Error).message}`);
        }
    }

    private async get24hBeforeBlock(): Promise<bigint> {
        try {
            let lowBlock = BigInt(0);
            let highBlock = BigInt(0);
            while (lowBlock <= highBlock) {
                const midBlock = (lowBlock + highBlock) / BigInt(2);
                const midTimestamp = await this.getBlockTimestamp(midBlock);
                if (Date.now() - midTimestamp < 24 * 60 * 60 * 1000) {
                    lowBlock = midBlock + BigInt(1);
                } else {
                    highBlock = midBlock - BigInt(1);
                }
            }
            return lowBlock;
        } catch (error) {
            throw new Error(`Error fetching 24h behind block: ${(error as Error).message}`);
        }
    }

    private async get24hVolume(token: Token): Promise<string> {
        try {
            const toBlock = await this.publicClient?.getBlockNumber();
            const fromBlock = await this.get24hBeforeBlock();
            const buyLogs = await this.getBuyTradeEventLogs(Number(fromBlock), Number(toBlock), token);
            const sellLogs = await this.getSellTradeEventLogs(Number(fromBlock), Number(toBlock), token);
            const swapLogs = await this.getSwapTradeEventLogs(Number(fromBlock), Number(toBlock), token);
            let volume = 0;
            buyLogs.forEach(log => {
                volume += Number(log.ethAmount);
            });
            sellLogs.forEach(log => {
                volume += Number(log.ethAmount);
            });
            swapLogs.forEach(log => {
                if (log.tokenIn.address === token.address) {
                    volume += (Number(log.amountIn) * Number(log.sellPrice)) / 1e18;
                } else if (log.tokenOut.address === token.address) {
                    volume += (Number(log.amountOut) * Number(log.buyPrice)) / 1e18;
                }
            });
            return volume.toString();
        } catch (error) {
            throw new Error(`Error fetching 24h volume: ${(error as Error).message}`);
        }
    }

    async getLastExchangeTimestamp(token: Token): Promise<number> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'pools',
                args: [token.address]
            });
            return Number(data![2]) * 1000;
        } catch (error) {
            throw new Error(`Error fetching last exchange timestamp: ${(error as Error).message}`);
        }
    }

    async getDepositEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<Deposit[]> {
        try {
            const logs = await this.publicClient?.getLogs({
                address: this.contractAddress,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                event: parseAbiItem('event Deposit(address indexed token, address indexed user, uint256 ethAmount, uint256 tokenAmount, uint256 lpTokensMinted)'),
                args: {
                    token: (token?.address as Address),
                    user: user as Address | undefined
                },
                strict: true
            });
            let result: Deposit[] = [];
            const timestamps = await Promise.all(
                (logs || []).map(log => this.getBlockTimestamp(log.blockNumber))
            );
            if (!token) {
                const tokens = await Promise.all(
                    (logs || []).map(async (log) => await this.getToken(log.args.token as Address))
                )
                result = (logs || []).map((log, index) => ({
                    token: tokens[index],
                    ethAmount: log.args.ethAmount.toString(),
                    tokenAmount: log.args.tokenAmount.toString(),
                    lpTokensMinted: log.args.lpTokensMinted.toString(),
                    timestamp: timestamps[index],
                }));
                return result;
            }
            result = (logs || []).map((log, index) => ({
                token: token,
                ethAmount: log.args.ethAmount.toString(),
                tokenAmount: log.args.tokenAmount.toString(),
                lpTokensMinted: log.args.lpTokensMinted.toString(),
                timestamp: timestamps[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching deposit logs: ${(error as Error).message}`);
        }
    }

    async getWithdrawEventLogs(fromBlock: number, toBlock: number, token?: Token, user?: Address): Promise<Withdraw[]> {
        try {
            const logs = await this.publicClient?.getLogs({
                address: this.contractAddress,
                fromBlock: BigInt(fromBlock),
                toBlock: BigInt(toBlock),
                event: parseAbiItem('event withdraw(address indexed token, address indexed user, uint256 ethAmount, uint256 tokenAmount, uint256 lpTokensBurned)'),
                args: {
                    token: (token?.address as Address),
                    user: user as Address | undefined
                },
                strict: true
            });
            let result: Withdraw[] = [];
            const timestamps = await Promise.all(
                (logs || []).map(log => this.getBlockTimestamp(log.blockNumber))
            );
            if (!token) {
                const tokens = await Promise.all(
                    (logs || []).map(async (log) => await this.getToken(log.args.token as Address))
                )
                result = (logs || []).map((log, index) => ({
                    token: tokens[index],
                    ethAmount: log.args.ethAmount.toString(),
                    tokenAmount: log.args.tokenAmount.toString(),
                    lpTokensBurnt: log.args.lpTokensBurned.toString(),
                    timestamp: timestamps[index],
                }));
                return result;
            }
            result = (logs || []).map((log, index) => ({
                token: token,
                ethAmount: log.args.ethAmount.toString(),
                tokenAmount: log.args.tokenAmount.toString(),
                lpTokensBurnt: log.args.lpTokensBurned.toString(),
                timestamp: timestamps[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching withdraw logs: ${(error as Error).message}`);
        }
    }

    async getPool(token: Token, user: Address): Promise<Pool> {
        try {
            const lpToken = await this.getLPToken(token, user);
            const reserve = await this.getReserves(token);
            const buyPrice = await this.getBuyPrice(token);
            const sellPrice = await this.getSellPrice(token);
            const tokenRatio = await this.getTokenRatio(token);
            const volume24h = await this.get24hVolume(token);
            const avgPrice = this.getAvgPrice(buyPrice, sellPrice);
            const totalLiquidity = this.getTotalLiquidity(avgPrice, reserve);
            const apr = this.getAPR(volume24h, totalLiquidity);
            const lastExchangeTs = await this.getLastExchangeTimestamp(token);
            return {
                token: token,
                reserve: reserve,
                lpToken: lpToken,
                buyPrice: buyPrice,
                sellPrice: sellPrice,
                avgPrice: avgPrice,
                tokenRatio: tokenRatio,
                volume24h: volume24h,
                totalLiquidty: totalLiquidity,
                apr: Number(apr),
                lastExchangeTs: lastExchangeTs,
                lastUpdated: Date.now()
            }
        } catch (error) {
            throw new Error(`Error fetching pool data: ${(error as Error).message}`);
        }
    }

    async getPools(startIndex: number, offset: number): Promise<RowPool[]> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'getPoolList',
                args: [BigInt(startIndex), BigInt(offset)]
            });
            const tokens = await Promise.all(
                (data as Address[]).map(async (addr) => await this.getToken(addr as Address))
            );
            const buyPrices = await Promise.all(
                tokens.map(async (token) => await this.getBuyPrice(token))
            );
            const sellPrices = await Promise.all(
                tokens.map(async (token) => await this.getSellPrice(token))
            );
            const reserves = await Promise.all(
                tokens.map(async (token) => await this.getReserves(token))
            );
            const liquidity = await Promise.all(
                tokens.map(async (token, index) => await this.getTotalLiquidity(this.getAvgPrice(buyPrices[index], sellPrices[index]), reserves[index]))
            );
            const result = (tokens || []).map((token, index) => ({
                token: token,
                buyPrice: buyPrices[index],
                sellPrice: sellPrices[index],
                totalLiquidity: liquidity[index],
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching pools: ${(error as Error).message}`);
        }
    }

    // async getUserLiquidity(user: Address) : Promise<string> {
    //     try {
    //         const data = await this.publicClient?.readContract({
    //             address: this.contractAddress,
    //             abi: ABI,
    //             functionName: 'liquidityProvided',
    //             args: [user]
    //         });
    //         return data!.toString();
    //     } catch (error) {
    //         throw new Error(`Error fetching user liquidity: ${(error as Error).message}`);
    //     }
    // }

    async getUserPools(user: Address, startIndex: number, offset: number): Promise<RowPool[]> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'getUserPools',
                args: [user, BigInt(startIndex), BigInt(offset)]
            });
            const tokens = await Promise.all(
                (data as Address[]).map(async (addr) => await this.getToken(addr as Address))
            );
            const buyPrices = await Promise.all(
                tokens.map(async (token) => await this.getBuyPrice(token))
            );
            const sellPrices = await Promise.all(
                tokens.map(async (token) => await this.getSellPrice(token))
            );
            const reserves = await Promise.all(
                tokens.map(async (token) => await this.getReserves(token))
            );
            const liquidity = await Promise.all(
                tokens.map(async (token, index) => await this.getTotalLiquidity(this.getAvgPrice(buyPrices[index], sellPrices[index]), reserves[index]))
            );
            const lpTokens = await Promise.all(
                tokens.map(async (token) => await this.getLPToken(token, user))
            );
            const result = (tokens || []).map((token, index) => ({
                token: token,
                buyPrice: buyPrices[index],
                sellPrice: sellPrices[index],
                totalLiquidity: liquidity[index],
                lpToken: lpTokens[index]
            }));
            return result;
        } catch (error) {
            throw new Error(`Error fetching pools: ${(error as Error).message}`);
        }
    }

    async getPoolCount(): Promise<number> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'getTotalPools',
                args: []
            });
            return Number(data);
        } catch (error) {
            throw new Error(`Error fetching pool count: ${(error as Error).message}`);
        }
    }

    async getUserPoolCount(user: Address): Promise<number> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'getUserTotalPools',
                args: [user]
            });
            return Number(data);
        } catch (error) {
            throw new Error(`Error fetching user pool count: ${(error as Error).message}`);
        }
    }

    async getTotalFees(): Promise<string> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'totalFees',
                args: []
            });
            return String(data);
        } catch (error) {
            throw new Error(`Error fetching total fee: ${(error as Error).message}`);
        }
    }

    async getTotalPoolFee(token: Token): Promise<string> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'totalPoolFees',
                args: [token.address]
            });
            return String(data);
        } catch (error) {
            throw new Error(`Error fetching total pool fee: ${(error as Error).message}`);
        }
    }

    async getPoolFeeEvents(token: Token, startIndex: number, endIndex: number): Promise<PoolFeesEvent[]> {
        try {
            const data = await this.publicClient?.readContract({
                address: this.contractAddress,
                abi: ABI,
                functionName: 'getPoolFeeList',
                args: [token.address, BigInt(startIndex), BigInt(endIndex)]
            });
            let result: PoolFeesEvent[] = [];
            for (let i = 0; i < (data as any[]).length; i++) {
                result.push({
                    timestamp: Number((data as any[])[i][1]) * 1000,
                    fee: (data as any[])[i][0].toString(),
                });
            }
            return result;
        } catch (error) {
            throw new Error(`Error fetching pool fee events: ${(error as Error).message}`);
        }
    }

    public getYield(feeEvents: PoolFeesEvent[]): number {
        let totalFees = 0;
        feeEvents.forEach(event => {
            totalFees += Number(event.fee);
        });
        const totalTime = (feeEvents[feeEvents.length - 1].timestamp - feeEvents[0].timestamp) / (1000 * 60 * 60 * 24); //days
        return totalFees / totalTime;
    }
}