"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseKeysUsedForRateLimiter = exports.RollingLimiterIntervalUnit = exports.AvailableRateLimiter = void 0;
var AvailableRateLimiter;
(function (AvailableRateLimiter) {
    AvailableRateLimiter["Daily"] = "daily";
    AvailableRateLimiter["Rolling"] = "rolling";
    AvailableRateLimiter["RollingValue"] = "rollingValue";
})(AvailableRateLimiter = exports.AvailableRateLimiter || (exports.AvailableRateLimiter = {}));
var RollingLimiterIntervalUnit;
(function (RollingLimiterIntervalUnit) {
    RollingLimiterIntervalUnit["Hours"] = "hours";
    RollingLimiterIntervalUnit["Minutes"] = "minutes";
})(RollingLimiterIntervalUnit = exports.RollingLimiterIntervalUnit || (exports.RollingLimiterIntervalUnit = {}));
var DatabaseKeysUsedForRateLimiter;
(function (DatabaseKeysUsedForRateLimiter) {
    DatabaseKeysUsedForRateLimiter["ApiKey"] = "api_key";
    DatabaseKeysUsedForRateLimiter["TakerAddress"] = "taker_address";
})(DatabaseKeysUsedForRateLimiter = exports.DatabaseKeysUsedForRateLimiter || (exports.DatabaseKeysUsedForRateLimiter = {}));
//# sourceMappingURL=types.js.map