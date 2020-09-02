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
exports.OrderStoreDbAdapter = void 0;
const asset_swapper_1 = require("@0x/asset-swapper");
const config_1 = require("../config");
const constants_1 = require("../constants");
const order_utils_1 = require("./order_utils");
const MAX_QUERY_SIZE = 1000;
class OrderStoreDbAdapter extends asset_swapper_1.OrderStore {
    constructor(orderbookService) {
        super();
        this._orderbookService = orderbookService;
    }
    getOrderSetForAssetsAsync(makerAssetData, takerAssetData) {
        return __awaiter(this, void 0, void 0, function* () {
            const assetPairKey = asset_swapper_1.OrderStore.getKeyForAssetPair(makerAssetData, takerAssetData);
            return this.getOrderSetForAssetPairAsync(assetPairKey);
        });
    }
    getOrderSetForAssetPairAsync(assetPairKey) {
        return __awaiter(this, void 0, void 0, function* () {
            const [assetA, assetB] = asset_swapper_1.OrderStore.assetPairKeyToAssets(assetPairKey);
            const { bids, asks } = yield this._orderbookService.getOrderBookAsync(constants_1.FIRST_PAGE, MAX_QUERY_SIZE, assetA, assetB);
            const orderSet = new asset_swapper_1.OrderSet();
            const allOrders = [...bids.records, ...asks.records];
            const allowedOrders = allOrders.filter(apiOrder => !order_utils_1.orderUtils.isIgnoredOrder(config_1.SWAP_IGNORED_ADDRESSES, apiOrder));
            yield orderSet.addManyAsync(allowedOrders);
            return orderSet;
        });
    }
    getBatchOrderSetsForAssetsAsync(makerAssetDatas, takerAssetDatas) {
        return __awaiter(this, void 0, void 0, function* () {
            const { records: apiOrders } = yield this._orderbookService.getBatchOrdersAsync(constants_1.FIRST_PAGE, MAX_QUERY_SIZE, makerAssetDatas, takerAssetDatas);
            const orderSets = {};
            makerAssetDatas.forEach(m => takerAssetDatas.forEach(t => (orderSets[asset_swapper_1.OrderStore.getKeyForAssetPair(m, t)] = new asset_swapper_1.OrderSet())));
            const allowedOrders = apiOrders.filter(apiOrder => !order_utils_1.orderUtils.isIgnoredOrder(config_1.SWAP_IGNORED_ADDRESSES, apiOrder));
            yield Promise.all(allowedOrders.map((o) => __awaiter(this, void 0, void 0, function* () { return orderSets[asset_swapper_1.OrderStore.getKeyForAssetPair(o.order.makerAssetData, o.order.takerAssetData)].addAsync(o); })));
            return Object.values(orderSets);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    hasAsync(_assetPairKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return true;
        });
    }
    valuesAsync(assetPairKey) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from((yield this.getOrderSetForAssetPairAsync(assetPairKey)).values());
        });
    }
    keysAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const pairs = yield this._orderbookService.getAssetPairsAsync(constants_1.FIRST_PAGE, MAX_QUERY_SIZE);
            const keys = pairs.records.map(r => asset_swapper_1.OrderStore.getKeyForAssetPair(r.assetDataA.assetData, r.assetDataB.assetData));
            return keys.values();
        });
    }
}
exports.OrderStoreDbAdapter = OrderStoreDbAdapter;
//# sourceMappingURL=order_store_db_adapter.js.map