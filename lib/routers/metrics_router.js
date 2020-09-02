"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMetricsRouter = void 0;
const express = require("express");
const metrics_handler_1 = require("../handlers/metrics_handler");
exports.createMetricsRouter = (metricsService) => {
    const router = express.Router();
    const handlers = new metrics_handler_1.MetricsHandlers(metricsService);
    /**
     * GET metrics endpoint returns the prometheus metrics stored in the
     * metricsService registry.
     */
    router.get('/', handlers.servePrometheusMetrics.bind(handlers));
    return router;
};
//# sourceMappingURL=metrics_router.js.map