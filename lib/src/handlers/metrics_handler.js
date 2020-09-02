"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsHandlers = void 0;
class MetricsHandlers {
    constructor(metricsService) {
        this._metricsService = metricsService;
    }
    servePrometheusMetrics(_req, res) {
        res.send(this._metricsService.getMetrics());
    }
}
exports.MetricsHandlers = MetricsHandlers;
//# sourceMappingURL=metrics_handler.js.map