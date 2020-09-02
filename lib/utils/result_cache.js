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
exports.createResultCache = void 0;
const constants_1 = require("../constants");
const logger_1 = require("../logger");
exports.createResultCache = (fn, cacheExpiryMs = constants_1.TEN_MINUTES_MS) => {
    const resultCache = {};
    return {
        getResultAsync: (getArgs) => __awaiter(void 0, void 0, void 0, function* () {
            let timestamp = resultCache[getArgs] && resultCache[getArgs].timestamp;
            let result = resultCache[getArgs] && resultCache[getArgs].result;
            if (!result || !timestamp || timestamp < Date.now() - cacheExpiryMs) {
                try {
                    result = yield fn(getArgs);
                    timestamp = Date.now();
                    resultCache[getArgs] = { timestamp, result };
                }
                catch (e) {
                    if (!result) {
                        // Throw if we've never received a result
                        throw e;
                    }
                    logger_1.logger.warn(`Error performing cache miss update: ${e}`);
                }
            }
            return { timestamp, result };
        }),
    };
};
//# sourceMappingURL=result_cache.js.map