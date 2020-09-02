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
const asset_swapper_1 = require("@0x/asset-swapper");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const dev_utils_1 = require("@0x/dev-utils");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const HttpStatus = require("http-status-codes");
require("mocha");
const config = require("../src/config");
const constants_1 = require("../src/constants");
const logger_1 = require("../src/logger");
const constants_2 = require("./constants");
const deployment_1 = require("./utils/deployment");
const http_utils_1 = require("./utils/http_utils");
const mesh_test_utils_1 = require("./utils/mesh_test_utils");
const mocks_1 = require("./utils/mocks");
const SUITE_NAME = '/swap/v0';
const SWAP_PATH = `${constants_1.SWAP_PATH}/v0`;
const EXCLUDED_SOURCES = Object.values(asset_swapper_1.ERC20BridgeSource).filter(s => s !== asset_swapper_1.ERC20BridgeSource.Native);
const DEFAULT_QUERY_PARAMS = {
    buyToken: 'ZRX',
    sellToken: 'WETH',
    excludedSources: EXCLUDED_SOURCES.join(','),
};
const ONE_THOUSAND_IN_BASE = new utils_1.BigNumber('1000000000000000000000');
describe(SUITE_NAME, () => {
    let meshUtils;
    let accounts;
    let takerAddress;
    let makerAddress;
    let blockchainLifecycle;
    let provider;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        yield deployment_1.setupApiAsync(SUITE_NAME);
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config.ETHEREUM_RPC_URL,
        };
        provider = dev_utils_1.web3Factory.getRpcProvider(ganacheConfigs);
        const web3Wrapper = new web3_wrapper_1.Web3Wrapper(provider);
        blockchainLifecycle = new dev_utils_1.BlockchainLifecycle(web3Wrapper);
        accounts = yield web3Wrapper.getAvailableAddressesAsync();
        [makerAddress, takerAddress] = accounts;
        // Set up liquidity.
        yield blockchainLifecycle.startAsync();
        yield deployment_1.setupMeshAsync(SUITE_NAME);
        meshUtils = new mesh_test_utils_1.MeshTestUtils(provider);
        yield meshUtils.setupUtilsAsync();
        yield meshUtils.addPartialOrdersAsync([
            {
                makerAssetData: constants_2.ZRX_ASSET_DATA,
                takerAssetData: constants_2.WETH_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
            {
                makerAssetData: constants_2.ZRX_ASSET_DATA,
                takerAssetData: constants_2.WETH_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                // tslint:disable:custom-no-magic-numbers
                takerAssetAmount: ONE_THOUSAND_IN_BASE.multipliedBy(2),
            },
            {
                makerAssetData: constants_2.ZRX_ASSET_DATA,
                takerAssetData: constants_2.WETH_ASSET_DATA,
                makerAssetAmount: constants_2.MAX_MINT_AMOUNT,
                // tslint:disable:custom-no-magic-numbers
                takerAssetAmount: ONE_THOUSAND_IN_BASE.multipliedBy(3),
            },
            {
                makerAssetData: constants_2.WETH_ASSET_DATA,
                takerAssetData: constants_2.ZRX_ASSET_DATA,
                makerAssetAmount: mesh_test_utils_1.MAKER_WETH_AMOUNT,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
            {
                makerAssetData: constants_2.ZRX_ASSET_DATA,
                takerAssetData: constants_2.UNKNOWN_TOKEN_ASSET_DATA,
                makerAssetAmount: ONE_THOUSAND_IN_BASE,
                takerAssetAmount: ONE_THOUSAND_IN_BASE,
            },
        ]);
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield blockchainLifecycle.revertAsync();
        yield deployment_1.teardownMeshAsync(SUITE_NAME);
        yield deployment_1.teardownApiAsync(SUITE_NAME);
    }));
    describe('/quote', () => {
        it("with INSUFFICIENT_ASSET_LIQUIDITY when there's no liquidity (empty orderbook, sampling excluded, no RFQ)", () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ buyAmount: '10000000000000000000000000000000' }, {
                validationErrors: [
                    {
                        code: 1004,
                        field: 'buyAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            });
        }));
        describe(`valid token parameter permutations`, () => __awaiter(void 0, void 0, void 0, function* () {
            const parameterPermutations = [
                { buyToken: 'ZRX', sellToken: 'WETH', buyAmount: '1000' },
                { buyToken: 'WETH', sellToken: 'ZRX', buyAmount: '1000' },
                { buyToken: constants_2.ZRX_TOKEN_ADDRESS, sellToken: 'WETH', buyAmount: '1000' },
                { buyToken: constants_2.ZRX_TOKEN_ADDRESS, sellToken: constants_2.WETH_TOKEN_ADDRESS, buyAmount: '1000' },
                { buyToken: 'ZRX', sellToken: constants_2.UNKNOWN_TOKEN_ADDRESS, buyAmount: '1000' },
            ];
            for (const parameters of parameterPermutations) {
                it(`should return a valid quote with ${JSON.stringify(parameters)}`, () => __awaiter(void 0, void 0, void 0, function* () {
                    yield quoteAndExpectAsync(parameters, {
                        buyAmount: parameters.buyAmount,
                        sellTokenAddress: parameters.sellToken.startsWith('0x')
                            ? parameters.sellToken
                            : constants_2.SYMBOL_TO_ADDRESS[parameters.sellToken],
                        buyTokenAddress: parameters.buyToken.startsWith('0x')
                            ? parameters.buyToken
                            : constants_2.SYMBOL_TO_ADDRESS[parameters.buyToken],
                    });
                }));
            }
        }));
        it('should respect buyAmount', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ buyAmount: '1234' }, { buyAmount: '1234' });
        }));
        it('should respect sellAmount', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ sellAmount: '1234' }, { sellAmount: '1234' });
        }));
        it('should respect gasPrice', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ sellAmount: '1234', gasPrice: '150000000000' }, { gasPrice: '150000000000' });
        }));
        it('should respect excludedSources', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({
                sellAmount: '1234',
                excludedSources: Object.values(asset_swapper_1.ERC20BridgeSource).join(','),
            }, {
                validationErrors: [
                    {
                        code: 1004,
                        field: 'excludedSources',
                        reason: 'Request excluded all sources',
                    },
                ],
            });
        }));
        it('should return a Forwarder transaction for sellToken=ETH', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({
                sellToken: 'WETH',
                sellAmount: '1234',
            }, {
                to: constants_2.CONTRACT_ADDRESSES.exchange,
            });
            yield quoteAndExpectAsync({
                sellToken: 'ETH',
                sellAmount: '1234',
            }, {
                to: constants_2.CONTRACT_ADDRESSES.forwarder,
            });
        }));
        it('should not throw a validation error if takerAddress can complete the quote', () => __awaiter(void 0, void 0, void 0, function* () {
            // The maker has an allowance
            yield quoteAndExpectAsync({
                takerAddress: makerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            }, {
                sellAmount: '10000',
            });
        }));
        it('should throw a validation error if takerAddress cannot complete the quote', () => __awaiter(void 0, void 0, void 0, function* () {
            // The taker does not have an allowance
            yield quoteAndExpectAsync({
                takerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            }, {
                revertErrorReason: 'IncompleteFillError',
            });
        }));
        it('should not return estimatedGasTokenRefund: 0 if there are not gas tokens in our wallet', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({
                sellAmount: '1234',
            }, {
                estimatedGasTokenRefund: '0',
            });
        }));
    });
    describe('/tokens', () => {
        it('should return a list of known tokens', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield http_utils_1.httpGetAsync({ route: `${SWAP_PATH}/tokens` });
            contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
            contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
            // tslint:disable-next-line:no-unused-expression
            contracts_test_utils_1.expect(response.body.records).to.be.an('array').that.is.not.empty;
        }));
    });
    describe('/prices', () => {
        it('should return accurate pricing', () => __awaiter(void 0, void 0, void 0, function* () {
            // Defaults to WETH.
            const response = yield http_utils_1.httpGetAsync({ route: `${SWAP_PATH}/prices` });
            contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
            contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body.records[0].price).to.be.eq('0.3');
        }));
        it('should respect the sellToken parameter', () => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield http_utils_1.httpGetAsync({ route: `${SWAP_PATH}/prices?sellToken=ZRX` });
            contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
            contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
            contracts_test_utils_1.expect(response.body.records[0].price).to.be.eq('1000');
        }));
    });
});
function quoteAndExpectAsync(queryParams, quoteAssertions) {
    return __awaiter(this, void 0, void 0, function* () {
        const route = http_utils_1.constructRoute({
            baseRoute: `${SWAP_PATH}/quote`,
            queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), queryParams),
        });
        const response = yield http_utils_1.httpGetAsync({ route });
        contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
        if (quoteAssertions.revertErrorReason) {
            contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
            contracts_test_utils_1.expect(response.body.code).to.eq(105);
            contracts_test_utils_1.expect(response.body.reason).to.be.eql(quoteAssertions.revertErrorReason);
            return;
        }
        if (quoteAssertions.validationErrors) {
            contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
            contracts_test_utils_1.expect(response.body.code).to.eq(100);
            contracts_test_utils_1.expect(response.body.validationErrors).to.be.eql(quoteAssertions.validationErrors);
            return;
        }
        if (response.status !== HttpStatus.OK) {
            logger_1.logger.warn(response);
        }
        contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
        expectCorrectQuote(response.body, quoteAssertions);
    });
}
function expectCorrectQuote(quoteResponse, quoteAssertions) {
    for (const property of Object.keys(quoteAssertions)) {
        contracts_test_utils_1.expect(quoteResponse[property]).to.be.eql(quoteAssertions[property]);
    }
    // Only have 0x liquidity for now.
    contracts_test_utils_1.expect(quoteResponse.sources).to.be.eql(mocks_1.liquiditySources0xOnly);
}
//# sourceMappingURL=swap_v0_test.js.map