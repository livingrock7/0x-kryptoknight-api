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
exports.MeshTestUtils = exports.MAKER_WETH_AMOUNT = exports.DEFAULT_MAKER_ASSET_AMOUNT = void 0;
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const mesh_rpc_client_1 = require("@0x/mesh-rpc-client");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const constants_1 = require("../constants");
exports.DEFAULT_MAKER_ASSET_AMOUNT = new utils_1.BigNumber(1);
exports.MAKER_WETH_AMOUNT = new utils_1.BigNumber('1000000000000000000');
class MeshTestUtils {
    constructor(_provider) {
        this._provider = _provider;
        this._contractAddresses = constants_1.CONTRACT_ADDRESSES;
        this._web3Wrapper = new web3_wrapper_1.Web3Wrapper(_provider);
    }
    // TODO: This can be extended to allow more types of orders to be created. Some changes
    // that might be desirable are to allow different makers to be used, different assets to
    // be used, etc.
    addOrdersWithPricesAsync(prices) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!prices.length) {
                throw new Error('[mesh-utils] Must provide at least one price to `addOrdersAsync`');
            }
            const orders = [];
            for (const price of prices) {
                orders.push(yield this._orderFactory.newSignedOrderAsync({
                    takerAssetAmount: exports.DEFAULT_MAKER_ASSET_AMOUNT.times(price),
                    // tslint:disable-next-line:custom-no-magic-numbers
                    expirationTimeSeconds: new utils_1.BigNumber(Date.now() + 24 * 3600),
                }));
            }
            const validationResults = yield this._meshClient.addOrdersAsync(orders);
            // NOTE(jalextowle): Wait for the 0x-api to catch up.
            yield sleepAsync(2);
            return validationResults;
        });
    }
    addPartialOrdersAsync(orders) {
        return __awaiter(this, void 0, void 0, function* () {
            const signedOrders = yield Promise.all(orders.map(order => this._orderFactory.newSignedOrderAsync(order)));
            const validationResults = yield this._meshClient.addOrdersAsync(signedOrders);
            yield sleepAsync(2);
            return validationResults;
        });
    }
    getOrdersAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            return this._meshClient.getOrdersAsync();
        });
    }
    setupUtilsAsync() {
        return __awaiter(this, void 0, void 0, function* () {
            this._meshClient = new mesh_rpc_client_1.WSClient('ws://localhost:60557');
            this._zrxToken = new contracts_erc20_1.DummyERC20TokenContract(this._contractAddresses.zrxToken, this._provider);
            this._wethToken = new contracts_erc20_1.WETH9Contract(this._contractAddresses.etherToken, this._provider);
            this._accounts = yield this._web3Wrapper.getAvailableAddressesAsync();
            [this._makerAddress] = this._accounts;
            const defaultOrderParams = Object.assign(Object.assign({}, contracts_test_utils_1.constants.STATIC_ORDER_PARAMS), { makerAddress: this._makerAddress, feeRecipientAddress: contracts_test_utils_1.constants.NULL_ADDRESS, makerAssetData: order_utils_1.assetDataUtils.encodeERC20AssetData(this._zrxToken.address), takerAssetData: order_utils_1.assetDataUtils.encodeERC20AssetData(this._wethToken.address), makerAssetAmount: exports.DEFAULT_MAKER_ASSET_AMOUNT, makerFeeAssetData: '0x', takerFeeAssetData: '0x', makerFee: contracts_test_utils_1.constants.ZERO_AMOUNT, takerFee: contracts_test_utils_1.constants.ZERO_AMOUNT, exchangeAddress: this._contractAddresses.exchange, chainId: constants_1.CHAIN_ID });
            const privateKey = contracts_test_utils_1.constants.TESTRPC_PRIVATE_KEYS[this._accounts.indexOf(this._makerAddress)];
            this._orderFactory = new contracts_test_utils_1.OrderFactory(privateKey, defaultOrderParams);
            // NOTE(jalextowle): The way that Mesh validation currently works allows us
            // to only set the maker balance a single time. If this changes in the future,
            // this logic may need to be added to `addOrdersAsync`.
            yield this._zrxToken.mint(constants_1.MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: this._makerAddress });
            yield this._zrxToken
                .approve(this._contractAddresses.erc20Proxy, constants_1.MAX_INT)
                .awaitTransactionSuccessAsync({ from: this._makerAddress });
            yield this._wethToken
                .deposit()
                .awaitTransactionSuccessAsync({ from: this._makerAddress, value: exports.MAKER_WETH_AMOUNT });
            yield this._wethToken
                .approve(this._contractAddresses.erc20Proxy, constants_1.MAX_INT)
                .awaitTransactionSuccessAsync({ from: this._makerAddress });
            // NOTE(jalextowle): Mesh's blockwatcher must catch up to the most
            // recently mined block for the mint and approval transactions to
            // be recognized. This is added here in case `addOrdersAsync` is called
            // immediately after this function.
            yield sleepAsync(2);
        });
    }
}
exports.MeshTestUtils = MeshTestUtils;
function sleepAsync(timeSeconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            const secondsPerMillisecond = 1000;
            setTimeout(resolve, timeSeconds * secondsPerMillisecond);
        });
    });
}
//# sourceMappingURL=mesh_test_utils.js.map