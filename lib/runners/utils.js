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
exports.createDefaultServer = void 0;
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const http_1 = require("http");
const constants_1 = require("../constants");
const logger_1 = require("../logger");
const request_logger_1 = require("../middleware/request_logger");
const healthcheck_router_1 = require("../routers/healthcheck_router");
const healthcheck_service_1 = require("../services/healthcheck_service");
/**
 * creates the NodeJS http server with graceful shutdowns, healthchecks,
 * configured header timeouts and other sane defaults set.
 */
function createDefaultServer(dependencies, config, app) {
    app.use(request_logger_1.requestLogger());
    app.use(cors());
    app.use(bodyParser.json());
    const server = http_1.createServer(app);
    server.keepAliveTimeout = config.httpKeepAliveTimeout;
    server.headersTimeout = config.httpHeadersTimeout;
    const healthcheckService = new healthcheck_service_1.HealthcheckService();
    server.on('close', () => {
        logger_1.logger.info('http server shutdown');
    });
    server.on('listening', () => {
        logger_1.logger.info(`server listening on ${config.httpPort}`);
        healthcheckService.setHealth(true);
    });
    const shutdownFunc = (sig) => {
        logger_1.logger.info(`received: ${sig}, shutting down server`);
        healthcheckService.setHealth(false);
        server.close((err) => __awaiter(this, void 0, void 0, function* () {
            if (dependencies.meshClient) {
                dependencies.meshClient.destroy();
            }
            if (dependencies.connection) {
                yield dependencies.connection.close();
            }
            if (!server.listening) {
                process.exit(0);
            }
            if (err) {
                logger_1.logger.error(`server closed with an error: ${err}, exiting`);
                process.exit(1);
            }
            logger_1.logger.info('successful shutdown, exiting');
            process.exit(0);
        }));
    };
    if (config.httpPort === config.healthcheckHttpPort) {
        app.use(constants_1.HEALTHCHECK_PATH, healthcheck_router_1.createHealthcheckRouter(healthcheckService));
    }
    else {
        // if we don't want to expose the /healthz healthcheck service route to
        // the public, we serve it from a different port. Serving it through a
        // different express app also removes the unnecessary request logging.
        const healthcheckApp = express();
        healthcheckApp.use(constants_1.HEALTHCHECK_PATH, healthcheck_router_1.createHealthcheckRouter(healthcheckService));
        healthcheckApp.listen(config.healthcheckHttpPort, () => {
            logger_1.logger.info(`healthcheckApp listening on ${config.healthcheckHttpPort}`);
        });
    }
    process.on('SIGINT', shutdownFunc);
    process.on('SIGTERM', shutdownFunc);
    process.on('SIGQUIT', shutdownFunc);
    return server;
}
exports.createDefaultServer = createDefaultServer;
//# sourceMappingURL=utils.js.map