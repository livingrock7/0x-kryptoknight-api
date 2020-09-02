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
exports.SubproviderAdapter = void 0;
const subproviders_1 = require("@0x/subproviders");
const utils_1 = require("@0x/utils");
const utils_2 = require("./utils");
class SubproviderAdapter extends subproviders_1.Subprovider {
    constructor(provider) {
        super();
        this._provider = utils_1.providerUtils.standardizeOrThrow(provider);
    }
    // tslint:disable-next-line:async-suffix
    handleRequest(payload, _next, end) {
        return __awaiter(this, void 0, void 0, function* () {
            this._provider.sendAsync(payload, (err, result) => {
                !utils_2.utils.isNil(result) && !utils_2.utils.isNil(result.result)
                    ? end(null, result.result)
                    : end(err || new Error(result.error.message));
            });
        });
    }
}
exports.SubproviderAdapter = SubproviderAdapter;
//# sourceMappingURL=subprovider_adapter.js.map