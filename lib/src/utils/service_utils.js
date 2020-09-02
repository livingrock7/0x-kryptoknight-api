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
exports.serviceUtils = void 0;
const asset_swapper_1 = require("@0x/asset-swapper");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const _ = require("lodash");
const config_1 = require("../config");
const constants_1 = require("../constants");
const logger_1 = require("../logger");
const order_utils_2 = require("../utils/order_utils");
const token_metadata_utils_1 = require("../utils/token_metadata_utils");
const number_utils_1 = require("./number_utils");
exports.serviceUtils = {
    attributeSwapQuoteOrders(swapQuote) {
        // Where possible, attribute any fills of these orders to the Fee Recipient Address
        const attributedOrders = swapQuote.orders.map(o => {
            try {
                const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(o.makerAssetData);
                if (order_utils_2.orderUtils.isBridgeAssetData(decodedAssetData)) {
                    return Object.assign(Object.assign({}, o), { feeRecipientAddress: config_1.FEE_RECIPIENT_ADDRESS });
                }
                // tslint:disable-next-line:no-empty
            }
            catch (err) { }
            // Default to unmodified order
            return o;
        });
        const attributedSwapQuote = Object.assign(Object.assign({}, swapQuote), { orders: attributedOrders });
        return attributedSwapQuote;
    },
    attributeCallData(data, affiliateAddress) {
        const affiliateAddressOrDefault = affiliateAddress ? affiliateAddress : config_1.FEE_RECIPIENT_ADDRESS;
        const affiliateCallDataEncoder = new utils_1.AbiEncoder.Method({
            constant: true,
            outputs: [],
            name: 'ZeroExAPIAffiliate',
            inputs: [
                { name: 'affiliate', type: 'address' },
                { name: 'timestamp', type: 'uint256' },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
        });
        // Generate unique identiifer
        const timestampInSeconds = new utils_1.BigNumber(Date.now() / constants_1.ONE_SECOND_MS).integerValue();
        const hexTimestamp = timestampInSeconds.toString(constants_1.HEX_BASE);
        const randomNumber = number_utils_1.numberUtils.randomHexNumberOfLength(10);
        // Concatenate the hex identifier with the hex timestamp
        // In the final encoded call data, this will leave us with a 5-byte ID followed by
        // a 4-byte timestamp, and won't break parsers of the timestamp made prior to the
        // addition of the ID
        const uniqueIdentifier = new utils_1.BigNumber(`${randomNumber}${hexTimestamp}`, constants_1.HEX_BASE);
        // Encode additional call data and return
        const encodedAffiliateData = affiliateCallDataEncoder.encode([affiliateAddressOrDefault, uniqueIdentifier]);
        const affiliatedData = `${data}${encodedAffiliateData.slice(2)}`;
        return { affiliatedData, decodedUniqueId: `${randomNumber}-${timestampInSeconds}` };
    },
    // tslint:disable-next-line:prefer-function-over-method
    cleanSignedOrderFields(orders) {
        return orders.map(o => ({
            chainId: o.chainId,
            exchangeAddress: o.exchangeAddress,
            makerAddress: o.makerAddress,
            takerAddress: o.takerAddress,
            feeRecipientAddress: o.feeRecipientAddress,
            senderAddress: o.senderAddress,
            makerAssetAmount: o.makerAssetAmount,
            takerAssetAmount: o.takerAssetAmount,
            makerFee: o.makerFee,
            takerFee: o.takerFee,
            expirationTimeSeconds: o.expirationTimeSeconds,
            salt: o.salt,
            makerAssetData: o.makerAssetData,
            takerAssetData: o.takerAssetData,
            makerFeeAssetData: o.makerFeeAssetData,
            takerFeeAssetData: o.takerFeeAssetData,
            signature: o.signature,
        }));
    },
    fetchTokenDecimalsIfRequiredAsync(tokenAddress, web3Wrapper) {
        return __awaiter(this, void 0, void 0, function* () {
            // HACK(dekz): Our ERC20Wrapper does not have decimals as it is optional
            // so we must encode this ourselves
            let decimals = token_metadata_utils_1.findTokenDecimalsIfExists(tokenAddress, config_1.CHAIN_ID);
            if (!decimals) {
                const decimalsEncoder = new utils_1.AbiEncoder.Method({
                    constant: true,
                    inputs: [],
                    name: 'decimals',
                    outputs: [{ name: '', type: 'uint8' }],
                    payable: false,
                    stateMutability: 'view',
                    type: 'function',
                });
                const encodedCallData = decimalsEncoder.encode(tokenAddress);
                try {
                    const result = yield web3Wrapper.callAsync({ data: encodedCallData, to: tokenAddress });
                    decimals = decimalsEncoder.strictDecodeReturnValue(result);
                    logger_1.logger.info(`Unmapped token decimals ${tokenAddress} ${decimals}`);
                }
                catch (err) {
                    logger_1.logger.warn(`Error fetching token decimals ${tokenAddress}`);
                    decimals = constants_1.DEFAULT_TOKEN_DECIMALS;
                }
            }
            return decimals;
        });
    },
    /**
     * Returns a new list of excluded sources that may contain additional excluded sources that were determined to be excluded.
     * @param currentExcludedSources the current list of `excludedSources`
     * @param apiKey the `0x-api-key` that was passed into the headers
     * @param allowedApiKeys an array of eligible API keys
     * @returns a copy of `currentExcludedSources` which may include additional excluded sources
     */
    determineExcludedSources(currentExcludedSources, apiKey, allowedApiKeys) {
        const isAPIEnabled = allowedApiKeys.includes(apiKey);
        if (!isAPIEnabled && !currentExcludedSources.includes(asset_swapper_1.ERC20BridgeSource.LiquidityProvider)) {
            return currentExcludedSources.concat(asset_swapper_1.ERC20BridgeSource.LiquidityProvider);
        }
        return currentExcludedSources;
    },
    convertSourceBreakdownToArray(sourceBreakdown) {
        const defaultSourceBreakdown = Object.assign({}, ...Object.values(asset_swapper_1.ERC20BridgeSource).map(s => ({ [s]: constants_1.ZERO })));
        const breakdown = [];
        return Object.entries(Object.assign(Object.assign({}, defaultSourceBreakdown), sourceBreakdown)).reduce((acc, [source, percentage]) => {
            return [
                ...acc,
                {
                    name: source === asset_swapper_1.ERC20BridgeSource.Native ? '0x' : source,
                    proportion: new utils_1.BigNumber(percentage.toPrecision(constants_1.PERCENTAGE_SIG_DIGITS)),
                },
            ];
        }, breakdown);
    },
    getEstimatedGasTokenRefundInfo(orders, gasTokenBalance) {
        const bridgeFills = _.flatten(orders.map(order => order.fills)).filter(fill => fill.source !== asset_swapper_1.ERC20BridgeSource.Native);
        if (_.isEmpty(bridgeFills)) {
            return {
                usedGasTokens: 0,
                gasTokenRefund: constants_1.ZERO,
                gasTokenGasCost: constants_1.ZERO,
            };
        }
        const costOfBridgeFills = utils_1.BigNumber.sum(...bridgeFills.map(o => config_1.GAS_SCHEDULE_V0[o.source](o.fillData)))
            .plus(bridgeFills.length * constants_1.SSTORE_COST)
            .plus(constants_1.SSTORE_INIT_COST);
        const usedGasTokens = utils_1.BigNumber.min(gasTokenBalance, costOfBridgeFills
            .plus(constants_1.GST_INTERACTION_COST)
            .div(constants_1.GST_DIVISOR)
            .integerValue(utils_1.BigNumber.ROUND_DOWN));
        const gasTokenRefund = usedGasTokens.multipliedBy(constants_1.GAS_BURN_REFUND);
        const gasTokenGasCost = usedGasTokens.multipliedBy(constants_1.GAS_BURN_COST);
        return {
            usedGasTokens: usedGasTokens.toNumber(),
            gasTokenRefund,
            gasTokenGasCost,
        };
    },
    getAffiliateFeeAmounts(quote, fee) {
        const buyTokenFeeAmount = quote.worstCaseQuoteInfo.makerAssetAmount
            .times(fee.buyTokenPercentageFee)
            .dividedBy(fee.buyTokenPercentageFee + 1)
            .integerValue(utils_1.BigNumber.ROUND_DOWN);
        return {
            sellTokenFeeAmount: constants_1.ZERO,
            buyTokenFeeAmount,
            gasCost: buyTokenFeeAmount.isZero() ? constants_1.ZERO : constants_1.AFFILIATE_FEE_TRANSFORMER_GAS,
        };
    },
};
//# sourceMappingURL=service_utils.js.map