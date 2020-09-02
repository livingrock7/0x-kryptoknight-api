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
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const express = require("express");
require("mocha");
const prom_client_1 = require("prom-client");
const request = require("supertest");
const constants_1 = require("../src/constants");
const metrics_router_1 = require("../src/routers/metrics_router");
const metrics_service_1 = require("../src/services/metrics_service");
const SUITE_NAME = 'metrics tests';
const metricsPath = '/metrics';
let app;
const expectMetric = (testApp, metricName, value) => __awaiter(void 0, void 0, void 0, function* () {
    yield request(testApp)
        .get(metricsPath)
        .then(response => {
        contracts_test_utils_1.expect(response.text).to.include(metricName);
        if (value !== undefined) {
            contracts_test_utils_1.expect(response.text).to.include(`${metricName} ${value}`);
        }
    });
});
describe(SUITE_NAME, () => {
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        app = express();
        const metricsService = new metrics_service_1.MetricsService();
        const metricsRouter = metrics_router_1.createMetricsRouter(metricsService);
        app.use(constants_1.METRICS_PATH, metricsRouter);
    }));
    describe(metricsPath, () => {
        it('returns default prometheus metrics', () => __awaiter(void 0, void 0, void 0, function* () {
            yield expectMetric(app, 'process_cpu_user_seconds_total');
        }));
        it('returns a custom metric correctly', () => __awaiter(void 0, void 0, void 0, function* () {
            const customMetricName = 'test_counter_metric';
            const counter = new prom_client_1.Counter({
                name: customMetricName,
                help: 'testing',
            });
            counter.inc();
            yield expectMetric(app, customMetricName, '1');
        }));
    });
});
//# sourceMappingURL=metrics_test.js.map