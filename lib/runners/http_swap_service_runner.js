"use strict";
/**
 * This module can be used to run the Swap HTTP service standalone
 */
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
const express = require("express");
const app_1 = require("../app");
const config_1 = require("../config");
const constants_1 = require("../constants");
const root_handler_1 = require("../handlers/root_handler");
const logger_1 = require("../logger");
const address_normalizer_1 = require("../middleware/address_normalizer");
const error_handling_1 = require("../middleware/error_handling");
const swap_router_1 = require("../routers/swap_router");
const provider_utils_1 = require("../utils/provider_utils");
const utils_1 = require("./utils");
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
function runHttpServiceAsync(dependencies, config, _app) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = _app || express();
        app.use(address_normalizer_1.addressNormalizer);
        const server = utils_1.createDefaultServer(dependencies, config, app);
        app.get('/', root_handler_1.rootHandler);
        if (dependencies.swapService) {
            app.use(constants_1.SWAP_PATH, swap_router_1.createSwapRouter(dependencies.swapService));
        }
        else {
            logger_1.logger.error(`Could not run swap service, exiting`);
            process.exit(1);
        }
        app.use(error_handling_1.errorHandler);
        server.listen(config.httpPort);
        return server;
    });
}
//# sourceMappingURL=http_swap_service_runner.js.map