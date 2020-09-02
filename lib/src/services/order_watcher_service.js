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
exports.OrderWatcherService = void 0;
const _ = require("lodash");
const config_1 = require("../config");
const entities_1 = require("../entities");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const types_1 = require("../types");
const mesh_utils_1 = require("../utils/mesh_utils");
const order_utils_1 = require("../utils/order_utils");
class OrderWatcherService {
    constructor(connection, meshClient) {
        this._connection = connection;
        this._meshClient = meshClient;
        void this._meshClient.subscribeToOrdersAsync((orders) => __awaiter(this, void 0, void 0, function* () {
            const { added, removed, updated } = mesh_utils_1.meshUtils.calculateAddedRemovedUpdated(orders);
            yield this._onOrderLifeCycleEventAsync(types_1.OrderWatcherLifeCycleEvents.Removed, removed);
            yield this._onOrderLifeCycleEventAsync(types_1.OrderWatcherLifeCycleEvents.Updated, updated);
            yield this._onOrderLifeCycleEventAsync(types_1.OrderWatcherLifeCycleEvents.Added, added);
        }));
        this._meshClient.onReconnected(() => __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info('OrderWatcherService reconnecting to Mesh');
            try {
                yield this.syncOrderbookAsync();
            }
            catch (err) {
                const logError = new errors_1.OrderWatcherSyncError(`Error on reconnecting Mesh client: [${err.stack}]`);
                throw logError;
            }
        }));
    }
    syncOrderbookAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            // Sync the order watching service state locally
            logger_1.logger.info('OrderWatcherService syncing orderbook with Mesh');
            // 1. Get orders from local cache
            const signedOrderModels = (yield this._connection.manager.find(entities_1.SignedOrderEntity));
            const signedOrders = signedOrderModels.map(order_utils_1.orderUtils.deserializeOrder);
            // 2. Get orders from Mesh
            const { ordersInfos } = yield this._meshClient.getOrdersAsync();
            // 3. Validate local cache state by posting to Mesh
            // TODO(dekz): Mesh can reject due to InternalError or EthRPCRequestFailed.
            // in the future we can attempt to retry these a few times. Ultimately if we
            // cannot validate the order we cannot keep the order around
            const pinResult = yield order_utils_1.orderUtils.splitOrdersByPinningAsync(this._connection, signedOrders);
            const [pinnedValidationResults, unpinnedValidationResults] = yield Promise.all([
                this._meshClient.addOrdersAsync(pinResult.pin, true),
                this._meshClient.addOrdersAsync(pinResult.doNotPin, false),
            ]);
            const accepted = [...pinnedValidationResults.accepted, ...unpinnedValidationResults.accepted];
            const rejected = [...pinnedValidationResults.rejected, ...unpinnedValidationResults.rejected];
            logger_1.logger.info('OrderWatcherService sync', {
                accepted: accepted.length,
                rejected: rejected.length,
                sent: signedOrders.length,
            });
            // 4. Notify if any expired orders were accepted by Mesh
            const acceptedApiOrders = mesh_utils_1.meshUtils.orderInfosToApiOrders(accepted);
            const { expired } = order_utils_1.orderUtils.groupByFreshness(acceptedApiOrders, config_1.SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
            logger_1.alertOnExpiredOrders(expired, `Erroneously accepted when posting to Mesh`);
            // 5. Remove all of the rejected and expired orders from local cache
            const toRemove = expired.concat(mesh_utils_1.meshUtils.orderInfosToApiOrders(rejected));
            if (toRemove.length > 0) {
                yield this._onOrderLifeCycleEventAsync(types_1.OrderWatcherLifeCycleEvents.Removed, toRemove);
            }
            // 6. Save Mesh orders to local cache and notify if any expired orders were returned
            const meshOrders = mesh_utils_1.meshUtils.orderInfosToApiOrders(ordersInfos);
            const groupedOrders = order_utils_1.orderUtils.groupByFreshness(meshOrders, config_1.SRA_ORDER_EXPIRATION_BUFFER_SECONDS);
            logger_1.alertOnExpiredOrders(groupedOrders.expired, `Mesh client returned expired orders`);
            if (groupedOrders.fresh.length > 0) {
                yield this._onOrderLifeCycleEventAsync(types_1.OrderWatcherLifeCycleEvents.Added, groupedOrders.fresh);
            }
            logger_1.logger.info('OrderWatcherService sync complete');
        });
    }
    _onOrderLifeCycleEventAsync(lifecycleEvent, orders) {
        return __awaiter(this, void 0, void 0, function* () {
            if (orders.length <= 0) {
                return;
            }
            switch (lifecycleEvent) {
                case types_1.OrderWatcherLifeCycleEvents.Updated:
                case types_1.OrderWatcherLifeCycleEvents.Added: {
                    const allowedOrders = orders.filter(apiOrder => !order_utils_1.orderUtils.isIgnoredOrder(config_1.MESH_IGNORED_ADDRESSES, apiOrder));
                    const signedOrdersModel = allowedOrders.map(o => order_utils_1.orderUtils.serializeOrder(o));
                    // MAX SQL variable size is 999. This limit is imposed via Sqlite.
                    // The SELECT query is not entirely effecient and pulls in all attributes
                    // so we need to leave space for the attributes on the model represented
                    // as SQL variables in the "AS" syntax. We leave 99 free for the
                    // signedOrders model
                    yield this._connection.manager.save(signedOrdersModel, { chunk: 900 });
                    break;
                }
                case types_1.OrderWatcherLifeCycleEvents.Removed: {
                    const orderHashes = orders.map(o => o.metaData.orderHash);
                    // MAX SQL variable size is 999. This limit is imposed via Sqlite
                    // and other databases have higher limits (or no limits at all, eg postgresql)
                    // tslint:disable-next-line:custom-no-magic-numbers
                    const chunks = _.chunk(orderHashes, 999);
                    for (const chunk of chunks) {
                        yield this._connection.manager.delete(entities_1.SignedOrderEntity, chunk);
                    }
                    break;
                }
                default:
                // Do Nothing
            }
        });
    }
}
exports.OrderWatcherService = OrderWatcherService;
//# sourceMappingURL=order_watcher_service.js.map