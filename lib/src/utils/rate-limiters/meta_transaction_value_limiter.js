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
exports.MetaTransactionRollingValueLimiter = void 0;
const entities_1 = require("../../entities");
const base_db_limiter_1 = require("./base_db_limiter");
class MetaTransactionRollingValueLimiter extends base_db_limiter_1.MetaTransactionBaseDbRateLimiter {
    constructor(field, dbConnection, config) {
        super(field);
        this._transactionRepository = dbConnection.getRepository(entities_1.TransactionEntity);
        this._ethLimit = config.allowedLimitEth;
        this._intervalNumber = config.intervalNumber;
        this._intervalUnit = config.intervalUnit;
    }
    isAllowedAsync(context) {
        return __awaiter(this, void 0, void 0, function* () {
            const key = this.getKeyFromContextOrThrow(context);
            const { sum } = yield this._transactionRepository
                .createQueryBuilder('tx')
                .select('SUM((tx.gas_price * tx.gas_used + tx.value) * 1e-18)', 'sum')
                .where(`tx.${this._dbField} = :key`, { key })
                .andWhere('AGE(NOW(), tx.created_at) < :interval', {
                interval: `'${this._intervalNumber} ${this._intervalUnit}'`,
            })
                .getRawOne();
            const isAllowed = parseFloat(sum) < this._ethLimit;
            return isAllowed
                ? { isAllowed }
                : {
                    isAllowed,
                    reason: `limit of ${this._ethLimit} ETH spent in the last ${this._intervalNumber} ${this._intervalUnit}`,
                };
        });
    }
}
exports.MetaTransactionRollingValueLimiter = MetaTransactionRollingValueLimiter;
//# sourceMappingURL=meta_transaction_value_limiter.js.map