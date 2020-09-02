"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryableAxios = void 0;
const axios_1 = require("axios");
const rax = require("retry-axios");
const logger_1 = require("../logger");
const DEFAULT_RETRY_CONFIG = {
    // Retry 3 times
    retry: 3,
    // Retry twice on no response (ETIMEDOUT)
    noResponseRetries: 2,
    onRetryAttempt: err => {
        const cfg = rax.getConfig(err);
        if (cfg) {
            logger_1.logger.warn(`HTTP retry attempt #${cfg.currentRetryAttempt}. ${err.message}`);
        }
        else {
            logger_1.logger.warn(`HTTP retry. ${err.message}`);
        }
    },
};
const retryableAxiosInstance = axios_1.default.create();
exports.retryableAxios = (config) => {
    return retryableAxiosInstance(Object.assign(Object.assign({}, config), { raxConfig: Object.assign(Object.assign({ instance: retryableAxiosInstance }, DEFAULT_RETRY_CONFIG), config.raxConfig) }));
};
// Attach retry-axios only to our specific instance
rax.attach(retryableAxiosInstance);
//# sourceMappingURL=axios_utils.js.map