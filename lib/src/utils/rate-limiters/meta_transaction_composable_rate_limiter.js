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
exports.MetaTransactionComposableLimiter = void 0;
const base_limiter_1 = require("./base_limiter");
const utils_1 = require("./utils");
class MetaTransactionComposableLimiter extends base_limiter_1.MetaTransactionRateLimiter {
    constructor(rateLimiters) {
        super();
        if (rateLimiters.length === 0) {
            throw new Error('no rate limiters added to MetaTransactionComposableLimiter');
        }
        this._rateLimiters = rateLimiters;
    }
    isAllowedAsync(context) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const rateLimiter of this._rateLimiters) {
                const rateLimitResponse = yield rateLimiter.isAllowedAsync(context);
                if (utils_1.isRateLimitedMetaTransactionResponse(rateLimitResponse)) {
                    return rateLimitResponse;
                }
            }
            return { isAllowed: true };
        });
    }
}
exports.MetaTransactionComposableLimiter = MetaTransactionComposableLimiter;
//# sourceMappingURL=meta_transaction_composable_rate_limiter.js.map