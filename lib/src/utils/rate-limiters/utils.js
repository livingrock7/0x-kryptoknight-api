"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRateLimitedMetaTransactionResponse = void 0;
/**
 * Type guard that checks if the response is a MetaTransactionRateLimiterRejectedResponse
 * @param rateLimitResponse rate limiter response
 */
function isRateLimitedMetaTransactionResponse(rateLimitResponse) {
    return rateLimitResponse.reason !== undefined;
}
exports.isRateLimitedMetaTransactionResponse = isRateLimitedMetaTransactionResponse;
//# sourceMappingURL=utils.js.map