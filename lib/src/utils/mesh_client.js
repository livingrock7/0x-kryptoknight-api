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
exports.MeshClient = void 0;
const mesh_rpc_client_1 = require("@0x/mesh-rpc-client");
const order_utils_1 = require("@0x/order-utils");
const _ = require("lodash");
const constants_1 = require("../constants");
const logger_1 = require("../logger");
const axios_utils_1 = require("./axios_utils");
const utils_1 = require("./utils");
class MeshClient extends mesh_rpc_client_1.WSClient {
    constructor(websocketURI, httpURI, websocketOpts) {
        super(websocketURI, websocketOpts);
        this.websocketURI = websocketURI;
        this.httpURI = httpURI;
    }
    addOrdersAsync(orders, pinned = false) {
        const _super = Object.create(null, {
            addOrdersAsync: { get: () => super.addOrdersAsync }
        });
        return __awaiter(this, void 0, void 0, function* () {
            const validationResults = { accepted: [], rejected: [] };
            if (_.isEmpty(this.httpURI) || orders.length <= constants_1.MESH_ORDERS_BATCH_SIZE) {
                const chunks = _.chunk(orders, constants_1.MESH_ORDERS_BATCH_SIZE);
                // send via websocket
                // break into chunks because mesh websocket fails when the msg is too big
                for (const chunk of chunks) {
                    const results = yield _super.addOrdersAsync.call(this, chunk, pinned);
                    validationResults.accepted = [...validationResults.accepted, ...results.accepted];
                    validationResults.rejected = [...validationResults.rejected, ...results.rejected];
                }
            }
            else {
                const chunks = utils_1.utils.chunkByByteLength(orders, constants_1.MESH_ORDERS_BATCH_HTTP_BYTE_LENGTH);
                for (const [i, chunk] of chunks.entries()) {
                    // send via http
                    // format JSON-RPC request payload
                    const data = {
                        jsonrpc: '2.0',
                        id: +new Date(),
                        method: 'mesh_addOrders',
                        params: [chunk, { pinned }],
                    };
                    try {
                        const startTime = Date.now();
                        // send the request
                        const response = yield axios_utils_1.retryableAxios({
                            method: 'post',
                            url: this.httpURI,
                            data,
                            raxConfig: {
                                httpMethodsToRetry: ['POST'],
                                retryDelay: 3000,
                            },
                        });
                        const endTime = Date.now();
                        // validate the response
                        utils_1.utils.isValidJsonRpcResponseOrThrow(response.data, data);
                        const results = response.data.result;
                        validationResults.accepted = [...validationResults.accepted, ...results.accepted];
                        validationResults.rejected = [...validationResults.rejected, ...results.rejected];
                        logger_1.logger.info(`Mesh HTTP sync ${i + 1}/${chunks.length} complete ${endTime - startTime}ms`);
                    }
                    catch (err) {
                        logger_1.logger.error(`Mesh HTTP sync ${i + 1}/${chunks.length} failed ${err.message}`);
                        // If we can't validate orders, and have exhausted retries, then we need to reject
                        const rejected = yield Promise.all(orders.map(o => ({
                            orderHash: order_utils_1.orderHashUtils.getOrderHash(o),
                            signedOrder: o,
                            kind: mesh_rpc_client_1.RejectedKind.MeshError,
                            status: {
                                code: mesh_rpc_client_1.RejectedCode.NetworkRequestFailed,
                                message: 'Unable to verify order with Mesh',
                            },
                        })));
                        validationResults.rejected = [...validationResults.rejected, ...rejected];
                    }
                }
            }
            return validationResults;
        });
    }
}
exports.MeshClient = MeshClient;
//# sourceMappingURL=mesh_client.js.map