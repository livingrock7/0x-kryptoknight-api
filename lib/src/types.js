"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionStates = exports.ChainId = exports.MessageChannels = exports.MessageTypes = exports.OrderWatcherLifeCycleEvents = exports.SwapVersion = void 0;
var types_1 = require("./utils/rate-limiters/types");
Object.defineProperty(exports, "AvailableRateLimiter", { enumerable: true, get: function () { return types_1.AvailableRateLimiter; } });
Object.defineProperty(exports, "DatabaseKeysUsedForRateLimiter", { enumerable: true, get: function () { return types_1.DatabaseKeysUsedForRateLimiter; } });
Object.defineProperty(exports, "RollingLimiterIntervalUnit", { enumerable: true, get: function () { return types_1.RollingLimiterIntervalUnit; } });
// lowercase to conform to path names
var SwapVersion;
(function (SwapVersion) {
    SwapVersion["V1"] = "v1";
    SwapVersion["V0"] = "v0";
})(SwapVersion = exports.SwapVersion || (exports.SwapVersion = {}));
var OrderWatcherLifeCycleEvents;
(function (OrderWatcherLifeCycleEvents) {
    OrderWatcherLifeCycleEvents[OrderWatcherLifeCycleEvents["Added"] = 0] = "Added";
    OrderWatcherLifeCycleEvents[OrderWatcherLifeCycleEvents["Removed"] = 1] = "Removed";
    OrderWatcherLifeCycleEvents[OrderWatcherLifeCycleEvents["Updated"] = 2] = "Updated";
})(OrderWatcherLifeCycleEvents = exports.OrderWatcherLifeCycleEvents || (exports.OrderWatcherLifeCycleEvents = {}));
var MessageTypes;
(function (MessageTypes) {
    MessageTypes["Subscribe"] = "subscribe";
})(MessageTypes = exports.MessageTypes || (exports.MessageTypes = {}));
var MessageChannels;
(function (MessageChannels) {
    MessageChannels["Orders"] = "orders";
})(MessageChannels = exports.MessageChannels || (exports.MessageChannels = {}));
var ChainId;
(function (ChainId) {
    ChainId[ChainId["Mainnet"] = 1] = "Mainnet";
    ChainId[ChainId["Kovan"] = 42] = "Kovan";
    ChainId[ChainId["Ganache"] = 1337] = "Ganache";
})(ChainId = exports.ChainId || (exports.ChainId = {}));
var TransactionStates;
(function (TransactionStates) {
    // transaction has been constructed, but not yet submitted to the network.
    TransactionStates["Unsubmitted"] = "unsubmitted";
    // transaction has been submitted to the network.
    TransactionStates["Submitted"] = "submitted";
    // transaction has been spotted in the mempool.
    TransactionStates["Mempool"] = "mempool";
    // transaction has not been mined in the expected time.
    TransactionStates["Stuck"] = "stuck";
    // transaction has been mined.
    TransactionStates["Included"] = "included";
    // transaction is confirmed.
    TransactionStates["Confirmed"] = "confirmed";
    // transaction is no longer in the mempool.
    TransactionStates["Dropped"] = "dropped";
    // transaction has been aborted because a new transaction with the same
    // nonce has been mined.
    TransactionStates["Aborted"] = "aborted";
    // transaction was in an unsubmitted state for too long.
    TransactionStates["Cancelled"] = "cancelled";
})(TransactionStates = exports.TransactionStates || (exports.TransactionStates = {}));
// tslint:disable-line:max-file-line-count
//# sourceMappingURL=types.js.map