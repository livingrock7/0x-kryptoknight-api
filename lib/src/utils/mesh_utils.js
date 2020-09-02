"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meshUtils = void 0;
const mesh_rpc_client_1 = require("@0x/mesh-rpc-client");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const order_utils_1 = require("./order_utils");
exports.meshUtils = {
    orderInfosToApiOrders: (orderEvent) => {
        return orderEvent.map(e => exports.meshUtils.orderInfoToAPIOrder(e));
    },
    orderInfoToAPIOrder: (orderEvent) => {
        const remainingFillableTakerAssetAmount = orderEvent.fillableTakerAssetAmount
            ? orderEvent.fillableTakerAssetAmount
            : constants_1.ZERO;
        return {
            // orderEvent.signedOrder comes from mesh with string fields, needs to be serialized into SignedOrder
            order: order_utils_1.orderUtils.deserializeOrder(orderEvent.signedOrder),
            metaData: {
                orderHash: orderEvent.orderHash,
                remainingFillableTakerAssetAmount,
            },
        };
    },
    rejectedCodeToSRACode: (code) => {
        switch (code) {
            case mesh_rpc_client_1.RejectedCode.OrderCancelled:
            case mesh_rpc_client_1.RejectedCode.OrderExpired:
            case mesh_rpc_client_1.RejectedCode.OrderUnfunded:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidMakerAssetAmount:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidMakerAssetData:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidTakerAssetAmount:
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidTakerAssetData:
            case mesh_rpc_client_1.RejectedCode.OrderFullyFilled: {
                return errors_1.ValidationErrorCodes.InvalidOrder;
            }
            case mesh_rpc_client_1.RejectedCode.OrderHasInvalidSignature: {
                return errors_1.ValidationErrorCodes.InvalidSignatureOrHash;
            }
            case mesh_rpc_client_1.RejectedCode.OrderForIncorrectChain: {
                return errors_1.ValidationErrorCodes.InvalidAddress;
            }
            default:
                return errors_1.ValidationErrorCodes.InternalError;
        }
    },
    calculateAddedRemovedUpdated: (orderEvents) => {
        const added = [];
        const removed = [];
        const updated = [];
        for (const event of orderEvents) {
            const apiOrder = exports.meshUtils.orderInfoToAPIOrder(event);
            switch (event.endState) {
                case mesh_rpc_client_1.OrderEventEndState.Added: {
                    added.push(apiOrder);
                    break;
                }
                case mesh_rpc_client_1.OrderEventEndState.Invalid:
                case mesh_rpc_client_1.OrderEventEndState.Cancelled:
                case mesh_rpc_client_1.OrderEventEndState.Expired:
                case mesh_rpc_client_1.OrderEventEndState.FullyFilled:
                case mesh_rpc_client_1.OrderEventEndState.StoppedWatching:
                case mesh_rpc_client_1.OrderEventEndState.Unfunded: {
                    removed.push(apiOrder);
                    break;
                }
                case mesh_rpc_client_1.OrderEventEndState.Unexpired:
                case mesh_rpc_client_1.OrderEventEndState.FillabilityIncreased:
                case mesh_rpc_client_1.OrderEventEndState.Filled: {
                    updated.push(apiOrder);
                    break;
                }
                default:
                    logger_1.logger.error('Unknown Mesh Event', event.endState, event);
                    break;
            }
        }
        return { added, removed, updated };
    },
};
//# sourceMappingURL=mesh_utils.js.map