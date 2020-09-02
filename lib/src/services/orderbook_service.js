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
exports.OrderBookService = void 0;
const _ = require("lodash");
const typeorm_1 = require("typeorm");
const config_1 = require("../config");
const entities_1 = require("../entities");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const mesh_utils_1 = require("../utils/mesh_utils");
const order_utils_1 = require("../utils/order_utils");
const pagination_utils_1 = require("../utils/pagination_utils");
class OrderBookService {
    constructor(connection, meshClient) {
        this._meshClient = meshClient;
        this._connection = connection;
    }
    getOrderByHashIfExistsAsync(orderHash) {
        return __awaiter(this, void 0, void 0, function* () {
            const signedOrderEntityIfExists = yield this._connection.manager.findOne(entities_1.SignedOrderEntity, orderHash);
            if (signedOrderEntityIfExists === undefined) {
                return undefined;
            }
            else {
                const deserializedOrder = order_utils_1.orderUtils.deserializeOrderToAPIOrder(signedOrderEntityIfExists);
                return deserializedOrder;
            }
        });
    }
    getAssetPairsAsync(page, perPage, assetDataA, assetDataB) {
        return __awaiter(this, void 0, void 0, function* () {
            const signedOrderEntities = (yield this._connection.manager.find(entities_1.SignedOrderEntity));
            const assetPairsItems = signedOrderEntities
                .map(order_utils_1.orderUtils.deserializeOrder)
                .map(order_utils_1.orderUtils.signedOrderToAssetPair);
            let nonPaginatedFilteredAssetPairs;
            if (assetDataA === undefined && assetDataB === undefined) {
                nonPaginatedFilteredAssetPairs = assetPairsItems;
            }
            else if (assetDataA !== undefined && assetDataB !== undefined) {
                const containsAssetDataAAndAssetDataB = (assetPair) => (assetPair.assetDataA.assetData === assetDataA && assetPair.assetDataB.assetData === assetDataB) ||
                    (assetPair.assetDataA.assetData === assetDataB && assetPair.assetDataB.assetData === assetDataA);
                nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetDataAAndAssetDataB);
            }
            else {
                const assetData = assetDataA || assetDataB;
                const containsAssetData = (assetPair) => assetPair.assetDataA.assetData === assetData || assetPair.assetDataB.assetData === assetData;
                nonPaginatedFilteredAssetPairs = assetPairsItems.filter(containsAssetData);
            }
            const uniqueNonPaginatedFilteredAssetPairs = _.uniqBy(nonPaginatedFilteredAssetPairs, assetPair => `${assetPair.assetDataA.assetData}/${assetPair.assetDataB.assetData}`);
            const paginatedFilteredAssetPairs = pagination_utils_1.paginationUtils.paginate(uniqueNonPaginatedFilteredAssetPairs, page, perPage);
            return paginatedFilteredAssetPairs;
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData) {
        return __awaiter(this, void 0, void 0, function* () {
            const orderEntities = yield this._connection.manager.find(entities_1.SignedOrderEntity, {
                where: {
                    takerAssetData: typeorm_1.In([baseAssetData, quoteAssetData]),
                    makerAssetData: typeorm_1.In([baseAssetData, quoteAssetData]),
                },
            });
            const bidSignedOrderEntities = orderEntities.filter(o => o.takerAssetData === baseAssetData && o.makerAssetData === quoteAssetData);
            const askSignedOrderEntities = orderEntities.filter(o => o.takerAssetData === quoteAssetData && o.makerAssetData === baseAssetData);
            const bidApiOrders = bidSignedOrderEntities
                .map(order_utils_1.orderUtils.deserializeOrderToAPIOrder)
                .filter(order_utils_1.orderUtils.isFreshOrder)
                .sort((orderA, orderB) => order_utils_1.orderUtils.compareBidOrder(orderA.order, orderB.order));
            const askApiOrders = askSignedOrderEntities
                .map(order_utils_1.orderUtils.deserializeOrderToAPIOrder)
                .filter(order_utils_1.orderUtils.isFreshOrder)
                .sort((orderA, orderB) => order_utils_1.orderUtils.compareAskOrder(orderA.order, orderB.order));
            const paginatedBidApiOrders = pagination_utils_1.paginationUtils.paginate(bidApiOrders, page, perPage);
            const paginatedAskApiOrders = pagination_utils_1.paginationUtils.paginate(askApiOrders, page, perPage);
            return {
                bids: paginatedBidApiOrders,
                asks: paginatedAskApiOrders,
            };
        });
    }
    // TODO:(leo) Do all filtering and pagination in a DB (requires stored procedures or redundant fields)
    // tslint:disable-next-line:prefer-function-over-method
    getOrdersAsync(page, perPage, ordersFilterParams) {
        return __awaiter(this, void 0, void 0, function* () {
            // Pre-filters
            const filterObjectWithValuesIfExist = {
                exchangeAddress: ordersFilterParams.exchangeAddress,
                senderAddress: ordersFilterParams.senderAddress,
                makerAssetData: ordersFilterParams.makerAssetData,
                takerAssetData: ordersFilterParams.takerAssetData,
                makerAddress: ordersFilterParams.makerAddress,
                takerAddress: ordersFilterParams.takerAddress,
                feeRecipientAddress: ordersFilterParams.feeRecipientAddress,
                makerFeeAssetData: ordersFilterParams.makerFeeAssetData,
                takerFeeAssetData: ordersFilterParams.takerFeeAssetData,
            };
            const filterObject = _.pickBy(filterObjectWithValuesIfExist, _.identity.bind(_));
            const signedOrderEntities = (yield this._connection.manager.find(entities_1.SignedOrderEntity, {
                where: filterObject,
            }));
            const apiOrders = signedOrderEntities.map(order_utils_1.orderUtils.deserializeOrderToAPIOrder);
            // check for expired orders
            const { fresh, expired } = order_utils_1.orderUtils.groupByFreshness(apiOrders, config_1.SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
            logger_1.alertOnExpiredOrders(expired);
            // Post-filters
            const filteredApiOrders = order_utils_1.orderUtils.filterOrders(fresh, ordersFilterParams);
            const paginatedApiOrders = pagination_utils_1.paginationUtils.paginate(filteredApiOrders, page, perPage);
            return paginatedApiOrders;
        });
    }
    getBatchOrdersAsync(page, perPage, makerAssetDatas, takerAssetDatas) {
        return __awaiter(this, void 0, void 0, function* () {
            const filterObject = {
                makerAssetData: typeorm_1.In(makerAssetDatas),
                takerAssetData: typeorm_1.In(takerAssetDatas),
            };
            const signedOrderEntities = (yield this._connection.manager.find(entities_1.SignedOrderEntity, {
                where: filterObject,
            }));
            const apiOrders = signedOrderEntities.map(order_utils_1.orderUtils.deserializeOrderToAPIOrder);
            // check for expired orders
            const { fresh, expired } = order_utils_1.orderUtils.groupByFreshness(apiOrders, config_1.SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
            logger_1.alertOnExpiredOrders(expired);
            const paginatedApiOrders = pagination_utils_1.paginationUtils.paginate(fresh, page, perPage);
            return paginatedApiOrders;
        });
    }
    addOrderAsync(signedOrder, pinned) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.addOrdersAsync([signedOrder], pinned);
        });
    }
    addOrdersAsync(signedOrders, pinned) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this._meshClient) {
                const { rejected } = yield this._meshClient.addOrdersAsync(signedOrders, pinned);
                if (rejected.length !== 0) {
                    const validationErrors = rejected.map((r, i) => ({
                        field: `signedOrder[${i}]`,
                        code: mesh_utils_1.meshUtils.rejectedCodeToSRACode(r.status.code),
                        reason: `${r.status.code}: ${r.status.message}`,
                    }));
                    throw new errors_1.ValidationError(validationErrors);
                }
                // Order Watcher Service will handle persistence
                return;
            }
            throw new Error('Could not add order to mesh.');
        });
    }
    splitOrdersByPinningAsync(signedOrders) {
        return __awaiter(this, void 0, void 0, function* () {
            return order_utils_1.orderUtils.splitOrdersByPinningAsync(this._connection, signedOrders);
        });
    }
}
exports.OrderBookService = OrderBookService;
//# sourceMappingURL=orderbook_service.js.map