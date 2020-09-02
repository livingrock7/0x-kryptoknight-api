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
exports.Signer = void 0;
const dev_utils_1 = require("@0x/dev-utils");
const subproviders_1 = require("@0x/subproviders");
const utils_1 = require("@0x/utils");
const utils_2 = require("@0x/web3-wrapper/lib/src/utils");
const constants_1 = require("../constants");
const logger_1 = require("../logger");
const subprovider_adapter_1 = require("./subprovider_adapter");
class Signer {
    constructor(privateKeyHex, provider) {
        this._privateWalletSubprovider = new subproviders_1.PrivateKeyWalletSubprovider(privateKeyHex);
        this._provider = Signer._createWeb3Provider(provider, this._privateWalletSubprovider);
        this._web3Wrapper = new dev_utils_1.Web3Wrapper(this._provider);
        this.publicAddress = this._privateWalletSubprovider._address;
    }
    static _createWeb3Provider(provider, privateWalletSubprovider) {
        const providerEngine = new subproviders_1.Web3ProviderEngine();
        providerEngine.addProvider(privateWalletSubprovider);
        providerEngine.addProvider(new subprovider_adapter_1.SubproviderAdapter(provider));
        utils_1.providerUtils.startProviderEngine(providerEngine);
        return providerEngine;
    }
    signAndBroadcastMetaTxAsync(to, data, value, gasPrice) {
        return __awaiter(this, void 0, void 0, function* () {
            const nonceHex = yield this._getNonceAsync(this.publicAddress);
            const nonce = utils_2.utils.convertHexToNumber(nonceHex);
            const from = this.publicAddress;
            const estimatedGas = yield this._web3Wrapper.estimateGasAsync({
                to,
                from,
                gasPrice,
                data,
                value,
            });
            // Boost the gas by a small percentage to buffer transactions
            // where the behaviour isn't always deterministic
            const gas = new utils_1.BigNumber(estimatedGas)
                .times(constants_1.GAS_LIMIT_BUFFER_PERCENTAGE + 1)
                .integerValue()
                .toNumber();
            logger_1.logger.info({
                message: `attempting to sign and broadcast a meta transaction`,
                nonce,
                from,
                gas,
                gasPrice,
            });
            const txHash = yield this._web3Wrapper.sendTransactionAsync({
                to,
                from,
                data,
                gas,
                gasPrice,
                value,
                nonce,
            });
            logger_1.logger.info({
                message: 'signed and broadcasted a meta transaction',
                txHash,
                from,
            });
            return {
                ethereumTxnParams: {
                    from,
                    nonce,
                    gas,
                },
                ethereumTransactionHash: txHash,
            };
        });
    }
    sendTransactionToItselfWithNonceAsync(nonce, gasPrice) {
        return __awaiter(this, void 0, void 0, function* () {
            const ethereumTxnParams = {
                from: this.publicAddress,
                to: this.publicAddress,
                value: 0,
                nonce,
                gasPrice,
                gas: constants_1.ETH_TRANSFER_GAS_LIMIT,
            };
            return this._web3Wrapper.sendTransactionAsync(ethereumTxnParams);
        });
    }
    _getNonceAsync(senderAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const nonce = yield this._getTransactionCountAsync(senderAddress);
            return nonce;
        });
    }
    _getTransactionCountAsync(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const nonceHex = yield this._web3Wrapper.sendRawPayloadAsync({
                method: 'eth_getTransactionCount',
                params: [address, 'pending'],
            });
            logger_1.logger.info({
                message: 'received nonce from eth_getTransactionCount',
                nonceNumber: utils_2.utils.convertHexToNumber(nonceHex),
            });
            return nonceHex;
        });
    }
}
exports.Signer = Signer;
//# sourceMappingURL=signer.js.map