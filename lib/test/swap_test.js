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
const contract_wrappers_1 = require("@0x/contract-wrappers");
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const dev_utils_1 = require("@0x/dev-utils");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const HttpStatus = require("http-status-codes");
const _ = require("lodash");
require("mocha");
const config = require("../src/config");
const constants_1 = require("../src/constants");
const errors_1 = require("../src/errors");
const logger_1 = require("../src/logger");
const constants_2 = require("./constants");
const deployment_1 = require("./utils/deployment");
const http_utils_1 = require("./utils/http_utils");
const mesh_test_utils_1 = require("./utils/mesh_test_utils");
const mocks_1 = require("./utils/mocks");
const SUITE_NAME = '/swap/v1';
const SWAP_PATH = `${constants_1.SWAP_PATH}/v1`;
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
    const invalidTakerAddress = '0x0000000000000000000000000000000000000001';
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
        [, /* makerAdddress, */ takerAddress] = accounts;
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
        const wethToken = new contract_wrappers_1.WETH9Contract(constants_2.CONTRACT_ADDRESSES.etherToken, provider);
        const zrxToken = new contracts_erc20_1.DummyERC20TokenContract(constants_2.CONTRACT_ADDRESSES.zrxToken, provider);
        // EP setup so maker address can take
        yield zrxToken.mint(constants_2.MAX_MINT_AMOUNT).awaitTransactionSuccessAsync({ from: takerAddress });
        yield wethToken.deposit().awaitTransactionSuccessAsync({ from: takerAddress, value: mesh_test_utils_1.MAKER_WETH_AMOUNT });
        yield wethToken
            .approve(constants_2.CONTRACT_ADDRESSES.exchangeProxyAllowanceTarget, constants_2.MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
        yield zrxToken
            .approve(constants_2.CONTRACT_ADDRESSES.exchangeProxyAllowanceTarget, constants_2.MAX_INT)
            .awaitTransactionSuccessAsync({ from: takerAddress });
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
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
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
                        buyAmount: new utils_1.BigNumber(parameters.buyAmount),
                        sellTokenAddress: parameters.sellToken.startsWith('0x')
                            ? parameters.sellToken
                            : constants_2.SYMBOL_TO_ADDRESS[parameters.sellToken],
                        buyTokenAddress: parameters.buyToken.startsWith('0x')
                            ? parameters.buyToken
                            : constants_2.SYMBOL_TO_ADDRESS[parameters.buyToken],
                        allowanceTarget: constants_2.CONTRACT_ADDRESSES.exchangeProxyAllowanceTarget,
                    });
                }));
            }
        }));
        it('should respect buyAmount', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ buyAmount: '1234' }, { buyAmount: new utils_1.BigNumber(1234) });
        }));
        it('should respect sellAmount', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ sellAmount: '1234' }, { sellAmount: new utils_1.BigNumber(1234) });
        }));
        it('should respect gasPrice', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({ sellAmount: '1234', gasPrice: '150000000000' }, { gasPrice: new utils_1.BigNumber('150000000000') });
        }));
        it('should respect excludedSources', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({
                sellAmount: '1234',
                excludedSources: Object.values(asset_swapper_1.ERC20BridgeSource).join(','),
            }, {
                validationErrors: [
                    {
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                        field: 'excludedSources',
                        reason: 'Request excluded all sources',
                    },
                ],
            });
        }));
        it('should return a ExchangeProxy transaction for sellToken=ETH', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({
                sellToken: 'WETH',
                sellAmount: '1234',
            }, {
                to: constants_2.CONTRACT_ADDRESSES.exchangeProxy,
            });
            yield quoteAndExpectAsync({
                sellToken: 'ETH',
                sellAmount: '1234',
            }, {
                to: constants_2.CONTRACT_ADDRESSES.exchangeProxy,
            });
        }));
        it('should not throw a validation error if takerAddress can complete the quote', () => __awaiter(void 0, void 0, void 0, function* () {
            // The maker has an allowance
            yield quoteAndExpectAsync({
                takerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            }, {
                sellAmount: new utils_1.BigNumber(10000),
            });
        }));
        it('should throw a validation error if takerAddress cannot complete the quote', () => __awaiter(void 0, void 0, void 0, function* () {
            // The taker does not have an allowance
            yield quoteAndExpectAsync({
                takerAddress: invalidTakerAddress,
                sellToken: 'WETH',
                buyToken: 'ZRX',
                sellAmount: '10000',
            }, {
                revertErrorReason: 'SpenderERC20TransferFromFailedError',
            });
        }));
        it('should not return estimatedGasTokenRefund: 0 if there are not gas tokens in our wallet', () => __awaiter(void 0, void 0, void 0, function* () {
            yield quoteAndExpectAsync({
                sellAmount: '1234',
            }, {
                estimatedGasTokenRefund: contracts_test_utils_1.constants.ZERO_AMOUNT,
            });
        }));
        describe('affiliate fees', () => {
            const sellQuoteParams = Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { sellAmount: contracts_test_utils_1.getRandomInteger(1, 100000).toString() });
            const buyQuoteParams = Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyAmount: contracts_test_utils_1.getRandomInteger(1, 100000).toString() });
            let sellQuoteWithoutFee;
            let buyQuoteWithoutFee;
            before(() => __awaiter(void 0, void 0, void 0, function* () {
                const sellQuoteRoute = http_utils_1.constructRoute({
                    baseRoute: `${SWAP_PATH}/quote`,
                    queryParams: sellQuoteParams,
                });
                const sellQuoteResponse = yield http_utils_1.httpGetAsync({ route: sellQuoteRoute });
                sellQuoteWithoutFee = sellQuoteResponse.body;
                const buyQuoteRoute = http_utils_1.constructRoute({
                    baseRoute: `${SWAP_PATH}/quote`,
                    queryParams: buyQuoteParams,
                });
                const buyQuoteResponse = yield http_utils_1.httpGetAsync({ route: buyQuoteRoute });
                buyQuoteWithoutFee = buyQuoteResponse.body;
            }));
            it('can add a buy token affiliate fee to a sell quote', () => __awaiter(void 0, void 0, void 0, function* () {
                const feeRecipient = contracts_test_utils_1.randomAddress();
                const buyTokenPercentageFee = contracts_test_utils_1.getRandomFloat(0, 1);
                yield quoteAndExpectAsync(Object.assign(Object.assign({}, sellQuoteParams), { feeRecipient, buyTokenPercentageFee: buyTokenPercentageFee.toString() }), _.omit(Object.assign(Object.assign({}, sellQuoteWithoutFee), { buyAmount: new utils_1.BigNumber(sellQuoteWithoutFee.buyAmount).dividedBy(constants_1.ONE.plus(buyTokenPercentageFee)), estimatedGas: new utils_1.BigNumber(sellQuoteWithoutFee.estimatedGas).plus(constants_1.AFFILIATE_FEE_TRANSFORMER_GAS), gas: new utils_1.BigNumber(sellQuoteWithoutFee.gas).plus(constants_1.AFFILIATE_FEE_TRANSFORMER_GAS.times(constants_1.GAS_LIMIT_BUFFER_MULTIPLIER)), price: new utils_1.BigNumber(sellQuoteWithoutFee.price).dividedBy(constants_1.ONE.plus(buyTokenPercentageFee)), guaranteedPrice: new utils_1.BigNumber(sellQuoteWithoutFee.guaranteedPrice).dividedBy(constants_1.ONE.plus(buyTokenPercentageFee)) }), 'data'));
            }));
            it('can add a buy token affiliate fee to a buy quote', () => __awaiter(void 0, void 0, void 0, function* () {
                const feeRecipient = contracts_test_utils_1.randomAddress();
                const buyTokenPercentageFee = contracts_test_utils_1.getRandomFloat(0, 1);
                yield quoteAndExpectAsync(Object.assign(Object.assign({}, buyQuoteParams), { feeRecipient, buyTokenPercentageFee: buyTokenPercentageFee.toString() }), _.omit(Object.assign(Object.assign({}, buyQuoteWithoutFee), { estimatedGas: new utils_1.BigNumber(buyQuoteWithoutFee.estimatedGas).plus(constants_1.AFFILIATE_FEE_TRANSFORMER_GAS), gas: new utils_1.BigNumber(buyQuoteWithoutFee.gas).plus(constants_1.AFFILIATE_FEE_TRANSFORMER_GAS.times(constants_1.GAS_LIMIT_BUFFER_MULTIPLIER)), price: new utils_1.BigNumber(buyQuoteWithoutFee.price).times(constants_1.ONE.plus(buyTokenPercentageFee)), guaranteedPrice: new utils_1.BigNumber(buyQuoteWithoutFee.guaranteedPrice).times(constants_1.ONE.plus(buyTokenPercentageFee)) }), ['data', 'sellAmount']));
            }));
            it('validation error if given a non-zero sell token fee', () => __awaiter(void 0, void 0, void 0, function* () {
                const feeRecipient = contracts_test_utils_1.randomAddress();
                yield quoteAndExpectAsync(Object.assign(Object.assign({}, sellQuoteParams), { feeRecipient, sellTokenPercentageFee: '0.01' }), {
                    validationErrors: [
                        {
                            code: errors_1.ValidationErrorCodes.UnsupportedOption,
                            field: 'sellTokenPercentageFee',
                            reason: errors_1.ValidationErrorReasons.ArgumentNotYetSupported,
                        },
                    ],
                });
            }));
            it('validation error if given an invalid percentage', () => __awaiter(void 0, void 0, void 0, function* () {
                const feeRecipient = contracts_test_utils_1.randomAddress();
                yield quoteAndExpectAsync(Object.assign(Object.assign({}, sellQuoteParams), { feeRecipient, buyTokenPercentageFee: '1.01' }), {
                    validationErrors: [
                        {
                            code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                            field: 'buyTokenPercentageFee',
                            reason: errors_1.ValidationErrorReasons.PercentageOutOfRange,
                        },
                    ],
                });
            }));
        });
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
            logger_1.logger.warn(response.body);
        }
        contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
        expectCorrectQuote(response.body, quoteAssertions);
    });
}
const PRECISION = 4;
function expectCorrectQuote(quoteResponse, quoteAssertions) {
    for (const property of Object.keys(quoteAssertions)) {
        if (utils_1.BigNumber.isBigNumber(quoteAssertions[property])) {
            contracts_test_utils_1.assertRoughlyEquals(quoteResponse[property], quoteAssertions[property], PRECISION);
        }
        else {
            contracts_test_utils_1.expect(quoteResponse[property], property).to.eql(quoteAssertions[property]);
        }
    }
    // Only have 0x liquidity for now.
    contracts_test_utils_1.expect(quoteResponse.sources).to.be.eql(mocks_1.liquiditySources0xOnly);
}
//# sourceMappingURL=swap_test.js.map