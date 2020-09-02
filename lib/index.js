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
const app_1 = require("./app");
const config_1 = require("./config");
const logger_1 = require("./logger");
const provider_utils_1 = require("./utils/provider_utils");
if (require.main === module) {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        const provider = provider_utils_1.providerUtils.createWeb3Provider(config_1.defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl);
        const dependencies = yield app_1.getDefaultAppDependenciesAsync(provider, config_1.defaultHttpServiceWithRateLimiterConfig);
        yield app_1.getAppAsync(dependencies, config_1.defaultHttpServiceWithRateLimiterConfig);
    }))().catch(err => logger_1.logger.error(err.stack));
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
//# sourceMappingURL=index.js.map