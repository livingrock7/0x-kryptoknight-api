"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SwapService = void 0;
const asset_swapper_1 = require("@0x/asset-swapper");
const contract_wrappers_1 = require("@0x/contract-wrappers");
const order_utils_1 = require("@0x/order-utils");
const types_1 = require("@0x/types");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const _ = require("lodash");
const config_1 = require("../config");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const token_metadatas_for_networks_1 = require("../token_metadatas_for_networks");
const types_2 = require("../types");
const market_depth_utils_1 = require("../utils/market_depth_utils");
const result_cache_1 = require("../utils/result_cache");
const service_utils_1 = require("../utils/service_utils");
const token_metadata_utils_1 = require("../utils/token_metadata_utils");
class SwapService {
    constructor(orderbook, provider, contractAddresses) {
        this._provider = provider;
        const swapQuoterOpts = Object.assign(Object.assign({}, config_1.SWAP_QUOTER_OPTS), { rfqt: Object.assign(Object.assign({}, config_1.SWAP_QUOTER_OPTS.rfqt), { warningLogger: logger_1.logger.warn.bind(logger_1.logger), infoLogger: logger_1.logger.info.bind(logger_1.logger) }), contractAddresses });
        this._swapQuoter = new asset_swapper_1.SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._swapQuoteConsumer = new asset_swapper_1.SwapQuoteConsumer(this._provider, swapQuoterOpts);
        this._web3Wrapper = new web3_wrapper_1.Web3Wrapper(this._provider);
        this._contractAddresses = contractAddresses;
        this._wethContract = new contract_wrappers_1.WETH9Contract(this._contractAddresses.etherToken, this._provider);
        const gasTokenContract = new contract_wrappers_1.ERC20TokenContract(token_metadata_utils_1.getTokenMetadataIfExists('GST2', config_1.CHAIN_ID).tokenAddress, this._provider);
        this._gstBalanceResultCache = result_cache_1.createResultCache(() => gasTokenContract.balanceOf(constants_1.GST2_WALLET_ADDRESSES[config_1.CHAIN_ID]).callAsync());
        this._tokenDecimalResultCache = result_cache_1.createResultCache((tokenAddress) => service_utils_1.serviceUtils.fetchTokenDecimalsIfRequiredAsync(tokenAddress, this._web3Wrapper), 
        // tslint:disable-next-line:custom-no-magic-numbers
        constants_1.TEN_MINUTES_MS * 6 * 24);
    }
    calculateSwapQuoteAsync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { buyAmount, buyTokenAddress, sellTokenAddress, isETHSell, isETHBuy, from, affiliateAddress, 
            // tslint:disable-next-line:boolean-naming
            skipValidation, swapVersion, affiliateFee, } = params;
            const swapQuote = yield this._getMarketBuyOrSellQuoteAsync(params);
            const attributedSwapQuote = service_utils_1.serviceUtils.attributeSwapQuoteOrders(swapQuote);
            const { makerAssetAmount, totalTakerAssetAmount, protocolFeeInWeiAmount: bestCaseProtocolFee, } = attributedSwapQuote.bestCaseQuoteInfo;
            const { protocolFeeInWeiAmount: protocolFee, gas: worstCaseGas } = attributedSwapQuote.worstCaseQuoteInfo;
            const { orders, gasPrice, sourceBreakdown, quoteReport } = attributedSwapQuote;
            const { gasCost: affiliateFeeGasCost, buyTokenFeeAmount, sellTokenFeeAmount, } = service_utils_1.serviceUtils.getAffiliateFeeAmounts(swapQuote, affiliateFee);
            const { to, value, data, decodedUniqueId } = yield this._getSwapQuotePartialTransactionAsync(swapQuote, isETHSell, isETHBuy, affiliateAddress, swapVersion, { recipient: affiliateFee.recipient, buyTokenFeeAmount, sellTokenFeeAmount });
            let gst2Balance = constants_1.ZERO;
            try {
                gst2Balance = (yield this._gstBalanceResultCache.getResultAsync()).result;
            }
            catch (err) {
                logger_1.logger.error(err);
            }
            const { gasTokenRefund, gasTokenGasCost } = service_utils_1.serviceUtils.getEstimatedGasTokenRefundInfo(attributedSwapQuote.orders, gst2Balance);
            let conservativeBestCaseGasEstimate = new utils_1.BigNumber(worstCaseGas)
                .plus(gasTokenGasCost)
                .plus(affiliateFeeGasCost)
                .plus(swapVersion === types_2.SwapVersion.V1 ? config_1.BASE_GAS_COST_V1 : 0);
            if (!skipValidation && from) {
                const estimateGasCallResult = yield this._estimateGasOrThrowRevertErrorAsync({
                    to,
                    data,
                    from,
                    value,
                    gasPrice,
                });
                // Take the max of the faux estimate or the real estimate
                conservativeBestCaseGasEstimate = utils_1.BigNumber.max(estimateGasCallResult, conservativeBestCaseGasEstimate);
            }
            // If any sources can be undeterministic in gas costs, we add a buffer
            const hasUndeterministicFills = _.flatten(swapQuote.orders.map(order => order.fills)).some(fill => [asset_swapper_1.ERC20BridgeSource.Native, asset_swapper_1.ERC20BridgeSource.Kyber, asset_swapper_1.ERC20BridgeSource.MultiBridge].includes(fill.source));
            const undeterministicMultiplier = hasUndeterministicFills ? constants_1.GAS_LIMIT_BUFFER_MULTIPLIER : 1;
            // Add a buffer to get the worst case gas estimate
            const worstCaseGasEstimate = conservativeBestCaseGasEstimate.times(undeterministicMultiplier).integerValue();
            // Cap the refund at 50% our best estimate
            const estimatedGasTokenRefund = utils_1.BigNumber.min(conservativeBestCaseGasEstimate.div(2), gasTokenRefund).decimalPlaces(0);
            const { price, guaranteedPrice } = yield this._getSwapQuotePriceAsync(buyAmount, buyTokenAddress, sellTokenAddress, attributedSwapQuote, affiliateFee);
            // set the allowance target based on version. V0 is legacy param to support transition to v1
            let erc20AllowanceTarget = constants_1.NULL_ADDRESS;
            let adjustedWorstCaseProtocolFee = protocolFee;
            let adjustedValue = value;
            switch (swapVersion) {
                case types_2.SwapVersion.V0:
                    erc20AllowanceTarget = this._contractAddresses.erc20Proxy;
                    break;
                case types_2.SwapVersion.V1:
                    erc20AllowanceTarget = this._contractAddresses.exchangeProxyAllowanceTarget;
                    // With v1 we are able to fill bridges directly so the protocol fee is lower
                    const nativeFills = _.flatten(swapQuote.orders.map(order => order.fills)).filter(fill => fill.source === asset_swapper_1.ERC20BridgeSource.Native);
                    adjustedWorstCaseProtocolFee = new utils_1.BigNumber(config_1.PROTOCOL_FEE_MULTIPLIER)
                        .times(gasPrice)
                        .times(nativeFills.length);
                    adjustedValue = isETHSell
                        ? adjustedWorstCaseProtocolFee.plus(swapQuote.worstCaseQuoteInfo.takerAssetAmount)
                        : adjustedWorstCaseProtocolFee;
                    break;
                default:
                    throw new Error(`Unsupported Swap version: ${swapVersion}`);
            }
            const allowanceTarget = isETHSell ? constants_1.NULL_ADDRESS : erc20AllowanceTarget;
            const apiSwapQuote = {
                price,
                guaranteedPrice,
                to,
                data,
                value: adjustedValue,
                gas: worstCaseGasEstimate,
                estimatedGas: conservativeBestCaseGasEstimate,
                from,
                gasPrice,
                protocolFee: adjustedWorstCaseProtocolFee,
                minimumProtocolFee: utils_1.BigNumber.min(adjustedWorstCaseProtocolFee, bestCaseProtocolFee),
                buyTokenAddress,
                sellTokenAddress,
                buyAmount: makerAssetAmount.minus(buyTokenFeeAmount),
                sellAmount: totalTakerAssetAmount,
                estimatedGasTokenRefund,
                sources: service_utils_1.serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
                orders: service_utils_1.serviceUtils.cleanSignedOrderFields(orders),
                allowanceTarget,
                decodedUniqueId,
                quoteReport,
            };
            return apiSwapQuote;
        });
    }
    getSwapQuoteForWrapAsync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._getSwapQuoteForWethAsync(params, false);
        });
    }
    getSwapQuoteForUnwrapAsync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._getSwapQuoteForWethAsync(params, true);
        });
    }
    getTokenPricesAsync(sellToken, unitAmount) {
        return __awaiter(this, void 0, void 0, function* () {
            // Gets the price for buying 1 unit (not base unit as this is different between tokens with differing decimals)
            // returns price in sellToken units, e.g What is the price of 1 ZRX (in DAI)
            // Equivalent to performing multiple swap quotes selling sellToken and buying 1 whole buy token
            const takerAssetData = order_utils_1.assetDataUtils.encodeERC20AssetData(sellToken.tokenAddress);
            const queryAssetData = token_metadatas_for_networks_1.TokenMetadatasForChains.filter(m => m.symbol !== sellToken.symbol).filter(m => m.tokenAddresses[config_1.CHAIN_ID] !== constants_1.NULL_ADDRESS);
            const chunkSize = 15;
            const assetDataChunks = _.chunk(queryAssetData, chunkSize);
            const allResults = _.flatten(yield Promise.all(assetDataChunks.map((a) => __awaiter(this, void 0, void 0, function* () {
                const encodedAssetData = a.map(m => order_utils_1.assetDataUtils.encodeERC20AssetData(m.tokenAddresses[config_1.CHAIN_ID]));
                const amounts = a.map(m => web3_wrapper_1.Web3Wrapper.toBaseUnitAmount(unitAmount, m.decimals));
                const quotes = yield this._swapQuoter.getBatchMarketBuySwapQuoteForAssetDataAsync(encodedAssetData, takerAssetData, amounts, Object.assign(Object.assign({}, config_1.ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS), { bridgeSlippage: 0, maxFallbackSlippage: 0, numSamples: 1, shouldBatchBridgeOrders: false }));
                return quotes;
            }))));
            const prices = allResults
                .map((quote, i) => {
                if (!quote) {
                    return undefined;
                }
                const buyTokenDecimals = queryAssetData[i].decimals;
                const sellTokenDecimals = sellToken.decimals;
                const { makerAssetAmount, totalTakerAssetAmount } = quote.bestCaseQuoteInfo;
                const unitMakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
                const unitTakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
                const price = unitTakerAssetAmount.dividedBy(unitMakerAssetAmount).decimalPlaces(sellTokenDecimals);
                return {
                    symbol: queryAssetData[i].symbol,
                    price,
                };
            })
                .filter(p => p);
            return prices;
        });
    }
    calculateMarketDepthAsync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { buyToken, sellToken, sellAmount, numSamples, sampleDistributionBase, excludedSources } = params;
            const marketDepth = yield this._swapQuoter.getBidAskLiquidityForMakerTakerAssetPairAsync(buyToken.tokenAddress, sellToken.tokenAddress, sellAmount, {
                numSamples,
                excludedSources: [...(excludedSources || []), asset_swapper_1.ERC20BridgeSource.MultiBridge],
                sampleDistributionBase,
            });
            const maxEndSlippagePercentage = 20;
            const scalePriceByDecimals = (priceDepth) => priceDepth.map(b => (Object.assign(Object.assign({}, b), { price: b.price.times(new utils_1.BigNumber(10).pow(sellToken.decimals - buyToken.decimals)) })));
            const askDepth = scalePriceByDecimals(market_depth_utils_1.marketDepthUtils.calculateDepthForSide(marketDepth.asks, types_1.MarketOperation.Sell, numSamples * 2, sampleDistributionBase, maxEndSlippagePercentage));
            const bidDepth = scalePriceByDecimals(market_depth_utils_1.marketDepthUtils.calculateDepthForSide(marketDepth.bids, types_1.MarketOperation.Buy, numSamples * 2, sampleDistributionBase, maxEndSlippagePercentage));
            return {
                // We're buying buyToken and SELLING sellToken (DAI) (50k)
                // Price goes from HIGH to LOW
                asks: { depth: askDepth },
                // We're BUYING sellToken (DAI) (50k) and selling buyToken
                // Price goes from LOW to HIGH
                bids: { depth: bidDepth },
            };
        });
    }
    _getSwapQuoteForWethAsync(params, isUnwrap) {
        return __awaiter(this, void 0, void 0, function* () {
            const { from, buyTokenAddress, sellTokenAddress, buyAmount, sellAmount, affiliateAddress, gasPrice: providedGasPrice, } = params;
            const amount = buyAmount || sellAmount;
            if (amount === undefined) {
                throw new Error('sellAmount or buyAmount required');
            }
            const data = (isUnwrap
                ? this._wethContract.withdraw(amount)
                : this._wethContract.deposit()).getABIEncodedTransactionData();
            const value = isUnwrap ? constants_1.ZERO : amount;
            const attributedCalldata = service_utils_1.serviceUtils.attributeCallData(data, affiliateAddress);
            // TODO: consider not using protocol fee utils due to lack of need for an aggresive gas price for wrapping/unwrapping
            const gasPrice = providedGasPrice || (yield this._swapQuoter.getGasPriceEstimationOrThrowAsync());
            const gasEstimate = isUnwrap ? constants_1.UNWRAP_QUOTE_GAS : constants_1.WRAP_QUOTE_GAS;
            const apiSwapQuote = {
                price: constants_1.ONE,
                guaranteedPrice: constants_1.ONE,
                to: this._wethContract.address,
                data: attributedCalldata.affiliatedData,
                decodedUniqueId: attributedCalldata.decodedUniqueId,
                value,
                gas: gasEstimate,
                estimatedGas: gasEstimate,
                from,
                gasPrice,
                protocolFee: constants_1.ZERO,
                minimumProtocolFee: constants_1.ZERO,
                estimatedGasTokenRefund: constants_1.ZERO,
                buyTokenAddress,
                sellTokenAddress,
                buyAmount: amount,
                sellAmount: amount,
                sources: [],
                orders: [],
                allowanceTarget: constants_1.NULL_ADDRESS,
            };
            return apiSwapQuote;
        });
    }
    _estimateGasOrThrowRevertErrorAsync(txData) {
        return __awaiter(this, void 0, void 0, function* () {
            const gas = yield this._web3Wrapper.estimateGasAsync(txData).catch(_e => constants_1.DEFAULT_VALIDATION_GAS_LIMIT);
            yield this._throwIfCallIsRevertErrorAsync(Object.assign(Object.assign({}, txData), { gas }));
            return new utils_1.BigNumber(gas);
        });
    }
    _throwIfCallIsRevertErrorAsync(txData) {
        return __awaiter(this, void 0, void 0, function* () {
            let callResult;
            let revertError;
            try {
                callResult = yield this._web3Wrapper.callAsync(txData);
            }
            catch (e) {
                if (e.message && /insufficient funds/.test(e.message)) {
                    throw new errors_1.InsufficientFundsError();
                }
                // RPCSubprovider can throw if .error exists on the response payload
                // This `error` response occurs from Parity nodes (incl Alchemy) and Geth nodes >= 1.9.14
                // Geth 1.9.15
                if (e.message && /execution reverted/.test(e.message) && e.data) {
                    try {
                        revertError = utils_1.RevertError.decode(e.data, false);
                    }
                    catch (e) {
                        logger_1.logger.error(`Could not decode revert error: ${e}`);
                        throw new Error(e.message);
                    }
                }
                else {
                    revertError = utils_1.decodeThrownErrorAsRevertError(e);
                }
                if (revertError) {
                    throw revertError;
                }
            }
            try {
                revertError = utils_1.RevertError.decode(callResult, false);
            }
            catch (e) {
                // No revert error
            }
            if (revertError) {
                throw revertError;
            }
        });
    }
    _getMarketBuyOrSellQuoteAsync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sellAmount, buyAmount, buyTokenAddress, sellTokenAddress, slippagePercentage, gasPrice: providedGasPrice, isETHSell, from, excludedSources, apiKey, rfqt, swapVersion, affiliateFee, } = params;
            let _rfqt;
            const isAllExcluded = Object.values(asset_swapper_1.ERC20BridgeSource).every(s => excludedSources.includes(s));
            if (isAllExcluded) {
                throw new errors_1.ValidationError([
                    {
                        field: 'excludedSources',
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                        reason: 'Request excluded all sources',
                    },
                ]);
            }
            if (apiKey !== undefined && (isETHSell || from !== undefined)) {
                let takerAddress;
                switch (swapVersion) {
                    case types_2.SwapVersion.V0:
                        // If this is a forwarder transaction, then we want to request quotes with the taker as the
                        // forwarder contract. If it's not, then we want to request quotes with the taker set to the
                        // API's takerAddress query parameter, which in this context is known as `from`.
                        takerAddress = isETHSell ? this._contractAddresses.forwarder : from || '';
                        break;
                    case types_2.SwapVersion.V1:
                        // In V1 the taker is always the ExchangeProxy's FlashWallet
                        // as it allows us to optionally transform assets (i.e Deposit ETH into WETH)
                        // Since the FlashWallet is the taker it needs to be forwarded to the quote provider
                        takerAddress = this._contractAddresses.exchangeProxyFlashWallet;
                        break;
                    default:
                        throw new Error(`Unsupported Swap version: ${swapVersion}`);
                }
                _rfqt = Object.assign(Object.assign({}, rfqt), { intentOnFilling: rfqt && rfqt.intentOnFilling ? true : false, apiKey, 
                    // If this is a forwarder transaction, then we want to request quotes with the taker as the
                    // forwarder contract. If it's not, then we want to request quotes with the taker set to the
                    // API's takerAddress query parameter, which in this context is known as `from`.
                    makerEndpointMaxResponseTimeMs: config_1.RFQT_REQUEST_MAX_RESPONSE_MS, takerAddress });
            }
            const swapQuoteRequestOpts = swapVersion === types_2.SwapVersion.V0 ? config_1.ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS : config_1.ASSET_SWAPPER_MARKET_ORDERS_V1_OPTS;
            const assetSwapperOpts = Object.assign(Object.assign({}, swapQuoteRequestOpts), { bridgeSlippage: slippagePercentage, gasPrice: providedGasPrice, excludedSources: swapQuoteRequestOpts.excludedSources.concat(...(excludedSources || [])), rfqt: _rfqt });
            if (sellAmount !== undefined) {
                return this._swapQuoter.getMarketSellSwapQuoteAsync(buyTokenAddress, sellTokenAddress, sellAmount, assetSwapperOpts);
            }
            else if (buyAmount !== undefined) {
                const buyAmountScaled = buyAmount
                    .times(affiliateFee.buyTokenPercentageFee + 1)
                    .integerValue(utils_1.BigNumber.ROUND_DOWN);
                return this._swapQuoter.getMarketBuySwapQuoteAsync(buyTokenAddress, sellTokenAddress, buyAmountScaled, assetSwapperOpts);
            }
            else {
                throw new Error('sellAmount or buyAmount required');
            }
        });
    }
    _getSwapQuotePartialTransactionAsync(swapQuote, isFromETH, isToETH, affiliateAddress, swapVersion, affiliateFee) {
        return __awaiter(this, void 0, void 0, function* () {
            let opts = { useExtensionContract: asset_swapper_1.ExtensionContractType.None };
            switch (swapVersion) {
                case types_2.SwapVersion.V0:
                    if (isFromETH) {
                        opts = { useExtensionContract: asset_swapper_1.ExtensionContractType.Forwarder };
                    }
                    break;
                case types_2.SwapVersion.V1:
                    opts = {
                        useExtensionContract: asset_swapper_1.ExtensionContractType.ExchangeProxy,
                        extensionContractOpts: { isFromETH, isToETH, affiliateFee },
                    };
                    break;
                default:
                    throw new Error(`Unsupported Swap version: ${swapVersion}`);
            }
            const { calldataHexString: data, ethAmount: value, toAddress: to, } = yield this._swapQuoteConsumer.getCalldataOrThrowAsync(swapQuote, opts);
            const { affiliatedData, decodedUniqueId } = service_utils_1.serviceUtils.attributeCallData(data, affiliateAddress);
            return {
                to,
                value,
                data: affiliatedData,
                decodedUniqueId,
            };
        });
    }
    _getSwapQuotePriceAsync(buyAmount, buyTokenAddress, sellTokenAddress, swapQuote, affiliateFee) {
        return __awaiter(this, void 0, void 0, function* () {
            const { makerAssetAmount, totalTakerAssetAmount } = swapQuote.bestCaseQuoteInfo;
            const { makerAssetAmount: guaranteedMakerAssetAmount, totalTakerAssetAmount: guaranteedTotalTakerAssetAmount, } = swapQuote.worstCaseQuoteInfo;
            const buyTokenDecimals = (yield this._tokenDecimalResultCache.getResultAsync(buyTokenAddress)).result;
            const sellTokenDecimals = (yield this._tokenDecimalResultCache.getResultAsync(sellTokenAddress)).result;
            const unitMakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
            const unitTakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
            // Best price
            const price = buyAmount === undefined
                ? unitMakerAssetAmount
                    .dividedBy(affiliateFee.buyTokenPercentageFee + 1)
                    .dividedBy(unitTakerAssetAmount)
                    .decimalPlaces(sellTokenDecimals)
                : unitTakerAssetAmount
                    .dividedBy(unitMakerAssetAmount)
                    .times(affiliateFee.buyTokenPercentageFee + 1)
                    .decimalPlaces(buyTokenDecimals);
            // Guaranteed price before revert occurs
            const guaranteedUnitMakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(guaranteedMakerAssetAmount, buyTokenDecimals);
            const guaranteedUnitTakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(guaranteedTotalTakerAssetAmount, sellTokenDecimals);
            const guaranteedPrice = buyAmount === undefined
                ? guaranteedUnitMakerAssetAmount
                    .dividedBy(affiliateFee.buyTokenPercentageFee + 1)
                    .dividedBy(guaranteedUnitTakerAssetAmount)
                    .decimalPlaces(sellTokenDecimals)
                : guaranteedUnitTakerAssetAmount
                    .dividedBy(guaranteedUnitMakerAssetAmount)
                    .times(affiliateFee.buyTokenPercentageFee + 1)
                    .decimalPlaces(buyTokenDecimals);
            return {
                price,
                guaranteedPrice,
            };
        });
    }
}
exports.SwapService = SwapService;
// tslint:disable:max-file-line-count
//# sourceMappingURL=swap_service.js.map