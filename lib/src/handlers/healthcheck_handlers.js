"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthcheckHandlers = void 0;
const HttpStatus = require("http-status-codes");
class HealthcheckHandlers {
    constructor(healthcheckService) {
        this._healthcheckService = healthcheckService;
    }
    serveHealthcheck(_req, res) {
        const isHealthy = this._healthcheckService.isHealthy();
        if (isHealthy) {
            res.status(HttpStatus.OK).send({ isHealthy });
        }
        else {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).send({ isHealthy });
        }
    }
}
exports.HealthcheckHandlers = HealthcheckHandlers;
//# sourceMappingURL=healthcheck_handlers.js.map