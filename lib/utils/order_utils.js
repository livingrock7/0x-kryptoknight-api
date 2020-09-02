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
exports.orderUtils = void 0;
const order_utils_1 = require("@0x/order-utils");
const types_1 = require("@0x/types");
const utils_1 = require("@0x/utils");
const config_1 = require("../config");
const constants_1 = require("../constants");
const entities_1 = require("../entities");
const logger_1 = require("../logger");
const queries = require("../queries/staking_queries");
const result_cache_1 = require("./result_cache");
const DEFAULT_ERC721_ASSET = {
    minAmount: new utils_1.BigNumber(0),
    maxAmount: new utils_1.BigNumber(1),
    precision: 0,
};
const DEFAULT_ERC20_ASSET = {
    minAmount: new utils_1.BigNumber(0),
    maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: config_1.DEFAULT_ERC20_TOKEN_PRECISION,
};
const DEFAULT_ERC1155_ASSET = {
    minAmount: new utils_1.BigNumber(0),
    maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: 0,
};
const DEFAULT_MULTIASSET = {
    minAmount: new utils_1.BigNumber(0),
    maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: 0,
};
const DEFAULT_STATIC_CALL = {
    minAmount: new utils_1.BigNumber(1),
    maxAmount: constants_1.MAX_TOKEN_SUPPLY_POSSIBLE,
    precision: 0,
};
const proxyIdToDefaults = {
    [types_1.AssetProxyId.ERC20]: DEFAULT_ERC20_ASSET,
    [types_1.AssetProxyId.ERC721]: DEFAULT_ERC721_ASSET,
    [types_1.AssetProxyId.ERC1155]: DEFAULT_ERC1155_ASSET,
    [types_1.AssetProxyId.MultiAsset]: DEFAULT_MULTIASSET,
    [types_1.AssetProxyId.StaticCall]: DEFAULT_STATIC_CALL,
    [types_1.AssetProxyId.ERC20Bridge]: DEFAULT_ERC20_ASSET,
};
const assetDataToAsset = (assetData) => {
    const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
    const defaultAsset = proxyIdToDefaults[decodedAssetData.assetProxyId];
    if (defaultAsset === undefined) {
        throw utils_1.errorUtils.spawnSwitchErr('assetProxyId', decodedAssetData.assetProxyId);
    }
    return Object.assign(Object.assign({}, defaultAsset), { assetData }); // tslint:disable-line:no-object-literal-type-assertion
};
// Cache the expensive query of current epoch stats
let PIN_CACHE;
const getEpochStatsAsync = (connection) => __awaiter(void 0, void 0, void 0, function* () {
    if (!PIN_CACHE) {
        PIN_CACHE = result_cache_1.createResultCache(() => connection.query(queries.currentEpochPoolsStatsQuery), constants_1.TEN_MINUTES_MS);
    }
    return (yield PIN_CACHE.getResultAsync()).result;
});
exports.orderUtils = {
    isIgnoredOrder: (addressesToIgnore, apiOrder) => {
        return (addressesToIgnore.includes(apiOrder.order.makerAddress) ||
            exports.orderUtils.includesTokenAddresses(apiOrder.order.makerAssetData, addressesToIgnore) ||
            exports.orderUtils.includesTokenAddresses(apiOrder.order.takerAssetData, addressesToIgnore));
    },
    isMultiAssetData: (decodedAssetData) => {
        return decodedAssetData.assetProxyId === types_1.AssetProxyId.MultiAsset;
    },
    isStaticCallAssetData: (decodedAssetData) => {
        return decodedAssetData.assetProxyId === types_1.AssetProxyId.StaticCall;
    },
    isBridgeAssetData: (decodedAssetData) => {
        return decodedAssetData.assetProxyId === types_1.AssetProxyId.ERC20Bridge;
    },
    isTokenAssetData: (decodedAssetData) => {
        switch (decodedAssetData.assetProxyId) {
            case types_1.AssetProxyId.ERC1155:
            case types_1.AssetProxyId.ERC721:
            case types_1.AssetProxyId.ERC20:
                return true;
            default:
                return false;
        }
    },
    isFreshOrder: (apiOrder, expirationBufferSeconds = config_1.SRA_ORDER_EXPIRATION_BUFFER_SECONDS) => {
        const dateNowSeconds = Date.now() / constants_1.ONE_SECOND_MS;
        return apiOrder.order.expirationTimeSeconds.toNumber() > dateNowSeconds + expirationBufferSeconds;
    },
    groupByFreshness: (apiOrders, expirationBufferSeconds) => {
        const accumulator = { fresh: [], expired: [] };
        for (const order of apiOrders) {
            exports.orderUtils.isFreshOrder(order, expirationBufferSeconds)
                ? accumulator.fresh.push(order)
                : accumulator.expired.push(order);
        }
        return accumulator;
    },
    compareAskOrder: (orderA, orderB) => {
        const orderAPrice = orderA.takerAssetAmount.div(orderA.makerAssetAmount);
        const orderBPrice = orderB.takerAssetAmount.div(orderB.makerAssetAmount);
        if (!orderAPrice.isEqualTo(orderBPrice)) {
            return orderAPrice.comparedTo(orderBPrice);
        }
        return exports.orderUtils.compareOrderByFeeRatio(orderA, orderB);
    },
    compareBidOrder: (orderA, orderB) => {
        const orderAPrice = orderA.makerAssetAmount.div(orderA.takerAssetAmount);
        const orderBPrice = orderB.makerAssetAmount.div(orderB.takerAssetAmount);
        if (!orderAPrice.isEqualTo(orderBPrice)) {
            return orderBPrice.comparedTo(orderAPrice);
        }
        return exports.orderUtils.compareOrderByFeeRatio(orderA, orderB);
    },
    compareOrderByFeeRatio: (orderA, orderB) => {
        const orderAFeePrice = orderA.takerFee.div(orderA.takerAssetAmount);
        const orderBFeePrice = orderB.takerFee.div(orderB.takerAssetAmount);
        if (!orderAFeePrice.isEqualTo(orderBFeePrice)) {
            return orderBFeePrice.comparedTo(orderAFeePrice);
        }
        return orderA.expirationTimeSeconds.comparedTo(orderB.expirationTimeSeconds);
    },
    includesTokenAddresses: (assetData, tokenAddresses) => {
        const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (exports.orderUtils.isMultiAssetData(decodedAssetData)) {
            for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
                if (exports.orderUtils.includesTokenAddresses(nestedAssetDataElement, tokenAddresses)) {
                    return true;
                }
            }
            return false;
        }
        else if (exports.orderUtils.isTokenAssetData(decodedAssetData)) {
            return tokenAddresses.find(a => a === decodedAssetData.tokenAddress) !== undefined;
        }
        return false;
    },
    includesTokenAddress: (assetData, tokenAddress) => {
        return exports.orderUtils.includesTokenAddresses(assetData, [tokenAddress]);
    },
    deserializeOrder: (signedOrderEntity) => {
        const signedOrder = {
            signature: signedOrderEntity.signature,
            senderAddress: signedOrderEntity.senderAddress,
            makerAddress: signedOrderEntity.makerAddress,
            takerAddress: signedOrderEntity.takerAddress,
            makerFee: new utils_1.BigNumber(signedOrderEntity.makerFee),
            takerFee: new utils_1.BigNumber(signedOrderEntity.takerFee),
            makerAssetAmount: new utils_1.BigNumber(signedOrderEntity.makerAssetAmount),
            takerAssetAmount: new utils_1.BigNumber(signedOrderEntity.takerAssetAmount),
            makerAssetData: signedOrderEntity.makerAssetData,
            takerAssetData: signedOrderEntity.takerAssetData,
            salt: new utils_1.BigNumber(signedOrderEntity.salt),
            exchangeAddress: signedOrderEntity.exchangeAddress,
            feeRecipientAddress: signedOrderEntity.feeRecipientAddress,
            expirationTimeSeconds: new utils_1.BigNumber(signedOrderEntity.expirationTimeSeconds),
            makerFeeAssetData: signedOrderEntity.makerFeeAssetData,
            chainId: config_1.CHAIN_ID,
            takerFeeAssetData: signedOrderEntity.takerFeeAssetData,
        };
        return signedOrder;
    },
    deserializeOrderToAPIOrder: (signedOrderEntity) => {
        const order = exports.orderUtils.deserializeOrder(signedOrderEntity);
        const apiOrder = {
            order,
            metaData: {
                orderHash: signedOrderEntity.hash,
                remainingFillableTakerAssetAmount: signedOrderEntity.remainingFillableTakerAssetAmount,
            },
        };
        return apiOrder;
    },
    serializeOrder: (apiOrder) => {
        const signedOrder = apiOrder.order;
        const signedOrderEntity = new entities_1.SignedOrderEntity({
            signature: signedOrder.signature,
            senderAddress: signedOrder.senderAddress,
            makerAddress: signedOrder.makerAddress,
            takerAddress: signedOrder.takerAddress,
            makerAssetAmount: signedOrder.makerAssetAmount.toString(),
            takerAssetAmount: signedOrder.takerAssetAmount.toString(),
            makerAssetData: signedOrder.makerAssetData,
            takerAssetData: signedOrder.takerAssetData,
            makerFee: signedOrder.makerFee.toString(),
            takerFee: signedOrder.takerFee.toString(),
            makerFeeAssetData: signedOrder.makerFeeAssetData.toString(),
            takerFeeAssetData: signedOrder.takerFeeAssetData.toString(),
            salt: signedOrder.salt.toString(),
            exchangeAddress: signedOrder.exchangeAddress,
            feeRecipientAddress: signedOrder.feeRecipientAddress,
            expirationTimeSeconds: signedOrder.expirationTimeSeconds.toString(),
            hash: apiOrder.metaData.orderHash,
            remainingFillableTakerAssetAmount: apiOrder.metaData.remainingFillableTakerAssetAmount.toString(),
        });
        return signedOrderEntity;
    },
    signedOrderToAssetPair: (signedOrder) => {
        return {
            assetDataA: assetDataToAsset(signedOrder.makerAssetData),
            assetDataB: assetDataToAsset(signedOrder.takerAssetData),
        };
    },
    getOrderConfig: (_order) => {
        const normalizedFeeRecipient = config_1.FEE_RECIPIENT_ADDRESS.toLowerCase();
        const orderConfigResponse = {
            senderAddress: constants_1.NULL_ADDRESS,
            feeRecipientAddress: normalizedFeeRecipient,
            makerFee: config_1.MAKER_FEE_UNIT_AMOUNT,
            takerFee: config_1.TAKER_FEE_UNIT_AMOUNT,
            makerFeeAssetData: config_1.MAKER_FEE_ASSET_DATA,
            takerFeeAssetData: config_1.TAKER_FEE_ASSET_DATA,
        };
        return orderConfigResponse;
    },
    filterOrders: (apiOrders, filters) => {
        let filteredOrders = apiOrders;
        const { traderAddress, makerAssetAddress, takerAssetAddress, makerAssetProxyId, takerAssetProxyId } = filters;
        if (traderAddress) {
            filteredOrders = filteredOrders.filter(apiOrder => apiOrder.order.makerAddress === traderAddress || apiOrder.order.takerAddress === traderAddress);
        }
        if (makerAssetAddress) {
            filteredOrders = filteredOrders.filter(apiOrder => exports.orderUtils.includesTokenAddress(apiOrder.order.makerAssetData, makerAssetAddress));
        }
        if (takerAssetAddress) {
            filteredOrders = filteredOrders.filter(apiOrder => exports.orderUtils.includesTokenAddress(apiOrder.order.takerAssetData, takerAssetAddress));
        }
        if (makerAssetProxyId) {
            filteredOrders = filteredOrders.filter(apiOrder => order_utils_1.assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.makerAssetData).assetProxyId ===
                makerAssetProxyId);
        }
        if (takerAssetProxyId) {
            filteredOrders = filteredOrders.filter(apiOrder => order_utils_1.assetDataUtils.decodeAssetDataOrThrow(apiOrder.order.takerAssetData).assetProxyId ===
                takerAssetProxyId);
        }
        return filteredOrders;
    },
    // splitOrdersByPinning splits the orders into those we wish to pin in our Mesh node and
    // those we wish not to pin. We wish to pin the orders of MMers with a lot of ZRX at stake and
    // who have a track record of acting benevolently.
    splitOrdersByPinningAsync(connection, signedOrders) {
        return __awaiter(this, void 0, void 0, function* () {
            let currentPoolStats = [];
            // HACK(jalextowle): This query will fail when running against Ganache, so we
            // skip it an only use pinned MMers. A deployed staking system that allows this
            // functionality to be tested would improve the testing infrastructure.
            try {
                currentPoolStats = (yield getEpochStatsAsync(connection)) || [];
            }
            catch (error) {
                logger_1.logger.warn(`currentEpochPoolsStatsQuery threw an error: ${error}`);
            }
            let makerAddresses = config_1.PINNED_MM_ADDRESSES;
            currentPoolStats.forEach((poolStats) => {
                if (!config_1.PINNED_POOL_IDS.includes(poolStats.pool_id)) {
                    return;
                }
                makerAddresses = [...makerAddresses, ...poolStats.maker_addresses];
            });
            const pinResult = {
                pin: [],
                doNotPin: [],
            };
            signedOrders.forEach(signedOrder => {
                if (makerAddresses.includes(signedOrder.makerAddress)) {
                    pinResult.pin.push(signedOrder);
                }
                else {
                    pinResult.doNotPin.push(signedOrder);
                }
            });
            return pinResult;
        });
    },
};
//# sourceMappingURL=order_utils.js.map