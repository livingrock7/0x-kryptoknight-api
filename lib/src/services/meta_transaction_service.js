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
exports.MetaTransactionService = void 0;
const asset_swapper_1 = require("@0x/asset-swapper");
const contract_wrappers_1 = require("@0x/contract-wrappers");
const contracts_dev_utils_1 = require("@0x/contracts-dev-utils");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const utils_2 = require("@0x/web3-wrapper/lib/src/utils");
const config_1 = require("../config");
const constants_1 = require("../constants");
const entities_1 = require("../entities");
const logger_1 = require("../logger");
const types_1 = require("../types");
const gas_station_utils_1 = require("../utils/gas_station_utils");
const quote_report_utils_1 = require("../utils/quote_report_utils");
const service_utils_1 = require("../utils/service_utils");
const utils_3 = require("../utils/utils");
class MetaTransactionService {
    constructor(orderbook, provider, dbConnection, contractAddresses) {
        this._provider = provider;
        const swapQuoterOpts = Object.assign(Object.assign({}, config_1.SWAP_QUOTER_OPTS), { rfqt: Object.assign(Object.assign({}, config_1.SWAP_QUOTER_OPTS.rfqt), { warningLogger: logger_1.logger.warn.bind(logger_1.logger), infoLogger: logger_1.logger.info.bind(logger_1.logger) }), contractAddresses });
        this._swapQuoter = new asset_swapper_1.SwapQuoter(this._provider, orderbook, swapQuoterOpts);
        this._contractWrappers = new contract_wrappers_1.ContractWrappers(this._provider, { chainId: config_1.CHAIN_ID, contractAddresses });
        this._web3Wrapper = new web3_wrapper_1.Web3Wrapper(this._provider);
        this._devUtils = new contracts_dev_utils_1.DevUtilsContract(this._contractWrappers.contractAddresses.devUtils, this._provider);
        this._connection = dbConnection;
        this._transactionEntityRepository = this._connection.getRepository(entities_1.TransactionEntity);
        this._kvRepository = this._connection.getRepository(entities_1.KeyValueEntity);
        this._contractAddresses = contractAddresses;
    }
    static isEligibleForFreeMetaTxn(apiKey) {
        return config_1.META_TXN_SUBMIT_WHITELISTED_API_KEYS.includes(apiKey);
    }
    static _calculateProtocolFee(numOrders, gasPrice) {
        return new utils_1.BigNumber(70000).times(gasPrice).times(numOrders);
    }
    calculateMetaTransactionPriceAsync(params, endpoint) {
        return __awaiter(this, void 0, void 0, function* () {
            const { takerAddress, sellAmount, buyAmount, buyTokenAddress, sellTokenAddress, slippagePercentage, excludedSources, apiKey, } = params;
            let _rfqt;
            if (apiKey !== undefined) {
                _rfqt = {
                    intentOnFilling: endpoint === 'quote',
                    isIndicative: endpoint === 'price',
                    apiKey,
                    takerAddress,
                };
            }
            const assetSwapperOpts = Object.assign(Object.assign({}, config_1.ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS), { bridgeSlippage: slippagePercentage, excludedSources: config_1.ASSET_SWAPPER_MARKET_ORDERS_V0_OPTS.excludedSources.concat(...(excludedSources || [])), rfqt: _rfqt });
            let swapQuote;
            if (sellAmount !== undefined) {
                swapQuote = yield this._swapQuoter.getMarketSellSwapQuoteAsync(buyTokenAddress, sellTokenAddress, sellAmount, assetSwapperOpts);
            }
            else if (buyAmount !== undefined) {
                swapQuote = yield this._swapQuoter.getMarketBuySwapQuoteAsync(buyTokenAddress, sellTokenAddress, buyAmount, assetSwapperOpts);
            }
            else {
                throw new Error('sellAmount or buyAmount required');
            }
            const { gasPrice, quoteReport } = swapQuote;
            const { gas, protocolFeeInWeiAmount: protocolFee } = swapQuote.worstCaseQuoteInfo;
            const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
            const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;
            const buyTokenDecimals = yield service_utils_1.serviceUtils.fetchTokenDecimalsIfRequiredAsync(buyTokenAddress, this._web3Wrapper);
            const sellTokenDecimals = yield service_utils_1.serviceUtils.fetchTokenDecimalsIfRequiredAsync(sellTokenAddress, this._web3Wrapper);
            const unitMakerAssetAmount = web3_wrapper_1.Web3Wrapper.toUnitAmount(makerAssetAmount, buyTokenDecimals);
            const unitTakerAssetAMount = web3_wrapper_1.Web3Wrapper.toUnitAmount(totalTakerAssetAmount, sellTokenDecimals);
            const price = buyAmount === undefined
                ? unitMakerAssetAmount.dividedBy(unitTakerAssetAMount).decimalPlaces(sellTokenDecimals)
                : unitTakerAssetAMount.dividedBy(unitMakerAssetAmount).decimalPlaces(buyTokenDecimals);
            const allowanceTarget = this._contractAddresses.erc20Proxy;
            const response = {
                takerAddress,
                buyAmount: makerAssetAmount,
                sellAmount: totalTakerAssetAmount,
                price,
                swapQuote,
                sources: service_utils_1.serviceUtils.convertSourceBreakdownToArray(swapQuote.sourceBreakdown),
                estimatedGas: new utils_1.BigNumber(gas),
                gasPrice,
                protocolFee,
                minimumProtocolFee: protocolFee,
                allowanceTarget,
                quoteReport,
            };
            return response;
        });
    }
    calculateMetaTransactionQuoteAsync(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { takerAddress, sellAmount, buyAmount, swapQuote, price, estimatedGas, protocolFee, minimumProtocolFee, quoteReport, } = yield this.calculateMetaTransactionPriceAsync(params, 'quote');
            const floatGasPrice = swapQuote.gasPrice;
            const gasPrice = floatGasPrice
                .div(constants_1.ONE_GWEI)
                .integerValue(utils_1.BigNumber.ROUND_UP)
                .times(constants_1.ONE_GWEI);
            const attributedSwapQuote = service_utils_1.serviceUtils.attributeSwapQuoteOrders(swapQuote);
            const { orders, sourceBreakdown } = attributedSwapQuote;
            const signatures = orders.map(order => order.signature);
            const zeroExTransaction = this._generateZeroExTransaction(orders, sellAmount, buyAmount, signatures, takerAddress, gasPrice);
            // use the DevUtils contract to generate the transaction hash
            const zeroExTransactionHash = yield this._devUtils
                .getTransactionHash(zeroExTransaction, new utils_1.BigNumber(config_1.CHAIN_ID), this._contractWrappers.contractAddresses.exchange)
                .callAsync();
            // log quote report and associate with txn hash if this is an RFQT firm quote
            if (quoteReport) {
                quote_report_utils_1.quoteReportUtils.logQuoteReport({ submissionBy: 'metaTxn', quoteReport, zeroExTransactionHash });
            }
            const makerAssetAmount = swapQuote.bestCaseQuoteInfo.makerAssetAmount;
            const totalTakerAssetAmount = swapQuote.bestCaseQuoteInfo.totalTakerAssetAmount;
            const allowanceTarget = this._contractAddresses.erc20Proxy;
            const apiMetaTransactionQuote = {
                price,
                sellTokenAddress: params.sellTokenAddress,
                buyTokenAddress: params.buyTokenAddress,
                zeroExTransactionHash,
                zeroExTransaction,
                buyAmount: makerAssetAmount,
                sellAmount: totalTakerAssetAmount,
                orders: service_utils_1.serviceUtils.cleanSignedOrderFields(orders),
                sources: service_utils_1.serviceUtils.convertSourceBreakdownToArray(sourceBreakdown),
                gasPrice,
                estimatedGas,
                gas: estimatedGas,
                protocolFee,
                minimumProtocolFee,
                estimatedGasTokenRefund: constants_1.ZERO,
                value: protocolFee,
                allowanceTarget,
            };
            return apiMetaTransactionQuote;
        });
    }
    findTransactionByHashAsync(refHash) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._transactionEntityRepository.findOne({
                where: [{ refHash }, { txHash: refHash }],
            });
        });
    }
    validateZeroExTransactionFillAsync(zeroExTransaction, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify 0x txn won't expire in next 60 seconds
            const sixtySecondsFromNow = new utils_1.BigNumber(Date.now() + constants_1.ONE_MINUTE_MS).dividedBy(constants_1.ONE_SECOND_MS);
            if (zeroExTransaction.expirationTimeSeconds.lte(sixtySecondsFromNow)) {
                throw new Error('zeroExTransaction expirationTimeSeconds in less than 60 seconds from now');
            }
            const [, orders] = yield this._devUtils.decodeZeroExTransactionData(zeroExTransaction.data).callAsync();
            const gasPrice = zeroExTransaction.gasPrice;
            const currentFastGasPrice = yield gas_station_utils_1.ethGasStationUtils.getGasPriceOrThrowAsync();
            // Make sure gasPrice is not 3X the current fast EthGasStation gas price
            // tslint:disable-next-line:custom-no-magic-numbers
            if (currentFastGasPrice.lt(gasPrice) && gasPrice.minus(currentFastGasPrice).gte(currentFastGasPrice.times(3))) {
                throw new Error('Gas price too high');
            }
            const protocolFee = MetaTransactionService._calculateProtocolFee(orders.length, gasPrice);
            try {
                yield this._contractWrappers.exchange.executeTransaction(zeroExTransaction, signature).callAsync({
                    from: constants_1.PUBLIC_ADDRESS_FOR_ETH_CALLS,
                    gasPrice,
                    value: protocolFee,
                    gas: constants_1.DEFAULT_VALIDATION_GAS_LIMIT,
                });
            }
            catch (err) {
                // we reach into the underlying revert and throw it instead of
                // catching it at the MetaTransactionHandler level to provide more
                // information.
                if (err.values && err.values.errorData && err.values.errorData !== '0x') {
                    const decodedCallData = utils_1.RevertError.decode(err.values.errorData, false);
                    throw decodedCallData;
                }
                throw err;
            }
            return protocolFee;
        });
    }
    getZeroExTransactionHashFromZeroExTransactionAsync(zeroExTransaction) {
        return __awaiter(this, void 0, void 0, function* () {
            return this._devUtils
                .getTransactionHash(zeroExTransaction, new utils_1.BigNumber(config_1.CHAIN_ID), this._contractWrappers.contractAddresses.exchange)
                .callAsync();
        });
    }
    generatePartialExecuteTransactionEthereumTransactionAsync(zeroExTransaction, signature, protocolFee) {
        return __awaiter(this, void 0, void 0, function* () {
            const gasPrice = zeroExTransaction.gasPrice;
            const gas = yield this._contractWrappers.exchange
                .executeTransaction(zeroExTransaction, signature)
                .estimateGasAsync({
                from: constants_1.PUBLIC_ADDRESS_FOR_ETH_CALLS,
                gasPrice,
                value: protocolFee,
            });
            const executeTxnCalldata = this._contractWrappers.exchange
                .executeTransaction(zeroExTransaction, signature)
                .getABIEncodedTransactionData();
            const ethereumTxnParams = {
                data: executeTxnCalldata,
                gas: utils_2.utils.encodeAmountAsHexString(gas),
                gasPrice: utils_2.utils.encodeAmountAsHexString(gasPrice),
                value: utils_2.utils.encodeAmountAsHexString(protocolFee),
                to: this._contractWrappers.exchange.address,
                chainId: config_1.CHAIN_ID,
                // NOTE we arent returning nonce and from fields back to the user
                nonce: '',
                from: '',
            };
            return ethereumTxnParams;
        });
    }
    submitZeroExTransactionAsync(zeroExTransactionHash, zeroExTransaction, signature, protocolFee, apiKey, affiliateAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = service_utils_1.serviceUtils.attributeCallData(this._contractWrappers.exchange
                .executeTransaction(zeroExTransaction, signature)
                .getABIEncodedTransactionData(), affiliateAddress);
            const transactionEntity = entities_1.TransactionEntity.make({
                refHash: zeroExTransactionHash,
                status: types_1.TransactionStates.Unsubmitted,
                takerAddress: zeroExTransaction.signerAddress,
                to: this._contractWrappers.exchange.address,
                data: data.affiliatedData,
                value: protocolFee,
                apiKey,
                gasPrice: zeroExTransaction.gasPrice,
                expectedMinedInSec: config_1.META_TXN_RELAY_EXPECTED_MINED_SEC,
            });
            yield this._transactionEntityRepository.save(transactionEntity);
            const { ethereumTransactionHash } = yield this._waitUntilTxHashAsync(transactionEntity);
            return {
                ethereumTransactionHash,
                zeroExTransactionHash,
            };
        });
    }
    isSignerLiveAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const statusKV = yield this._kvRepository.findOne(constants_1.SIGNER_STATUS_DB_KEY);
            if (utils_3.utils.isNil(statusKV) || utils_3.utils.isNil(statusKV.value)) {
                logger_1.logger.error({
                    message: `signer status entry is not present in the database`,
                });
                return false;
            }
            const signerStatus = JSON.parse(statusKV.value);
            const hasUpdatedRecently = !utils_3.utils.isNil(statusKV.updatedAt) && statusKV.updatedAt.getTime() > Date.now() - constants_1.TEN_MINUTES_MS;
            // tslint:disable-next-line:no-boolean-literal-compare
            return signerStatus.live === true && hasUpdatedRecently;
        });
    }
    _waitUntilTxHashAsync(txEntity) {
        return __awaiter(this, void 0, void 0, function* () {
            return utils_3.utils.runWithTimeout(() => __awaiter(this, void 0, void 0, function* () {
                while (true) {
                    const tx = yield this._transactionEntityRepository.findOne(txEntity.refHash);
                    if (!utils_3.utils.isNil(tx) && !utils_3.utils.isNil(tx.txHash) && !utils_3.utils.isNil(tx.data)) {
                        return { ethereumTransactionHash: tx.txHash };
                    }
                    yield utils_3.utils.delayAsync(constants_1.SUBMITTED_TX_DB_POLLING_INTERVAL_MS);
                }
            }), constants_1.TX_HASH_RESPONSE_WAIT_TIME_MS);
        });
    }
    _generateZeroExTransaction(orders, sellAmount, buyAmount, signatures, takerAddress, gasPrice) {
        // generate txData for marketSellOrdersFillOrKill or marketBuyOrdersFillOrKill
        let txData;
        if (sellAmount !== undefined) {
            txData = this._contractWrappers.exchange
                .marketSellOrdersFillOrKill(orders, sellAmount, signatures)
                .getABIEncodedTransactionData();
        }
        else if (buyAmount !== undefined) {
            txData = this._contractWrappers.exchange
                .marketBuyOrdersFillOrKill(orders, buyAmount, signatures)
                .getABIEncodedTransactionData();
        }
        else {
            throw new Error('sellAmount or buyAmount required');
        }
        // generate the zeroExTransaction object
        const expirationTimeSeconds = new utils_1.BigNumber(Date.now() + constants_1.TEN_MINUTES_MS)
            .div(constants_1.ONE_SECOND_MS)
            .integerValue(utils_1.BigNumber.ROUND_CEIL);
        const zeroExTransaction = {
            data: txData,
            salt: order_utils_1.generatePseudoRandomSalt(),
            signerAddress: takerAddress,
            gasPrice,
            expirationTimeSeconds,
            domain: {
                chainId: config_1.CHAIN_ID,
                verifyingContract: this._contractWrappers.contractAddresses.exchange,
            },
        };
        return zeroExTransaction;
    }
}
exports.MetaTransactionService = MetaTransactionService;
//# sourceMappingURL=meta_transaction_service.js.map