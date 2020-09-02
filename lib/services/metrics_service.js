"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const prom_client_1 = require("prom-client");
class MetricsService {
    constructor() {
        // we use the default register provided by prom-client.
        this._registry = prom_client_1.register;
        prom_client_1.collectDefaultMetrics({ register: this._registry });
    }
    getMetrics() {
        return this._registry.metrics();
    }
}
exports.MetricsService = MetricsService;
//# sourceMappingURL=metrics_service.js.map