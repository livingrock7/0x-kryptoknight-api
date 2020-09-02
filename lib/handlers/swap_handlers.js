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
exports.SwapHandlers = void 0;
const asset_swapper_1 = require("@0x/asset-swapper");
const utils_1 = require("@0x/utils");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
const config_1 = require("../config");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const error_handling_1 = require("../middleware/error_handling");
const schemas_1 = require("../schemas/schemas");
const token_metadatas_for_networks_1 = require("../token_metadatas_for_networks");
const types_1 = require("../types");
const parse_utils_1 = require("../utils/parse_utils");
const schema_utils_1 = require("../utils/schema_utils");
const service_utils_1 = require("../utils/service_utils");
const token_metadata_utils_1 = require("../utils/token_metadata_utils");
const quote_report_utils_1 = require("./../utils/quote_report_utils");
class SwapHandlers {
    constructor(swapService) {
        this._swapService = swapService;
    }
    static rootAsync(_req, res) {
        const message = `This is the root of the Swap API. Visit ${constants_1.SWAP_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    getSwapQuoteAsync(swapVersion, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = parseGetSwapQuoteRequestParams(req, 'quote');
            const quote = yield this._calculateSwapQuoteAsync(params, swapVersion);
            if (params.rfqt !== undefined) {
                logger_1.logger.info({
                    firmQuoteServed: {
                        taker: params.takerAddress,
                        apiKey: params.apiKey,
                        buyToken: params.buyToken,
                        sellToken: params.sellToken,
                        buyAmount: params.buyAmount,
                        sellAmount: params.sellAmount,
                        makers: quote.orders.map(order => order.makerAddress),
                    },
                });
                if (quote.quoteReport && params.rfqt && params.rfqt.intentOnFilling) {
                    quote_report_utils_1.quoteReportUtils.logQuoteReport({
                        quoteReport: quote.quoteReport,
                        submissionBy: 'taker',
                        decodedUniqueId: quote.decodedUniqueId,
                    });
                }
            }
            const cleanedQuote = _.omit(quote, 'quoteReport', 'decodedUniqueId');
            res.status(HttpStatus.OK).send(cleanedQuote);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    getSwapTokensAsync(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const tokens = token_metadatas_for_networks_1.TokenMetadatasForChains.map(tm => ({
                symbol: tm.symbol,
                address: tm.tokenAddresses[config_1.CHAIN_ID],
                name: tm.name,
                decimals: tm.decimals,
            }));
            const filteredTokens = tokens.filter(t => t.address !== utils_1.NULL_ADDRESS);
            res.status(HttpStatus.OK).send({ records: filteredTokens });
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    getSwapPriceAsync(swapVersion, req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const params = parseGetSwapQuoteRequestParams(req, 'price');
            const quote = yield this._calculateSwapQuoteAsync(Object.assign(Object.assign({}, params), { skipValidation: true }), swapVersion);
            logger_1.logger.info({
                indicativeQuoteServed: {
                    taker: params.takerAddress,
                    apiKey: params.apiKey,
                    buyToken: params.buyToken,
                    sellToken: params.sellToken,
                    buyAmount: params.buyAmount,
                    sellAmount: params.sellAmount,
                    makers: quote.orders.map(o => o.makerAddress),
                },
            });
            const response = {
                price: quote.price,
                value: quote.value,
                gasPrice: quote.gasPrice,
                gas: quote.gas,
                estimatedGas: quote.estimatedGas,
                protocolFee: quote.protocolFee,
                minimumProtocolFee: quote.minimumProtocolFee,
                buyTokenAddress: quote.buyTokenAddress,
                buyAmount: quote.buyAmount,
                sellTokenAddress: quote.sellTokenAddress,
                sellAmount: quote.sellAmount,
                sources: quote.sources,
                estimatedGasTokenRefund: quote.estimatedGasTokenRefund,
                allowanceTarget: quote.allowanceTarget,
            };
            res.status(HttpStatus.OK).send(response);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    getTokenPricesAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const symbolOrAddress = req.query.sellToken || 'WETH';
            const baseAsset = token_metadata_utils_1.getTokenMetadataIfExists(symbolOrAddress, config_1.CHAIN_ID);
            if (!baseAsset) {
                throw new errors_1.ValidationError([
                    {
                        field: 'sellToken',
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                        reason: `Could not find token ${symbolOrAddress}`,
                    },
                ]);
            }
            const unitAmount = new utils_1.BigNumber(1);
            const records = yield this._swapService.getTokenPricesAsync(baseAsset, unitAmount);
            res.status(HttpStatus.OK).send({ records });
        });
    }
    getMarketDepthAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const makerToken = Object.assign({ decimals: constants_1.DEFAULT_TOKEN_DECIMALS, tokenAddress: req.query.buyToken }, token_metadata_utils_1.getTokenMetadataIfExists(req.query.buyToken, config_1.CHAIN_ID));
            const takerToken = Object.assign({ decimals: constants_1.DEFAULT_TOKEN_DECIMALS, tokenAddress: req.query.sellToken }, token_metadata_utils_1.getTokenMetadataIfExists(req.query.sellToken, config_1.CHAIN_ID));
            if (makerToken.tokenAddress === takerToken.tokenAddress) {
                throw new errors_1.ValidationError([
                    {
                        field: 'buyToken',
                        code: errors_1.ValidationErrorCodes.InvalidAddress,
                        reason: `Invalid pair ${takerToken.tokenAddress}/${makerToken.tokenAddress}`,
                    },
                ]);
            }
            const response = yield this._swapService.calculateMarketDepthAsync({
                buyToken: makerToken,
                sellToken: takerToken,
                sellAmount: new utils_1.BigNumber(req.query.sellAmount),
                // tslint:disable-next-line:radix custom-no-magic-numbers
                numSamples: req.query.numSamples ? parseInt(req.query.numSamples) : constants_1.MARKET_DEPTH_MAX_SAMPLES,
                sampleDistributionBase: req.query.sampleDistributionBase
                    ? parseFloat(req.query.sampleDistributionBase)
                    : constants_1.MARKET_DEPTH_DEFAULT_DISTRIBUTION,
                excludedSources: req.query.excludedSources === undefined
                    ? []
                    : parse_utils_1.parseUtils.parseStringArrForERC20BridgeSources(req.query.excludedSources.split(',')),
            });
            res.status(HttpStatus.OK).send(Object.assign(Object.assign({}, response), { buyToken: makerToken, sellToken: takerToken }));
        });
    }
    _calculateSwapQuoteAsync(params, swapVersion) {
        return __awaiter(this, void 0, void 0, function* () {
            const { sellToken, buyToken, sellAmount, buyAmount, takerAddress, slippagePercentage, gasPrice, excludedSources, affiliateAddress, rfqt, 
            // tslint:disable-next-line:boolean-naming
            skipValidation, apiKey, affiliateFee, } = params;
            const isETHSell = token_metadata_utils_1.isETHSymbol(sellToken);
            const isETHBuy = token_metadata_utils_1.isETHSymbol(buyToken);
            const sellTokenAddress = token_metadata_utils_1.findTokenAddressOrThrowApiError(sellToken, 'sellToken', config_1.CHAIN_ID);
            const buyTokenAddress = token_metadata_utils_1.findTokenAddressOrThrowApiError(buyToken, 'buyToken', config_1.CHAIN_ID);
            const isWrap = isETHSell && token_metadata_utils_1.isWETHSymbolOrAddress(buyToken, config_1.CHAIN_ID);
            const isUnwrap = token_metadata_utils_1.isWETHSymbolOrAddress(sellToken, config_1.CHAIN_ID) && isETHBuy;
            // if token addresses are the same but a unwrap or wrap operation is requested, ignore error
            if (!isUnwrap && !isWrap && sellTokenAddress === buyTokenAddress) {
                throw new errors_1.ValidationError(['buyToken', 'sellToken'].map(field => {
                    return {
                        field,
                        code: errors_1.ValidationErrorCodes.RequiredField,
                        reason: 'buyToken and sellToken must be different',
                    };
                }));
            }
            // if V0 (no ExchangeProxy) and buyToken is ETH, throw
            if (swapVersion === types_1.SwapVersion.V0 && !isUnwrap && token_metadata_utils_1.isETHSymbol(buyToken)) {
                throw new errors_1.ValidationError([
                    {
                        field: 'buyToken',
                        code: errors_1.ValidationErrorCodes.TokenNotSupported,
                        reason: "Buying ETH is unsupported (set to 'WETH' to received wrapped Ether)",
                    },
                ]);
            }
            if (swapVersion === types_1.SwapVersion.V0 && affiliateFee.buyTokenPercentageFee > 0) {
                throw new errors_1.ValidationError([
                    {
                        field: 'buyTokenPercentageFee',
                        code: errors_1.ValidationErrorCodes.UnsupportedOption,
                        reason: 'Affiliate fees are unsupported in v0',
                    },
                ]);
            }
            const calculateSwapQuoteParams = {
                buyTokenAddress,
                sellTokenAddress,
                buyAmount,
                sellAmount,
                from: takerAddress,
                isETHSell,
                isETHBuy,
                slippagePercentage,
                gasPrice,
                excludedSources,
                affiliateAddress,
                apiKey,
                rfqt: rfqt === undefined
                    ? undefined
                    : {
                        intentOnFilling: rfqt.intentOnFilling,
                        isIndicative: rfqt.isIndicative,
                        nativeExclusivelyRFQT: rfqt.nativeExclusivelyRFQT,
                    },
                skipValidation,
                swapVersion,
                affiliateFee,
            };
            try {
                let swapQuote;
                if (isUnwrap) {
                    swapQuote = yield this._swapService.getSwapQuoteForUnwrapAsync(calculateSwapQuoteParams);
                }
                else if (isWrap) {
                    swapQuote = yield this._swapService.getSwapQuoteForWrapAsync(calculateSwapQuoteParams);
                }
                else {
                    swapQuote = yield this._swapService.calculateSwapQuoteAsync(calculateSwapQuoteParams);
                }
                return swapQuote;
            }
            catch (e) {
                // If this is already a transformed error then just re-throw
                if (error_handling_1.isAPIError(e)) {
                    throw e;
                }
                // Wrap a Revert error as an API revert error
                if (error_handling_1.isRevertError(e)) {
                    throw new errors_1.RevertAPIError(e);
                }
                const errorMessage = e.message;
                // TODO AssetSwapper can throw raw Errors or InsufficientAssetLiquidityError
                if (errorMessage.startsWith(asset_swapper_1.SwapQuoterError.InsufficientAssetLiquidity) ||
                    errorMessage.startsWith('NO_OPTIMAL_PATH')) {
                    throw new errors_1.ValidationError([
                        {
                            field: buyAmount ? 'buyAmount' : 'sellAmount',
                            code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                            reason: asset_swapper_1.SwapQuoterError.InsufficientAssetLiquidity,
                        },
                    ]);
                }
                if (errorMessage.startsWith(asset_swapper_1.SwapQuoterError.AssetUnavailable)) {
                    throw new errors_1.ValidationError([
                        {
                            field: 'token',
                            code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                            reason: e.message,
                        },
                    ]);
                }
                logger_1.logger.info('Uncaught error', e);
                throw new errors_1.InternalServerError(e.message);
            }
        });
    }
}
exports.SwapHandlers = SwapHandlers;
const parseGetSwapQuoteRequestParams = (req, endpoint) => {
    // HACK typescript typing does not allow this valid json-schema
    schema_utils_1.schemaUtils.validateSchema(req.query, schemas_1.schemas.swapQuoteRequestSchema);
    const takerAddress = req.query.takerAddress;
    const sellToken = req.query.sellToken;
    const buyToken = req.query.buyToken;
    const sellAmount = req.query.sellAmount === undefined ? undefined : new utils_1.BigNumber(req.query.sellAmount);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new utils_1.BigNumber(req.query.buyAmount);
    const gasPrice = req.query.gasPrice === undefined ? undefined : new utils_1.BigNumber(req.query.gasPrice);
    const slippagePercentage = Number.parseFloat(req.query.slippagePercentage) || constants_1.DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE;
    if (slippagePercentage > 1) {
        throw new errors_1.ValidationError([
            {
                field: 'slippagePercentage',
                code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                reason: errors_1.ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }
    const feeRecipient = req.query.feeRecipient;
    const sellTokenPercentageFee = Number.parseFloat(req.query.sellTokenPercentageFee) || 0;
    const buyTokenPercentageFee = Number.parseFloat(req.query.buyTokenPercentageFee) || 0;
    if (sellTokenPercentageFee > 0) {
        throw new errors_1.ValidationError([
            {
                field: 'sellTokenPercentageFee',
                code: errors_1.ValidationErrorCodes.UnsupportedOption,
                reason: errors_1.ValidationErrorReasons.ArgumentNotYetSupported,
            },
        ]);
    }
    if (buyTokenPercentageFee > 1) {
        throw new errors_1.ValidationError([
            {
                field: 'buyTokenPercentageFee',
                code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                reason: errors_1.ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }
    const affiliateFee = feeRecipient
        ? {
            recipient: feeRecipient,
            sellTokenPercentageFee,
            buyTokenPercentageFee,
        }
        : {
            recipient: utils_1.NULL_ADDRESS,
            sellTokenPercentageFee: 0,
            buyTokenPercentageFee: 0,
        };
    const apiKey = req.header('0x-api-key');
    // tslint:disable-next-line: boolean-naming
    const { excludedSources, nativeExclusivelyRFQT } = parse_utils_1.parseUtils.parseRequestForExcludedSources({
        excludedSources: req.query.excludedSources,
        includedSources: req.query.includedSources,
        intentOnFilling: req.query.intentOnFilling,
        takerAddress,
        apiKey,
    }, config_1.RFQT_API_KEY_WHITELIST, endpoint);
    // Determine if any other sources should be excluded
    const updatedExcludedSources = service_utils_1.serviceUtils.determineExcludedSources(excludedSources, apiKey, config_1.RFQT_API_KEY_WHITELIST);
    const affiliateAddress = req.query.affiliateAddress;
    const rfqt = takerAddress && apiKey
        ? {
            intentOnFilling: endpoint === 'quote' && req.query.intentOnFilling === 'true',
            isIndicative: endpoint === 'price',
            nativeExclusivelyRFQT,
        }
        : undefined;
    // tslint:disable-next-line:boolean-naming
    const skipValidation = req.query.skipValidation === undefined ? false : req.query.skipValidation === 'true';
    return {
        takerAddress,
        sellToken,
        buyToken,
        sellAmount,
        buyAmount,
        slippagePercentage,
        gasPrice,
        excludedSources: updatedExcludedSources,
        affiliateAddress,
        rfqt,
        skipValidation,
        apiKey,
        affiliateFee,
    };
};
//# sourceMappingURL=swap_handlers.js.map