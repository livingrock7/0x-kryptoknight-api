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
exports.runOrderWatcherServiceAsync = void 0;
const app_1 = require("../app");
const config_1 = require("../config");
const errors_1 = require("../errors");
const logger_1 = require("../logger");
const order_watcher_service_1 = require("../services/order_watcher_service");
const provider_utils_1 = require("../utils/provider_utils");
if (require.main === module) {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const provider = provider_utils_1.providerUtils.createWeb3Provider(config_1.defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const { connection, meshClient } = yield app_1.getDefaultAppDependenciesAsync(provider, config_1.defaultHttpServiceWithRateLimiterConfig);
        if (meshClient) {
            yield runOrderWatcherServiceAsync(connection, meshClient);
            logger_1.logger.info(`Order Watching Service started!\nConfig: ${JSON.stringify(config_1.defaultHttpServiceWithRateLimiterConfig, null, 2)}`);
        }
        else {
            logger_1.logger.error(`Order Watching Service could not be started! Could not start mesh client!\nConfig: ${JSON.stringify(config_1.defaultHttpServiceWithRateLimiterConfig, null, 2)}`);
            process.exit(1);
        }
    }))().catch(error => logger_1.logger.error(error.stack));
}
process.on('uncaughtException', err => {
    logger_1.logger.error(err);
    process.exit(1);
});
process.on('unhandledRejection', err => {
    if (err) {
        logger_1.logger.error(err);
    }
});
/**
 * This service is a simple writer from the Mesh events. On order discovery
 * or an order update it will be persisted to the database. It also is responsible
 * for syncing the database with Mesh on start or after a disconnect.
 */
function runOrderWatcherServiceAsync(connection, meshClient) {
    return __awaiter(this, void 0, void 0, function* () {
        const orderWatcherService = new order_watcher_service_1.OrderWatcherService(connection, meshClient);
        logger_1.logger.info(`OrderWatcherService starting up!`);
        try {
            yield orderWatcherService.syncOrderbookAsync();
        }
        catch (err) {
            const logError = new errors_1.OrderWatcherSyncError(`Error on starting OrderWatcher service: [${err.stack}]`);
            throw logError;
        }
    });
}
exports.runOrderWatcherServiceAsync = runOrderWatcherServiceAsync;
//# sourceMappingURL=order_watcher_service_runner.js.map