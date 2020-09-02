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
exports.MetaTransactionDailyLimiter = void 0;
const entities_1 = require("../../entities");
const base_db_limiter_1 = require("./base_db_limiter");
class MetaTransactionDailyLimiter extends base_db_limiter_1.MetaTransactionBaseDbRateLimiter {
    constructor(field, dbConnection, config) {
        super(field);
        this._transactionRepository = dbConnection.getRepository(entities_1.TransactionEntity);
        this._dailyLimit = config.allowedDailyLimit;
    }
    isAllowedAsync(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getKeyFromContextOrThrow(context);
            const { count } = yield this._transactionRepository
                .createQueryBuilder('tx')
                .select('COUNT(*)', 'count')
                .where(`tx.${this._dbField} = :key`, { key })
                .andWhere('DATE(tx.created_at) = CURRENT_DATE')
                .getRawOne();
            const isAllowed = parseInt(count, 10) < this._dailyLimit;
            return isAllowed
                ? { isAllowed }
                : {
                    isAllowed,
                    reason: `daily limit of ${this._dailyLimit} meta transactions reached for given ${this._dbField}`,
                };
        });
    }
}
exports.MetaTransactionDailyLimiter = MetaTransactionDailyLimiter;
//# sourceMappingURL=meta_transaction_daily_limiter.js.map