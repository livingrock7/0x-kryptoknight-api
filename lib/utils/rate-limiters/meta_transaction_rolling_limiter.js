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
exports.MetaTransactionRollingLimiter = void 0;
const entities_1 = require("../../entities");
const base_db_limiter_1 = require("./base_db_limiter");
class MetaTransactionRollingLimiter extends base_db_limiter_1.MetaTransactionBaseDbRateLimiter {
    constructor(field, dbConnection, config) {
        super(field);
        this._transactionRepository = dbConnection.getRepository(entities_1.TransactionEntity);
        this._limit = config.allowedLimit;
        this._intervalNumber = config.intervalNumber;
        this._intervalUnit = config.intervalUnit;
    }
    isAllowedAsync(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getKeyFromContextOrThrow(context);
            const { count } = yield this._transactionRepository
                .createQueryBuilder('tx')
                .select('COUNT(*)', 'count')
                .where(`tx.${this._dbField} = :key`, { key })
                .andWhere('AGE(NOW(), tx.created_at) < :interval', {
                interval: `'${this._intervalNumber} ${this._intervalUnit}'`,
            })
                .getRawOne();
            const isAllowed = parseInt(count, 10) < this._limit;
            return isAllowed
                ? { isAllowed }
                : {
                    isAllowed,
                    reason: `limit of ${this._limit} meta transactions in the last ${this._intervalNumber} ${this._intervalUnit}`,
                };
        });
    }
}
exports.MetaTransactionRollingLimiter = MetaTransactionRollingLimiter;
//# sourceMappingURL=meta_transaction_rolling_limiter.js.map