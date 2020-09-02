"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AFFILIATE_DATA_SELECTOR = exports.SYMBOL_TO_ADDRESS = exports.UNKNOWN_TOKEN_ASSET_DATA = exports.UNKNOWN_TOKEN_ADDRESS = exports.WETH_ASSET_DATA = exports.ZRX_ASSET_DATA = exports.WETH_TOKEN_ADDRESS = exports.ZRX_TOKEN_ADDRESS = exports.CONTRACT_ADDRESSES = exports.MAX_MINT_AMOUNT = exports.MAX_INT = exports.CHAIN_ID = void 0;
const contract_addresses_1 = require("@0x/contract-addresses");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
exports.CHAIN_ID = 1337;
// tslint:disable-next-line:custom-no-magic-numbers
exports.MAX_INT = new utils_1.BigNumber(2).pow(256).minus(1);
exports.MAX_MINT_AMOUNT = new utils_1.BigNumber('10000000000000000000000');
exports.CONTRACT_ADDRESSES = contract_addresses_1.getContractAddressesForChainOrThrow(exports.CHAIN_ID);
exports.ZRX_TOKEN_ADDRESS = exports.CONTRACT_ADDRESSES.zrxToken;
exports.WETH_TOKEN_ADDRESS = exports.CONTRACT_ADDRESSES.etherToken;
exports.ZRX_ASSET_DATA = order_utils_1.assetDataUtils.encodeERC20AssetData(exports.ZRX_TOKEN_ADDRESS);
exports.WETH_ASSET_DATA = order_utils_1.assetDataUtils.encodeERC20AssetData(exports.WETH_TOKEN_ADDRESS);
exports.UNKNOWN_TOKEN_ADDRESS = '0xbe0037eaf2d64fe5529bca93c18c9702d3930376';
exports.UNKNOWN_TOKEN_ASSET_DATA = order_utils_1.assetDataUtils.encodeERC20AssetData(exports.UNKNOWN_TOKEN_ADDRESS);
exports.SYMBOL_TO_ADDRESS = {
    ZRX: exports.ZRX_TOKEN_ADDRESS,
    WETH: exports.WETH_TOKEN_ADDRESS,
};
exports.AFFILIATE_DATA_SELECTOR = '869584cd';
//# sourceMappingURL=constants.js.map