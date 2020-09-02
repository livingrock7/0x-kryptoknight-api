"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerUtils = void 0;
const subproviders_1 = require("@0x/subproviders");
const utils_1 = require("@0x/utils");
exports.providerUtils = {
    createWeb3Provider: (rpcHost) => {
        const providerEngine = new subproviders_1.Web3ProviderEngine();
        providerEngine.addProvider(new subproviders_1.RPCSubprovider(rpcHost));
        utils_1.providerUtils.startProviderEngine(providerEngine);
        return providerEngine;
    },
};
//# sourceMappingURL=provider_utils.js.map