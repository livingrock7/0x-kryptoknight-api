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
exports.ethGasStationUtils = void 0;
const utils_1 = require("@0x/utils");
const config_1 = require("../config");
const constants_1 = require("../constants");
let previousGasInfo;
let lastAccessed;
const CACHE_EXPIRY_SEC = 60;
const getGasInfoAsync = () => __awaiter(void 0, void 0, void 0, function* () {
    const now = Date.now() / constants_1.ONE_SECOND_MS;
    if (!previousGasInfo || now - CACHE_EXPIRY_SEC > lastAccessed) {
        try {
            const res = yield fetch(config_1.ETH_GAS_STATION_API_URL);
            previousGasInfo = yield res.json();
            lastAccessed = now;
        }
        catch (e) {
            throw new Error('Failed to fetch gas price from EthGasStation');
        }
    }
    return previousGasInfo;
});
exports.ethGasStationUtils = {
    getGasPriceOrThrowAsync: () => __awaiter(void 0, void 0, void 0, function* () {
        const gasInfo = yield getGasInfoAsync();
        // Eth Gas Station result is gwei * 10
        // tslint:disable-next-line:custom-no-magic-numbers
        const BASE_TEN = 10;
        const gasPriceGwei = new utils_1.BigNumber(gasInfo.fast / BASE_TEN);
        // tslint:disable-next-line:custom-no-magic-numbers
        const unit = new utils_1.BigNumber(BASE_TEN).pow(9);
        const gasPriceWei = unit.times(gasPriceGwei);
        return gasPriceWei;
    }),
};
//# sourceMappingURL=gas_station_utils.js.map