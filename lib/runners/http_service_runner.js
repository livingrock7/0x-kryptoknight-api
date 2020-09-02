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
exports.runHttpServiceAsync = void 0;
const express = require("express");
const app_1 = require("../app");
const config_1 = require("../config");
const constants_1 = require("../constants");
const root_handler_1 = require("../handlers/root_handler");
const logger_1 = require("../logger");
const address_normalizer_1 = require("../middleware/address_normalizer");
const error_handling_1 = require("../middleware/error_handling");
const meta_transaction_router_1 = require("../routers/meta_transaction_router");
const metrics_router_1 = require("../routers/metrics_router");
const sra_router_1 = require("../routers/sra_router");
const staking_router_1 = require("../routers/staking_router");
const swap_router_1 = require("../routers/swap_router");
const websocket_service_1 = require("../services/websocket_service");
const provider_utils_1 = require("../utils/provider_utils");
const utils_1 = require("./utils");
/**
 * http_service_runner hosts endpoints for staking, sra, swap and meta-txns (minus the /submit endpoint)
 * and can be horizontally scaled as needed
 */
process.on('uncaughtException', err => {
    logger_1.logger.error(err);
    process.exit(1);
});
process.on('unhandledRejection', err => {
    if (err) {
        logger_1.logger.error(err);
    }
});
if (require.main === module) {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const provider = provider_utils_1.providerUtils.createWeb3Provider(config_1.defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const dependencies = yield app_1.getDefaultAppDependenciesAsync(provider, config_1.defaultHttpServiceWithRateLimiterConfig);
        yield runHttpServiceAsync(dependencies, config_1.defaultHttpServiceWithRateLimiterConfig);
    }))().catch(error => logger_1.logger.error(error.stack));
}
/**
 * This service handles the HTTP requests. This involves fetching from the database
 * as well as adding orders to mesh.
 * @param dependencies If no mesh client is supplied, the HTTP service will start without it.
 *                     It will provide defaults for other params.
 */
function runHttpServiceAsync(dependencies, config, _app) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = _app || express();
        const server = utils_1.createDefaultServer(dependencies, config, app);
        app.get('/', root_handler_1.rootHandler);
        server.on('error', err => {
            logger_1.logger.error(err);
        });
        // transform all values of `req.query.[xx]Address` to lowercase
        app.use(address_normalizer_1.addressNormalizer);
        // staking http service
        app.use(constants_1.STAKING_PATH, staking_router_1.createStakingRouter(dependencies.stakingDataService));
        // SRA http service
        app.use(constants_1.SRA_PATH, sra_router_1.createSRARouter(dependencies.orderBookService));
        // Meta transaction http service
        if (dependencies.metaTransactionService) {
            app.use(constants_1.META_TRANSACTION_PATH, meta_transaction_router_1.createMetaTransactionRouter(dependencies.metaTransactionService, dependencies.rateLimiter));
        }
        else {
            logger_1.logger.error(`API running without meta transactions service`);
        }
        // swap/quote http service
        if (dependencies.swapService) {
            app.use(constants_1.SWAP_PATH, swap_router_1.createSwapRouter(dependencies.swapService));
        }
        else {
            logger_1.logger.error(`API running without swap service`);
        }
        if (dependencies.metricsService) {
            const metricsRouter = metrics_router_1.createMetricsRouter(dependencies.metricsService);
            if (config.prometheusPort === config.httpPort) {
                // if the target prometheus port is the same as the base app port,
                // we just add the router to latter.
                app.use(constants_1.METRICS_PATH, metricsRouter);
            }
            else {
                // otherwise we create a separate server for metrics.
                const metricsApp = express();
                metricsApp.use(constants_1.METRICS_PATH, metricsRouter);
                const metricsServer = metricsApp.listen(config.prometheusPort, () => {
                    logger_1.logger.info(`Metrics (HTTP) listening on port ${config.prometheusPort}`);
                });
                metricsServer.on('error', err => {
                    logger_1.logger.error(err);
                });
            }
        }
        app.use(error_handling_1.errorHandler);
        // websocket service
        let wsService;
        if (dependencies.meshClient) {
            // tslint:disable-next-line:no-unused-expression
            wsService = new websocket_service_1.WebsocketService(server, dependencies.meshClient, dependencies.websocketOpts);
        }
        else {
            logger_1.logger.error(`Could not establish mesh connection, exiting`);
            process.exit(1);
        }
        server.listen(config.httpPort);
        return {
            server,
            wsService,
        };
    });
}
exports.runHttpServiceAsync = runHttpServiceAsync;
//# sourceMappingURL=http_service_runner.js.map