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
exports.OrderBookServiceOrderProvider = void 0;
const asset_swapper_1 = require("@0x/asset-swapper");
const constants_1 = require("./constants");
const MAX_QUERY_SIZE = 1000;
// tslint:disable:prefer-function-over-method
/**
 * Stubs out the required functions for usage in AssetSwapper/Orderbook
 * Where required the implementation will fetch from the OrderBookService
 * representing the underlying database
 */
class OrderBookServiceOrderProvider extends asset_swapper_1.BaseOrderProvider {
    constructor(orderStore, orderbookService) {
        super(orderStore);
        this._orderbookService = orderbookService;
    }
    createSubscriptionForAssetPairAsync(_makerAssetData, _takerAssetData) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve();
        });
    }
    getAvailableAssetDatasAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this._orderbookService.getAssetPairsAsync(constants_1.FIRST_PAGE, MAX_QUERY_SIZE);
            return response.records;
        });
    }
    destroyAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve();
        });
    }
    addOrdersAsync(_orders) {
        return __awaiter(this, void 0, void 0, function* () {
            return Promise.resolve();
        });
    }
}
exports.OrderBookServiceOrderProvider = OrderBookServiceOrderProvider;
//# sourceMappingURL=order_book_service_order_provider.js.map