"use strict";
// tslint:disable:no-console
// tslint:disable:no-unbound-method
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
exports.TestMetaTxnUser = void 0;
const order_utils_1 = require("@0x/order-utils");
const subproviders_1 = require("@0x/subproviders");
const utils_1 = require("@0x/utils");
class TestMetaTxnUser {
    constructor() {
        const TAKER_ADDRESS = process.env.TAKER_ADDRESS;
        const TAKER_PRIVATE_KEY = process.env.TAKER_PRIVATE_KEY;
        const TAKER_RPC_ADDR = process.env.TAKER_RPC_ADDR;
        if (TAKER_ADDRESS === utils_1.NULL_ADDRESS || TAKER_ADDRESS === undefined) {
            throw new Error(`TAKER_ADDRESS must be specified`);
        }
        if (TAKER_PRIVATE_KEY === '' || TAKER_PRIVATE_KEY === undefined) {
            throw new Error(`TAKER_PRIVATE_KEY must be specified`);
        }
        if (TAKER_RPC_ADDR === undefined) {
            throw new Error(`TAKER_RPC_ADDR must be specified`);
        }
        this._takerAddress = TAKER_ADDRESS;
        this._takerPrivateKey = TAKER_PRIVATE_KEY;
        this._provider = this._createWeb3Provider();
    }
    // tslint:disable-next-line
    getQuoteString(buyToken, sellToken, buyAmount) {
        return `?buyToken=${buyToken}&sellToken=${sellToken}&buyAmount=${buyAmount}&takerAddress=${this._takerAddress}`;
    }
    signAsync(zeroExTransactionHash) {
        return __awaiter(this, void 0, void 0, function* () {
            return order_utils_1.signatureUtils.ecSignHashAsync(this._provider, zeroExTransactionHash, this._takerAddress);
        });
    }
    signTransactionAsync(zeroExTransaction) {
        return __awaiter(this, void 0, void 0, function* () {
            return order_utils_1.signatureUtils.ecSignTransactionAsync(this._provider, zeroExTransaction, this._takerAddress);
        });
    }
    _createWeb3Provider() {
        const provider = new subproviders_1.Web3ProviderEngine();
        provider.addProvider(new subproviders_1.PrivateKeyWalletSubprovider(this._takerPrivateKey));
        utils_1.providerUtils.startProviderEngine(provider);
        return provider;
    }
}
exports.TestMetaTxnUser = TestMetaTxnUser;
//# sourceMappingURL=test_signer.js.map