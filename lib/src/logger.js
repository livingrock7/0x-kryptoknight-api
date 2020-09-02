"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertOnExpiredOrders = exports.logger = void 0;
const pino = require("pino");
const config_1 = require("./config");
const constants_1 = require("./constants");
const errors_1 = require("./errors");
exports.logger = pino({
    level: config_1.LOG_LEVEL,
    useLevelLabels: true,
    timestamp: config_1.LOGGER_INCLUDE_TIMESTAMP,
});
/**
 * If the max age of expired orders exceeds the configured threshold, this function
 * logs an error capturing the details of the expired orders
 */
function alertOnExpiredOrders(expired, details) {
    const maxExpirationTimeSeconds = Date.now() / constants_1.ONE_SECOND_MS + config_1.MAX_ORDER_EXPIRATION_BUFFER_SECONDS;
    let idx = 0;
    if (expired.find((order, i) => {
        idx = i;
        return order.order.expirationTimeSeconds.toNumber() > maxExpirationTimeSeconds;
    })) {
        const error = new errors_1.ExpiredOrderError(expired[idx].order, config_1.MAX_ORDER_EXPIRATION_BUFFER_SECONDS, details);
        exports.logger.error(error);
    }
}
exports.alertOnExpiredOrders = alertOnExpiredOrders;
//# sourceMappingURL=logger.js.map