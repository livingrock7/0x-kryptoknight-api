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
exports.MetaTransactionHandlers = void 0;
const assert_1 = require("@0x/assert");
const asset_swapper_1 = require("@0x/asset-swapper");
const utils_1 = require("@0x/utils");
const HttpStatus = require("http-status-codes");
const isValidUUID = require("uuid-validate");
const config_1 = require("../config");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const error_handling_1 = require("../middleware/error_handling");
const schemas_1 = require("../schemas/schemas");
const meta_transaction_service_1 = require("../services/meta_transaction_service");
const parse_utils_1 = require("../utils/parse_utils");
const rate_limiters_1 = require("../utils/rate-limiters");
const schema_utils_1 = require("../utils/schema_utils");
const token_metadata_utils_1 = require("../utils/token_metadata_utils");
class MetaTransactionHandlers {
    constructor(metaTransactionService, rateLimiter) {
        this._metaTransactionService = metaTransactionService;
        this._rateLimiter = rateLimiter;
    }
    static rootAsync(_req, res) {
        const message = `This is the root of the Meta Transaction API. Visit ${constants_1.META_TRANSACTION_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    getQuoteAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = req.header(constants_1.API_KEY_HEADER);
            if (apiKey !== undefined && !isValidUUID(apiKey)) {
                res.status(HttpStatus.BAD_REQUEST).send({
                    code: errors_1.GeneralErrorCodes.InvalidAPIKey,
                    reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.InvalidAPIKey],
                });
                return;
            }
            // HACK typescript typing does not allow this valid json-schema
            schema_utils_1.schemaUtils.validateSchema(req.query, schemas_1.schemas.metaTransactionQuoteRequestSchema);
            // parse query params
            const { takerAddress, sellToken, buyToken, sellAmount, buyAmount, slippagePercentage, excludedSources, } = parseGetTransactionRequestParams(req);
            const sellTokenAddress = token_metadata_utils_1.findTokenAddressOrThrowApiError(sellToken, 'sellToken', config_1.CHAIN_ID);
            const buyTokenAddress = token_metadata_utils_1.findTokenAddressOrThrowApiError(buyToken, 'buyToken', config_1.CHAIN_ID);
            try {
                const metaTransactionQuote = yield this._metaTransactionService.calculateMetaTransactionQuoteAsync({
                    takerAddress,
                    buyTokenAddress,
                    sellTokenAddress,
                    buyAmount,
                    sellAmount,
                    from: takerAddress,
                    slippagePercentage,
                    excludedSources,
                    apiKey,
                });
                res.status(HttpStatus.OK).send(metaTransactionQuote);
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
    getPriceAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = req.header('0x-api-key');
            if (apiKey !== undefined && !isValidUUID(apiKey)) {
                res.status(HttpStatus.BAD_REQUEST).send({
                    code: errors_1.GeneralErrorCodes.InvalidAPIKey,
                    reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.InvalidAPIKey],
                });
                return;
            }
            // HACK typescript typing does not allow this valid json-schema
            schema_utils_1.schemaUtils.validateSchema(req.query, schemas_1.schemas.metaTransactionQuoteRequestSchema);
            // parse query params
            const { takerAddress, sellToken, buyToken, sellAmount, buyAmount, slippagePercentage, excludedSources, } = parseGetTransactionRequestParams(req);
            const sellTokenAddress = token_metadata_utils_1.findTokenAddressOrThrowApiError(sellToken, 'sellToken', config_1.CHAIN_ID);
            const buyTokenAddress = token_metadata_utils_1.findTokenAddressOrThrowApiError(buyToken, 'buyToken', config_1.CHAIN_ID);
            try {
                const metaTransactionPrice = yield this._metaTransactionService.calculateMetaTransactionPriceAsync({
                    takerAddress,
                    buyTokenAddress,
                    sellTokenAddress,
                    buyAmount,
                    sellAmount,
                    from: takerAddress,
                    slippagePercentage,
                    excludedSources,
                    apiKey,
                }, 'price');
                const metaTransactionPriceResponse = {
                    price: metaTransactionPrice.price,
                    buyAmount: metaTransactionPrice.buyAmount,
                    sellAmount: metaTransactionPrice.sellAmount,
                    sellTokenAddress,
                    buyTokenAddress,
                    sources: metaTransactionPrice.sources,
                    value: metaTransactionPrice.protocolFee,
                    gasPrice: metaTransactionPrice.gasPrice,
                    gas: metaTransactionPrice.estimatedGas,
                    estimatedGas: metaTransactionPrice.estimatedGas,
                    protocolFee: metaTransactionPrice.protocolFee,
                    minimumProtocolFee: metaTransactionPrice.minimumProtocolFee,
                    estimatedGasTokenRefund: constants_1.ZERO,
                    allowanceTarget: metaTransactionPrice.allowanceTarget,
                };
                res.status(HttpStatus.OK).send(metaTransactionPriceResponse);
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
    submitZeroExTransactionIfWhitelistedAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKey = req.header('0x-api-key');
            const affiliateAddress = req.query.affiliateAddress;
            if (apiKey !== undefined && !isValidUUID(apiKey)) {
                res.status(HttpStatus.BAD_REQUEST).send({
                    code: errors_1.GeneralErrorCodes.InvalidAPIKey,
                    reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.InvalidAPIKey],
                });
                return;
            }
            schema_utils_1.schemaUtils.validateSchema(req.body, schemas_1.schemas.metaTransactionFillRequestSchema);
            // parse the request body
            const { zeroExTransaction, signature } = parsePostTransactionRequestBody(req);
            const zeroExTransactionHash = yield this._metaTransactionService.getZeroExTransactionHashFromZeroExTransactionAsync(zeroExTransaction);
            const transactionInDatabase = yield this._metaTransactionService.findTransactionByHashAsync(zeroExTransactionHash);
            if (transactionInDatabase !== undefined) {
                // user attemps to submit a transaction already present in the database
                res.status(HttpStatus.OK).send(marshallTransactionEntity(transactionInDatabase));
                return;
            }
            try {
                const protocolFee = yield this._metaTransactionService.validateZeroExTransactionFillAsync(zeroExTransaction, signature);
                // If eligible for free txn relay, submit it, otherwise, return unsigned Ethereum txn
                if (apiKey !== undefined && meta_transaction_service_1.MetaTransactionService.isEligibleForFreeMetaTxn(apiKey)) {
                    // If Metatxn service is not live then we reject
                    const isLive = yield this._metaTransactionService.isSignerLiveAsync();
                    if (!isLive) {
                        res.status(HttpStatus.NOT_FOUND).send({
                            code: errors_1.GeneralErrorCodes.ServiceDisabled,
                            reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.ServiceDisabled],
                        });
                        return;
                    }
                    if (this._rateLimiter !== undefined) {
                        const rateLimitResponse = yield this._rateLimiter.isAllowedAsync({
                            apiKey,
                            takerAddress: zeroExTransaction.signerAddress,
                        });
                        if (rate_limiters_1.isRateLimitedMetaTransactionResponse(rateLimitResponse)) {
                            const ethereumTxn = yield this._metaTransactionService.generatePartialExecuteTransactionEthereumTransactionAsync(zeroExTransaction, signature, protocolFee);
                            res.status(HttpStatus.TOO_MANY_REQUESTS).send({
                                code: errors_1.GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker,
                                reason: rateLimitResponse.reason,
                                ethereumTransaction: {
                                    data: ethereumTxn.data,
                                    gasPrice: ethereumTxn.gasPrice,
                                    gas: ethereumTxn.gas,
                                    value: ethereumTxn.value,
                                    to: ethereumTxn.to,
                                },
                            });
                            return;
                        }
                    }
                    const { ethereumTransactionHash } = yield this._metaTransactionService.submitZeroExTransactionAsync(zeroExTransactionHash, zeroExTransaction, signature, protocolFee, apiKey, affiliateAddress);
                    res.status(HttpStatus.OK).send({
                        ethereumTransactionHash,
                        zeroExTransactionHash,
                    });
                }
                else {
                    const ethereumTxn = yield this._metaTransactionService.generatePartialExecuteTransactionEthereumTransactionAsync(zeroExTransaction, signature, protocolFee);
                    res.status(HttpStatus.FORBIDDEN).send({
                        code: errors_1.GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker,
                        reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.UnableToSubmitOnBehalfOfTaker],
                        ethereumTransaction: {
                            data: ethereumTxn.data,
                            gasPrice: ethereumTxn.gasPrice,
                            gas: ethereumTxn.gas,
                            value: ethereumTxn.value,
                            to: ethereumTxn.to,
                        },
                    });
                }
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
                logger_1.logger.info('Uncaught error', e);
                throw new errors_1.InternalServerError(e.message);
            }
        });
    }
    getTransactionStatusAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const transactionHash = req.params.txHash;
            try {
                assert_1.assert.isHexString('transactionHash', transactionHash);
            }
            catch (e) {
                throw new errors_1.ValidationError([
                    {
                        field: 'txHash',
                        code: errors_1.ValidationErrorCodes.InvalidSignatureOrHash,
                        reason: e.message,
                    },
                ]);
            }
            const tx = yield this._metaTransactionService.findTransactionByHashAsync(transactionHash);
            if (tx === undefined) {
                throw new errors_1.NotFoundError();
            }
            else {
                res.status(HttpStatus.OK).send(marshallTransactionEntity(tx));
            }
        });
    }
    getSignerStatusAsync(_req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const isLive = yield this._metaTransactionService.isSignerLiveAsync();
                res.status(HttpStatus.OK).send({ isLive });
            }
            catch (e) {
                logger_1.logger.error('Uncaught error: ', e);
                throw new errors_1.InternalServerError('failed to check signer status');
            }
        });
    }
}
exports.MetaTransactionHandlers = MetaTransactionHandlers;
const parseGetTransactionRequestParams = (req) => {
    const takerAddress = req.query.takerAddress;
    const sellToken = req.query.sellToken;
    const buyToken = req.query.buyToken;
    const sellAmount = req.query.sellAmount === undefined ? undefined : new utils_1.BigNumber(req.query.sellAmount);
    const buyAmount = req.query.buyAmount === undefined ? undefined : new utils_1.BigNumber(req.query.buyAmount);
    const slippagePercentage = parseFloat(req.query.slippagePercentage) || constants_1.DEFAULT_QUOTE_SLIPPAGE_PERCENTAGE;
    if (slippagePercentage > 1) {
        throw new errors_1.ValidationError([
            {
                field: 'slippagePercentage',
                code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                reason: errors_1.ValidationErrorReasons.PercentageOutOfRange,
            },
        ]);
    }
    const excludedSources = req.query.excludedSources === undefined
        ? undefined
        : parse_utils_1.parseUtils.parseStringArrForERC20BridgeSources(req.query.excludedSources.split(','));
    return { takerAddress, sellToken, buyToken, sellAmount, buyAmount, slippagePercentage, excludedSources };
};
const parsePostTransactionRequestBody = (req) => {
    const requestBody = req.body;
    const signature = requestBody.signature;
    const zeroExTransaction = {
        salt: new utils_1.BigNumber(requestBody.zeroExTransaction.salt),
        expirationTimeSeconds: new utils_1.BigNumber(requestBody.zeroExTransaction.expirationTimeSeconds),
        gasPrice: new utils_1.BigNumber(requestBody.zeroExTransaction.gasPrice),
        signerAddress: requestBody.zeroExTransaction.signerAddress,
        data: requestBody.zeroExTransaction.data,
    };
    return {
        zeroExTransaction,
        signature,
    };
};
const marshallTransactionEntity = (tx) => {
    return {
        refHash: tx.refHash,
        hash: tx.txHash,
        status: tx.status,
        gasPrice: tx.gasPrice,
        updatedAt: tx.updatedAt,
        blockNumber: tx.blockNumber,
        expectedMinedInSec: tx.expectedMinedInSec,
        ethereumTxStatus: tx.txStatus,
    };
};
//# sourceMappingURL=meta_transaction_handlers.js.map