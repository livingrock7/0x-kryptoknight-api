"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthcheckService = void 0;
class HealthcheckService {
    constructor() {
        this._isHealthy = false;
    }
    setHealth(val) {
        this._isHealthy = val;
    }
    isHealthy() {
        return this._isHealthy;
    }
}
exports.HealthcheckService = HealthcheckService;
//# sourceMappingURL=healthcheck_service.js.map