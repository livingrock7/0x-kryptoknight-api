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
exports.WebsocketService = void 0;
const json_schemas_1 = require("@0x/json-schemas");
const order_utils_1 = require("@0x/order-utils");
const types_1 = require("@0x/types");
const _ = require("lodash");
const WebSocket = require("ws");
const config_1 = require("../config");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const error_handling_1 = require("../middleware/error_handling");
const types_2 = require("../types");
const mesh_utils_1 = require("../utils/mesh_utils");
const order_utils_2 = require("../utils/order_utils");
const schema_utils_1 = require("../utils/schema_utils");
const DEFAULT_OPTS = {
    pongInterval: 5000,
    path: '/',
};
/* A websocket server that sends order updates to subscribed
 * clients. The server listens on the supplied path for
 * subscription requests from relayers. It also subscribes to
 * Mesh using mesh-rpc-client. It filters Mesh updates and sends
 * relevant orders to the subscribed clients in real time.
 */
class WebsocketService {
    constructor(server, meshClient, opts) {
        this._requestIdToSocket = new Map(); // requestId to WebSocket mapping
        this._requestIdToSubscriptionOpts = new Map(); // requestId -> { base, quote }
        const wsOpts = Object.assign(Object.assign({}, DEFAULT_OPTS), opts);
        this._server = new WebSocket.Server({ server, path: wsOpts.path });
        this._server.on('connection', this._processConnection.bind(this));
        this._server.on('error', WebsocketService._handleError.bind(this));
        this._pongIntervalId = setInterval(this._cleanupConnections.bind(this), wsOpts.pongInterval);
        this._meshClient = meshClient;
        // tslint:disable-next-line:no-floating-promises
        this._meshClient
            .subscribeToOrdersAsync(e => this.orderUpdate(mesh_utils_1.meshUtils.orderInfosToApiOrders(e)))
            .then(subscriptionId => (this._meshSubscriptionId = subscriptionId));
    }
    static _decodedContractAndAssetData(assetData) {
        let data = [assetData];
        const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
        if (order_utils_2.orderUtils.isMultiAssetData(decodedAssetData)) {
            for (const nested of decodedAssetData.nestedAssetData) {
                data = [...data, ...WebsocketService._decodedContractAndAssetData(nested).data];
            }
        }
        else if (order_utils_2.orderUtils.isStaticCallAssetData(decodedAssetData)) {
            // do nothing
        }
        else {
            data = [...data, decodedAssetData.tokenAddress];
        }
        return { data, assetProxyId: decodedAssetData.assetProxyId };
    }
    static _matchesOrdersChannelSubscription(order, opts) {
        if (opts === 'ALL_SUBSCRIPTION_OPTS') {
            return true;
        }
        const { makerAssetData, takerAssetData } = order;
        const makerAssetDataTakerAssetData = [makerAssetData, takerAssetData];
        // Handle the specific, unambiguous asset datas
        // traderAssetData?: string;
        if (opts.traderAssetData && makerAssetDataTakerAssetData.includes(opts.traderAssetData)) {
            return true;
        }
        // makerAssetData?: string;
        // takerAssetData?: string;
        if (opts.makerAssetData &&
            opts.takerAssetData &&
            makerAssetDataTakerAssetData.includes(opts.makerAssetData) &&
            makerAssetDataTakerAssetData.includes(opts.takerAssetData)) {
            return true;
        }
        // makerAssetAddress?: string;
        // takerAssetAddress?: string;
        const makerContractAndAssetData = WebsocketService._decodedContractAndAssetData(makerAssetData);
        const takerContractAndAssetData = WebsocketService._decodedContractAndAssetData(takerAssetData);
        if (opts.makerAssetAddress &&
            opts.takerAssetAddress &&
            makerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.MultiAsset &&
            makerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.StaticCall &&
            takerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.MultiAsset &&
            takerContractAndAssetData.assetProxyId !== types_1.AssetProxyId.StaticCall &&
            makerContractAndAssetData.data.includes(opts.makerAssetAddress) &&
            takerContractAndAssetData.data.includes(opts.takerAssetAddress)) {
            return true;
        }
        // TODO (dekz)handle MAP
        // makerAssetProxyId?: string;
        // takerAssetProxyId?: string;
        return false;
    }
    static _handleError(_ws, err) {
        logger_1.logger.error(new errors_1.WebsocketServiceError(err));
    }
    destroyAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this._pongIntervalId);
            for (const ws of this._server.clients) {
                ws.terminate();
            }
            this._requestIdToSocket.clear();
            this._requestIdToSubscriptionOpts.clear();
            this._server.close();
            if (this._meshSubscriptionId) {
                try {
                    yield this._meshClient.unsubscribeAsync(this._meshSubscriptionId);
                }
                finally {
                    delete this._meshSubscriptionId;
                }
            }
        });
    }
    orderUpdate(apiOrders) {
        if (this._server.clients.size === 0) {
            return;
        }
        const response = {
            type: types_1.OrdersChannelMessageTypes.Update,
            channel: types_2.MessageChannels.Orders,
            payload: apiOrders,
        };
        const allowedOrders = apiOrders.filter(apiOrder => !order_utils_2.orderUtils.isIgnoredOrder(config_1.MESH_IGNORED_ADDRESSES, apiOrder));
        for (const order of allowedOrders) {
            // Future optimisation is to invert this structure so the order isn't duplicated over many request ids
            // order->requestIds it is less likely to get multiple order updates and more likely
            // to have many subscribers and a single order
            const requestIdToOrders = {};
            for (const [requestId, subscriptionOpts] of this._requestIdToSubscriptionOpts) {
                if (WebsocketService._matchesOrdersChannelSubscription(order.order, subscriptionOpts)) {
                    if (requestIdToOrders[requestId]) {
                        const orderSet = requestIdToOrders[requestId];
                        orderSet.add(order);
                    }
                    else {
                        const orderSet = new Set();
                        orderSet.add(order);
                        requestIdToOrders[requestId] = orderSet;
                    }
                }
            }
            for (const [requestId, orders] of Object.entries(requestIdToOrders)) {
                const ws = this._requestIdToSocket.get(requestId);
                if (ws) {
                    ws.send(JSON.stringify(Object.assign(Object.assign({}, response), { payload: Array.from(orders), requestId })));
                }
            }
        }
    }
    _processConnection(ws, _req) {
        ws.on('pong', this._pongHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Message, this._messageHandler(ws).bind(this));
        ws.on(types_1.WebsocketConnectionEventType.Close, this._closeHandler(ws).bind(this));
        ws.isAlive = true;
        ws.requestIds = new Set();
    }
    _processMessage(ws, data) {
        let message;
        try {
            message = JSON.parse(data.toString());
        }
        catch (e) {
            throw new errors_1.MalformedJSONError();
        }
        schema_utils_1.schemaUtils.validateSchema(message, json_schemas_1.schemas.relayerApiOrdersChannelSubscribeSchema);
        const { requestId, payload, type } = message;
        switch (type) {
            case types_2.MessageTypes.Subscribe:
                ws.requestIds.add(requestId);
                const subscriptionOpts = payload === undefined || _.isEmpty(payload) ? 'ALL_SUBSCRIPTION_OPTS' : payload;
                this._requestIdToSubscriptionOpts.set(requestId, subscriptionOpts);
                this._requestIdToSocket.set(requestId, ws);
                break;
            default:
                throw new errors_1.NotImplementedError(message.type);
        }
    }
    _cleanupConnections() {
        // Ping every connection and if it is unresponsive
        // terminate it during the next check
        for (const ws of this._server.clients) {
            if (!ws.isAlive) {
                ws.terminate();
            }
            else {
                ws.isAlive = false;
                ws.ping();
            }
        }
    }
    _messageHandler(ws) {
        return (data) => {
            try {
                this._processMessage(ws, data);
            }
            catch (err) {
                this._processError(ws, err);
            }
        };
    }
    // tslint:disable-next-line:prefer-function-over-method
    _processError(ws, err) {
        const { errorBody } = error_handling_1.generateError(err);
        ws.send(JSON.stringify(errorBody));
        ws.terminate();
    }
    // tslint:disable-next-line:prefer-function-over-method
    _pongHandler(ws) {
        return () => {
            ws.isAlive = true;
        };
    }
    _closeHandler(ws) {
        return () => {
            for (const requestId of ws.requestIds) {
                this._requestIdToSocket.delete(requestId);
                this._requestIdToSubscriptionOpts.delete(requestId);
            }
        };
    }
}
exports.WebsocketService = WebsocketService;
//# sourceMappingURL=websocket_service.js.map