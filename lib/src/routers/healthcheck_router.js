"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHealthcheckRouter = void 0;
const express = require("express");
const healthcheck_handlers_1 = require("../handlers/healthcheck_handlers");
exports.createHealthcheckRouter = (healthcheckService) => {
    const router = express.Router();
    const handlers = new healthcheck_handlers_1.HealthcheckHandlers(healthcheckService);
    /**
     * GET healthcheck endpoint returns the health of the http server.
     */
    router.get('/', handlers.serveHealthcheck.bind(handlers));
    return router;
};
//# sourceMappingURL=healthcheck_router.js.map