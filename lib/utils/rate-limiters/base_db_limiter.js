"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaTransactionBaseDbRateLimiter = void 0;
const assert_1 = require("@0x/assert");
const types_1 = require("./types");
class MetaTransactionBaseDbRateLimiter {
    constructor(dbField) {
        MetaTransactionBaseDbRateLimiter.isValidDBFieldOrThrow(dbField);
        this._dbField = dbField;
    }
    static isValidDBFieldOrThrow(dbField) {
        assert_1.assert.doesBelongToStringEnum('dbField', dbField, types_1.DatabaseKeysUsedForRateLimiter);
    }
    getKeyFromContextOrThrow(context) {
        switch (this._dbField) {
            case types_1.DatabaseKeysUsedForRateLimiter.ApiKey:
                return context.apiKey;
            case types_1.DatabaseKeysUsedForRateLimiter.TakerAddress:
                return context.takerAddress;
            default:
                throw new Error(`unsupported field configured for meta transaction rate limit: ${this._dbField}`);
        }
    }
}
exports.MetaTransactionBaseDbRateLimiter = MetaTransactionBaseDbRateLimiter;
//# sourceMappingURL=base_db_limiter.js.map