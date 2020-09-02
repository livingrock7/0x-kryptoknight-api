"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigNumberTransformer = exports.ZeroExTransactionWithoutDomainTransformer = exports.BigIntTransformer = void 0;
const utils_1 = require("@0x/utils");
exports.BigIntTransformer = {
    from: (value) => {
        if (value === null) {
            return null;
        }
        const num = Number(value);
        if (!Number.isSafeInteger(num)) {
            throw new Error('unsafe integer precision when transforming value');
        }
        return value === null ? null : Number(value);
    },
    to: (value) => {
        if (value === null || value === undefined) {
            return null;
        }
        if (!Number.isSafeInteger(value)) {
            throw new Error('unsafe integer precision when transforming value');
        }
        return value.toString();
    },
};
exports.ZeroExTransactionWithoutDomainTransformer = {
    from: (value) => {
        if (value === undefined || value === null) {
            return null;
        }
        const obj = JSON.parse(value);
        obj.salt = new utils_1.BigNumber(obj.salt);
        obj.expirationTimeSeconds = new utils_1.BigNumber(obj.expirationTimeSeconds);
        obj.gasPrice = new utils_1.BigNumber(obj.gasPrice);
        return obj;
    },
    to: (value) => {
        if (value === null || value === undefined) {
            return null;
        }
        const objToStore = Object.assign(Object.assign({}, value), { salt: value.salt.toString(), expirationTimeSeconds: value.expirationTimeSeconds.toString(), gasPrice: value.gasPrice.toString() });
        return JSON.stringify(objToStore);
    },
};
exports.BigNumberTransformer = {
    from: (value) => {
        return value === null ? null : new utils_1.BigNumber(value);
    },
    to: (value) => {
        return value === null || value === undefined ? null : value.toString();
    },
};
//# sourceMappingURL=transformers.js.map