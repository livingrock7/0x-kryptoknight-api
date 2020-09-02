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
exports.runTransactionWatcherServiceAsync = void 0;
const express = require("express");
const app_1 = require("../app");
const defaultConfig = require("../config");
const constants_1 = require("../constants");
const db_connection_1 = require("../db_connection");
const logger_1 = require("../logger");
const metrics_router_1 = require("../routers/metrics_router");
const metrics_service_1 = require("../services/metrics_service");
const transaction_watcher_signer_service_1 = require("../services/transaction_watcher_signer_service");
const provider_utils_1 = require("../utils/provider_utils");
if (require.main === module) {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const connection = yield db_connection_1.getDBConnectionAsync();
        yield runTransactionWatcherServiceAsync(connection);
    }))().catch(error => logger_1.logger.error(error));
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
 * This service tracks transactions and their state changes sent by the meta
 * transaction relays and updates them in the database.
 */
function runTransactionWatcherServiceAsync(connection) {
    return __awaiter(this, void 0, void 0, function* () {
        if (defaultConfig.ENABLE_PROMETHEUS_METRICS) {
            const app = express();
            const metricsService = new metrics_service_1.MetricsService();
            const metricsRouter = metrics_router_1.createMetricsRouter(metricsService);
            app.use(constants_1.METRICS_PATH, metricsRouter);
            const server = app.listen(defaultConfig.PROMETHEUS_PORT, () => {
                logger_1.logger.info(`Metrics (HTTP) listening on port ${defaultConfig.PROMETHEUS_PORT}`);
            });
            server.on('error', err => {
                logger_1.logger.error(err);
            });
        }
        const provider = provider_utils_1.providerUtils.createWeb3Provider(defaultConfig.ETHEREUM_RPC_URL);
        const contractAddresses = yield app_1.getContractAddressesForNetworkOrThrowAsync(provider, defaultConfig.CHAIN_ID);
        const config = {
            provider,
            contractAddresses,
            chainId: defaultConfig.CHAIN_ID,
            signerPrivateKeys: defaultConfig.META_TXN_RELAY_PRIVATE_KEYS,
            expectedMinedInSec: defaultConfig.META_TXN_RELAY_EXPECTED_MINED_SEC,
            isSigningEnabled: defaultConfig.META_TXN_SIGNING_ENABLED,
            maxGasPriceGwei: defaultConfig.META_TXN_MAX_GAS_PRICE_GWEI,
            minSignerEthBalance: constants_1.META_TXN_MIN_SIGNER_ETH_BALANCE,
            transactionPollingIntervalMs: constants_1.TX_WATCHER_POLLING_INTERVAL_MS,
            heartbeatIntervalMs: constants_1.TX_WATCHER_UPDATE_METRICS_INTERVAL_MS,
            unstickGasMultiplier: constants_1.UNSTICKING_TRANSACTION_GAS_MULTIPLIER,
            numBlocksUntilConfirmed: constants_1.NUMBER_OF_BLOCKS_UNTIL_CONFIRMED,
        };
        const transactionWatcherService = new transaction_watcher_signer_service_1.TransactionWatcherSignerService(connection, config);
        yield transactionWatcherService.syncTransactionStatusAsync();
        logger_1.logger.info(`TransactionWatcherService starting up!`);
    });
}
exports.runTransactionWatcherServiceAsync = runTransactionWatcherServiceAsync;
//# sourceMappingURL=transaction_watcher_signer_service_runner.js.map