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
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const dev_utils_1 = require("@0x/dev-utils");
const types_1 = require("@0x/types");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const HttpStatus = require("http-status-codes");
require("mocha");
const app_1 = require("../src/app");
const config = require("../src/config");
const constants_1 = require("../src/constants");
const errors_1 = require("../src/errors");
const types_2 = require("../src/types");
const deployment_1 = require("./utils/deployment");
const http_utils_1 = require("./utils/http_utils");
const mesh_test_utils_1 = require("./utils/mesh_test_utils");
const mocks_1 = require("./utils/mocks");
const SUITE_NAME = 'meta transactions tests';
describe(SUITE_NAME, () => {
    let accounts;
    let chainId;
    let contractAddresses;
    let takerAddress;
    let buyTokenAddress;
    let sellTokenAddress;
    const buyAmount = mesh_test_utils_1.DEFAULT_MAKER_ASSET_AMOUNT.toString();
    let blockchainLifecycle;
    let provider;
    let weth;
    let zrx;
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
        [, takerAddress] = accounts;
        chainId = types_2.ChainId.Ganache;
        contractAddresses = yield app_1.getContractAddressesForNetworkOrThrowAsync(provider, chainId);
        buyTokenAddress = contractAddresses.zrxToken;
        sellTokenAddress = contractAddresses.etherToken;
        weth = new contracts_erc20_1.WETH9Contract(contractAddresses.etherToken, provider);
        zrx = new contracts_erc20_1.DummyERC20TokenContract(contractAddresses.zrxToken, provider);
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield deployment_1.teardownApiAsync(SUITE_NAME);
    }));
    const EXCLUDED_SOURCES = Object.values(asset_swapper_1.ERC20BridgeSource).filter(s => s !== asset_swapper_1.ERC20BridgeSource.Native);
    const DEFAULT_QUERY_PARAMS = {
        buyToken: 'ZRX',
        sellToken: 'WETH',
        buyAmount,
        excludedSources: EXCLUDED_SOURCES.join(','),
    };
    function assertFailureAsync(baseRoute, testCase) {
        return __awaiter(this, void 0, void 0, function* () {
            const route = http_utils_1.constructRoute({
                baseRoute,
                queryParams: testCase.takerAddress ? Object.assign(Object.assign({}, testCase.queryParams), { takerAddress }) : testCase.queryParams,
            });
            const response = yield http_utils_1.httpGetAsync({ route });
            contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
            contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
            contracts_test_utils_1.expect(response.body).to.be.deep.eq(testCase.body);
        });
    }
    const testCases = [
        {
            description: 'missing query params',
            queryParams: {},
            body: {
                code: errors_1.GeneralErrorCodes.ValidationError,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        field: 'sellToken',
                        code: errors_1.ValidationErrorCodes.RequiredField,
                        reason: 'requires property "sellToken"',
                    },
                    {
                        field: 'buyToken',
                        code: errors_1.ValidationErrorCodes.RequiredField,
                        reason: 'requires property "buyToken"',
                    },
                    {
                        field: 'takerAddress',
                        code: errors_1.ValidationErrorCodes.RequiredField,
                        reason: 'requires property "takerAddress"',
                    },
                    {
                        field: 'instance',
                        code: errors_1.ValidationErrorCodes.IncorrectFormat,
                        reason: 'is not exactly one from <sellAmount>,<buyAmount>',
                    },
                ],
            },
            takerAddress: false,
        },
        {
            description: 'both `sellAmount` and `buyAmount`',
            queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { sellAmount: contracts_test_utils_1.constants.STATIC_ORDER_PARAMS.takerAssetAmount.toString() }),
            body: {
                code: errors_1.GeneralErrorCodes.ValidationError,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        field: 'instance',
                        code: errors_1.ValidationErrorCodes.IncorrectFormat,
                        reason: 'is not exactly one from <sellAmount>,<buyAmount>',
                    },
                ],
            },
            takerAddress: true,
        },
        {
            description: 'Invalid `buyToken`',
            queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyToken: 'INVALID' }),
            body: {
                code: errors_1.GeneralErrorCodes.ValidationError,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        field: 'buyToken',
                        // TODO(jalextowle): This seems like the wrong error message.
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                        reason: 'Could not find token `INVALID`',
                    },
                ],
            },
            takerAddress: true,
        },
        {
            description: 'Invalid `sellToken`',
            queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { sellToken: 'INVALID' }),
            body: {
                code: errors_1.GeneralErrorCodes.ValidationError,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        field: 'sellToken',
                        // TODO(jalextowle): This seems like the wrong error message.
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                        reason: 'Could not find token `INVALID`',
                    },
                ],
            },
            takerAddress: true,
        },
        {
            description: 'Insufficient Liquidity',
            queryParams: DEFAULT_QUERY_PARAMS,
            body: {
                code: errors_1.GeneralErrorCodes.ValidationError,
                reason: 'Validation Failed',
                validationErrors: [
                    {
                        code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                        field: 'buyAmount',
                        reason: 'INSUFFICIENT_ASSET_LIQUIDITY',
                    },
                ],
            },
            takerAddress: true,
        },
    ];
    describe('/price tests', () => {
        context('failure tests', () => {
            for (const testCase of testCases) {
                it(`${testCase.description}`, () => __awaiter(void 0, void 0, void 0, function* () {
                    yield assertFailureAsync(`${constants_1.META_TRANSACTION_PATH}/price`, testCase);
                }));
            }
        });
        context('success tests', () => {
            let meshUtils;
            const price = '1';
            const sellAmount = calculateSellAmount(buyAmount, price);
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield blockchainLifecycle.startAsync();
                meshUtils = new mesh_test_utils_1.MeshTestUtils(provider);
                yield meshUtils.setupUtilsAsync();
            }));
            afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield blockchainLifecycle.revertAsync();
                yield deployment_1.teardownMeshAsync(SUITE_NAME);
                yield deployment_1.setupMeshAsync(SUITE_NAME);
            }));
            it('should show the price of the only order in Mesh', () => __awaiter(void 0, void 0, void 0, function* () {
                const validationResults = yield meshUtils.addOrdersWithPricesAsync([1]);
                contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                const route = http_utils_1.constructRoute({
                    baseRoute: `${constants_1.META_TRANSACTION_PATH}/price`,
                    queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { takerAddress }),
                });
                const response = yield http_utils_1.httpGetAsync({ route });
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                contracts_test_utils_1.expect(response.body.sources).to.be.deep.eq(mocks_1.liquiditySources0xOnly);
                contracts_test_utils_1.expect(response.body).to.include({
                    price,
                    buyAmount,
                    sellAmount,
                    sellTokenAddress,
                    buyTokenAddress,
                });
            }));
            it('should show the price of the cheaper order in Mesh', () => __awaiter(void 0, void 0, void 0, function* () {
                const validationResults = yield meshUtils.addOrdersWithPricesAsync([1, 2]);
                contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                const route = http_utils_1.constructRoute({
                    baseRoute: `${constants_1.META_TRANSACTION_PATH}/price`,
                    queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { takerAddress }),
                });
                const response = yield http_utils_1.httpGetAsync({ route });
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                contracts_test_utils_1.expect(response.body.sources).to.be.deep.eq(mocks_1.liquiditySources0xOnly);
                contracts_test_utils_1.expect(response.body).to.include({
                    price,
                    buyAmount,
                    sellAmount,
                    sellTokenAddress,
                    buyTokenAddress,
                });
            }));
            it('should show the price of the combination of the two orders in Mesh', () => __awaiter(void 0, void 0, void 0, function* () {
                const validationResults = yield meshUtils.addOrdersWithPricesAsync([1, 2]);
                contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                const largeOrderPrice = '1.5';
                const largeBuyAmount = mesh_test_utils_1.DEFAULT_MAKER_ASSET_AMOUNT.times(2).toString();
                const largeSellAmount = calculateSellAmount(largeBuyAmount, largeOrderPrice);
                const route = http_utils_1.constructRoute({
                    baseRoute: `${constants_1.META_TRANSACTION_PATH}/price`,
                    queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyAmount: largeBuyAmount, takerAddress }),
                });
                const response = yield http_utils_1.httpGetAsync({ route });
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                contracts_test_utils_1.expect(response.body.sources).to.be.deep.eq(mocks_1.liquiditySources0xOnly);
                contracts_test_utils_1.expect(response.body).to.include({
                    price: largeOrderPrice,
                    buyAmount: largeBuyAmount,
                    sellAmount: largeSellAmount,
                    sellTokenAddress,
                    buyTokenAddress,
                });
            }));
        });
    });
    function stringifyOrderBigNumbers(order) {
        return Object.assign(Object.assign({}, order), { makerAssetAmount: order.makerAssetAmount.toString(), makerFee: order.makerFee.toString(), takerAssetAmount: order.takerAssetAmount.toString(), takerFee: order.takerFee.toString(), salt: order.salt.toString(), expirationTimeSeconds: order.expirationTimeSeconds.toString() });
    }
    function assertCorrectMetaQuote(testCase) {
        contracts_test_utils_1.expect(testCase.quote.zeroExTransactionHash.length).to.be.eq(66); // tslint:disable-line:custom-no-magic-numbers
        const threeSecondsMS = constants_1.ONE_SECOND_MS * 3; // tslint:disable-line:custom-no-magic-numbers
        const lowerBound = new utils_1.BigNumber(Date.now() + constants_1.TEN_MINUTES_MS - threeSecondsMS)
            .div(constants_1.ONE_SECOND_MS)
            .integerValue(utils_1.BigNumber.ROUND_CEIL);
        const upperBound = new utils_1.BigNumber(Date.now() + constants_1.TEN_MINUTES_MS)
            .div(constants_1.ONE_SECOND_MS)
            .integerValue(utils_1.BigNumber.ROUND_CEIL);
        contracts_test_utils_1.expect(testCase.quote.zeroExTransaction.expirationTimeSeconds).to.be.bignumber.gte(lowerBound);
        contracts_test_utils_1.expect(testCase.quote.zeroExTransaction.expirationTimeSeconds).to.be.bignumber.lte(upperBound);
        // NOTE(jalextowle): We pick only the elements that should be tested
        // against. This avoids altering the original object and running into
        // an edge-case in `expect` around values defined as `undefined`.
        contracts_test_utils_1.expect({
            price: testCase.quote.price,
            zeroExTransaction: {
                signerAddress: testCase.quote.zeroExTransaction.signerAddress,
                domain: testCase.quote.zeroExTransaction.domain,
            },
            orders: testCase.quote.orders,
            buyAmount: testCase.quote.buyAmount,
            sellAmount: testCase.quote.sellAmount,
            sources: testCase.quote.sources,
        }).to.be.eql({
            price: testCase.expectedPrice,
            zeroExTransaction: {
                signerAddress: takerAddress,
                domain: { chainId, verifyingContract: contractAddresses.exchange },
            },
            orders: testCase.expectedOrders.map(order => stringifyOrderBigNumbers(order)),
            buyAmount: testCase.expectedBuyAmount,
            sellAmount: calculateSellAmount(testCase.expectedBuyAmount, testCase.expectedPrice),
            // NOTE(jalextowle): 0x is the only source that is currently being tested.
            sources: mocks_1.liquiditySources0xOnly,
        });
    }
    describe('/quote tests', () => {
        context('failure tests', () => {
            for (const testCase of testCases) {
                it(`${testCase.description}`, () => __awaiter(void 0, void 0, void 0, function* () {
                    yield assertFailureAsync(`${constants_1.META_TRANSACTION_PATH}/quote`, testCase);
                }));
            }
        });
        context('success tests', () => {
            let meshUtils;
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield blockchainLifecycle.startAsync();
                yield deployment_1.setupMeshAsync(SUITE_NAME);
                meshUtils = new mesh_test_utils_1.MeshTestUtils(provider);
                yield meshUtils.setupUtilsAsync();
            }));
            afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield blockchainLifecycle.revertAsync();
                yield deployment_1.teardownMeshAsync(SUITE_NAME);
            }));
            // NOTE(jalextowle): Spin up a new Mesh instance so that it will
            // be available for future test suites.
            after(() => __awaiter(void 0, void 0, void 0, function* () {
                yield deployment_1.setupMeshAsync(SUITE_NAME);
            }));
            it('should return a quote of the only order in Mesh', () => __awaiter(void 0, void 0, void 0, function* () {
                const validationResults = yield meshUtils.addOrdersWithPricesAsync([1]);
                contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                const route = http_utils_1.constructRoute({
                    baseRoute: `${constants_1.META_TRANSACTION_PATH}/quote`,
                    queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { takerAddress }),
                });
                const response = yield http_utils_1.httpGetAsync({ route });
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                assertCorrectMetaQuote({
                    quote: response.body,
                    expectedBuyAmount: buyAmount,
                    expectedOrders: [validationResults.accepted[0].signedOrder],
                    expectedPrice: '1',
                });
            }));
            it('should return a quote of the cheaper order in Mesh', () => __awaiter(void 0, void 0, void 0, function* () {
                const validationResults = yield meshUtils.addOrdersWithPricesAsync([1, 2]);
                contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                const route = http_utils_1.constructRoute({
                    baseRoute: `${constants_1.META_TRANSACTION_PATH}/quote`,
                    queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyAmount,
                        takerAddress }),
                });
                const response = yield http_utils_1.httpGetAsync({ route });
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                assertCorrectMetaQuote({
                    quote: response.body,
                    expectedBuyAmount: buyAmount,
                    expectedOrders: [validationResults.accepted[0].signedOrder],
                    expectedPrice: '1',
                });
            }));
            it('should return a quote of the combination of the two orders in Mesh', () => __awaiter(void 0, void 0, void 0, function* () {
                const validationResults = yield meshUtils.addOrdersWithPricesAsync([1, 2]);
                contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                const largeBuyAmount = mesh_test_utils_1.DEFAULT_MAKER_ASSET_AMOUNT.times(2).toString();
                const route = http_utils_1.constructRoute({
                    baseRoute: `${constants_1.META_TRANSACTION_PATH}/quote`,
                    queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyAmount: largeBuyAmount, takerAddress }),
                });
                const response = yield http_utils_1.httpGetAsync({ route });
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                assertCorrectMetaQuote({
                    quote: response.body,
                    expectedBuyAmount: largeBuyAmount,
                    expectedOrders: validationResults.accepted.map(accepted => accepted.signedOrder),
                    expectedPrice: '1.5',
                });
            }));
        });
    });
    describe('/submit tests', () => {
        const requestBase = `${constants_1.META_TRANSACTION_PATH}/submit`;
        context('failure tests', () => {
            it('should return InvalidAPIKey error if invalid UUID supplied as API Key', () => __awaiter(void 0, void 0, void 0, function* () {
                const response = yield http_utils_1.httpPostAsync({ route: requestBase, headers: { '0x-api-key': 'foobar' } });
                contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.BAD_REQUEST);
                contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                contracts_test_utils_1.expect(response.body).to.be.deep.eq({
                    code: errors_1.GeneralErrorCodes.InvalidAPIKey,
                    reason: errors_1.generalErrorCodeToReason[errors_1.GeneralErrorCodes.InvalidAPIKey],
                });
            }));
        });
        context('success tests', () => {
            let meshUtils;
            function signZeroExTransaction(transaction, signingAddress) {
                const transactionHashBuffer = contracts_test_utils_1.transactionHashUtils.getTransactionHashBuffer(transaction);
                const pkIdx = accounts.indexOf(signingAddress);
                contracts_test_utils_1.expect(pkIdx, 'signing address is invalid').to.be.gte(0);
                const privateKey = contracts_test_utils_1.constants.TESTRPC_PRIVATE_KEYS[pkIdx];
                return `0x${contracts_test_utils_1.signingUtils
                    .signMessage(transactionHashBuffer, privateKey, types_1.SignatureType.EthSign)
                    .toString('hex')}`;
            }
            describe('single order submission', () => {
                let validationResults;
                const price = '1';
                const sellAmount = calculateSellAmount(buyAmount, price);
                // NOTE(jalextowle): This must be a `before` hook because `beforeEach`
                // hooks execute after all of the `before` hooks (even if they are nested).
                before(() => __awaiter(void 0, void 0, void 0, function* () {
                    yield blockchainLifecycle.startAsync();
                    meshUtils = new mesh_test_utils_1.MeshTestUtils(provider);
                    yield meshUtils.setupUtilsAsync();
                }));
                after(() => __awaiter(void 0, void 0, void 0, function* () {
                    yield blockchainLifecycle.revertAsync();
                    yield deployment_1.teardownMeshAsync(SUITE_NAME);
                    // NOTE(jalextowle): Spin up a new Mesh instance so that it will
                    // be available for future test suites.
                    yield deployment_1.setupMeshAsync(SUITE_NAME);
                }));
                before(() => __awaiter(void 0, void 0, void 0, function* () {
                    validationResults = yield meshUtils.addOrdersWithPricesAsync([1]);
                    contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                }));
                it('price checking yields the correct market price', () => __awaiter(void 0, void 0, void 0, function* () {
                    const route = http_utils_1.constructRoute({
                        baseRoute: `${constants_1.META_TRANSACTION_PATH}/price`,
                        queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { takerAddress }),
                    });
                    const response = yield http_utils_1.httpGetAsync({ route });
                    contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                    contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                    contracts_test_utils_1.expect(response.body.sources).to.be.deep.eq(mocks_1.liquiditySources0xOnly);
                    contracts_test_utils_1.expect(response.body).to.include({
                        price,
                        buyAmount,
                        sellAmount,
                        sellTokenAddress,
                        buyTokenAddress,
                    });
                }));
                let transaction;
                it('the quote matches the price check', () => __awaiter(void 0, void 0, void 0, function* () {
                    const route = http_utils_1.constructRoute({
                        baseRoute: `${constants_1.META_TRANSACTION_PATH}/quote`,
                        queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { takerAddress }),
                    });
                    const response = yield http_utils_1.httpGetAsync({ route });
                    contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                    contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                    assertCorrectMetaQuote({
                        quote: response.body,
                        expectedBuyAmount: buyAmount,
                        expectedOrders: [validationResults.accepted[0].signedOrder],
                        expectedPrice: price,
                    });
                    transaction = response.body.zeroExTransaction;
                }));
                it.skip('submitting the quote is successful and money changes hands correctly', () => __awaiter(void 0, void 0, void 0, function* () {
                    const makerAddress = validationResults.accepted[0].signedOrder.makerAddress;
                    yield weth.deposit().awaitTransactionSuccessAsync({ from: takerAddress, value: buyAmount });
                    yield weth
                        .approve(contractAddresses.erc20Proxy, new utils_1.BigNumber(buyAmount))
                        .awaitTransactionSuccessAsync({ from: takerAddress });
                    const startMakerWethBalance = yield weth.balanceOf(makerAddress).callAsync();
                    const startMakerZrxBalance = yield zrx.balanceOf(makerAddress).callAsync();
                    const startTakerWethBalance = yield weth.balanceOf(takerAddress).callAsync();
                    const startTakerZrxBalance = yield zrx.balanceOf(takerAddress).callAsync();
                    const signature = signZeroExTransaction(transaction, takerAddress);
                    const route = http_utils_1.constructRoute({
                        baseRoute: `${constants_1.META_TRANSACTION_PATH}/submit`,
                    });
                    const response = yield http_utils_1.httpPostAsync({
                        route,
                        body: {
                            zeroExTransaction: transaction,
                            signature,
                        },
                        headers: {
                            '0x-api-key': config.META_TXN_SUBMIT_WHITELISTED_API_KEYS[0],
                        },
                    });
                    contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                    contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                    const endMakerWethBalance = yield weth.balanceOf(makerAddress).callAsync();
                    const endMakerZrxBalance = yield zrx.balanceOf(makerAddress).callAsync();
                    const endTakerWethBalance = yield weth.balanceOf(takerAddress).callAsync();
                    const endTakerZrxBalance = yield zrx.balanceOf(takerAddress).callAsync();
                    contracts_test_utils_1.expect(endMakerWethBalance).to.be.bignumber.eq(startMakerWethBalance.plus(sellAmount));
                    contracts_test_utils_1.expect(endMakerZrxBalance).to.be.bignumber.eq(startMakerZrxBalance.minus(buyAmount));
                    contracts_test_utils_1.expect(endTakerWethBalance).to.be.bignumber.eq(startTakerWethBalance.minus(sellAmount));
                    contracts_test_utils_1.expect(endTakerZrxBalance).to.be.bignumber.eq(startTakerZrxBalance.plus(buyAmount));
                }));
            });
            // TODO: There is a problem with this test case. It is currently throwing an `IncompleteFillError`
            describe.skip('two order submission', () => {
                let validationResults;
                const largeBuyAmount = mesh_test_utils_1.DEFAULT_MAKER_ASSET_AMOUNT.times(2).toString();
                const price = '1.5';
                const sellAmount = calculateSellAmount(largeBuyAmount, price);
                // NOTE(jalextowle): This must be a `before` hook because `beforeEach`
                // hooks execute after all of the `before` hooks (even if they are nested).
                before(() => __awaiter(void 0, void 0, void 0, function* () {
                    yield blockchainLifecycle.startAsync();
                    meshUtils = new mesh_test_utils_1.MeshTestUtils(provider);
                    yield meshUtils.setupUtilsAsync();
                }));
                after(() => __awaiter(void 0, void 0, void 0, function* () {
                    yield blockchainLifecycle.revertAsync();
                    yield deployment_1.teardownMeshAsync(SUITE_NAME);
                    // NOTE(jalextowle): Spin up a new Mesh instance so that it will
                    // be available for future test suites.
                    yield deployment_1.setupMeshAsync(SUITE_NAME);
                }));
                before(() => __awaiter(void 0, void 0, void 0, function* () {
                    validationResults = yield meshUtils.addOrdersWithPricesAsync([1, 2]);
                    contracts_test_utils_1.expect(validationResults.rejected.length, 'mesh should not reject any orders').to.be.eq(0);
                }));
                it('price checking yields the correct market price', () => __awaiter(void 0, void 0, void 0, function* () {
                    const route = http_utils_1.constructRoute({
                        baseRoute: `${constants_1.META_TRANSACTION_PATH}/price`,
                        queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyAmount: largeBuyAmount, takerAddress }),
                    });
                    const response = yield http_utils_1.httpGetAsync({ route });
                    contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                    contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                    contracts_test_utils_1.expect(response.body.sources).to.be.deep.eq(mocks_1.liquiditySources0xOnly);
                    contracts_test_utils_1.expect(response.body).to.include({
                        price,
                        buyAmount: largeBuyAmount,
                        sellTokenAddress,
                        buyTokenAddress,
                    });
                }));
                let transaction;
                it('the quote matches the price check', () => __awaiter(void 0, void 0, void 0, function* () {
                    const route = http_utils_1.constructRoute({
                        baseRoute: `${constants_1.META_TRANSACTION_PATH}/quote`,
                        queryParams: Object.assign(Object.assign({}, DEFAULT_QUERY_PARAMS), { buyAmount: largeBuyAmount, takerAddress }),
                    });
                    const response = yield http_utils_1.httpGetAsync({ route });
                    contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                    contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                    assertCorrectMetaQuote({
                        quote: response.body,
                        expectedBuyAmount: largeBuyAmount,
                        expectedOrders: validationResults.accepted.map(accepted => accepted.signedOrder),
                        expectedPrice: price,
                    });
                    transaction = response.body.zeroExTransaction;
                }));
                it('submitting the quote is successful and money changes hands correctly', () => __awaiter(void 0, void 0, void 0, function* () {
                    const makerAddress = validationResults.accepted[0].signedOrder.makerAddress;
                    yield weth.deposit().awaitTransactionSuccessAsync({ from: takerAddress, value: largeBuyAmount });
                    yield weth
                        .approve(contractAddresses.erc20Proxy, new utils_1.BigNumber(largeBuyAmount))
                        .awaitTransactionSuccessAsync({ from: takerAddress });
                    const startMakerWethBalance = yield weth.balanceOf(makerAddress).callAsync();
                    const startMakerZrxBalance = yield zrx.balanceOf(makerAddress).callAsync();
                    const startTakerWethBalance = yield weth.balanceOf(takerAddress).callAsync();
                    const startTakerZrxBalance = yield zrx.balanceOf(takerAddress).callAsync();
                    const signature = signZeroExTransaction(transaction, takerAddress);
                    const route = http_utils_1.constructRoute({
                        baseRoute: `${constants_1.META_TRANSACTION_PATH}/submit`,
                    });
                    const response = yield http_utils_1.httpPostAsync({
                        route,
                        body: {
                            zeroExTransaction: transaction,
                            signature,
                        },
                        headers: {
                            '0x-api-key': config.META_TXN_SUBMIT_WHITELISTED_API_KEYS[0],
                        },
                    });
                    contracts_test_utils_1.expect(response.status).to.be.eq(HttpStatus.OK);
                    contracts_test_utils_1.expect(response.type).to.be.eq('application/json');
                    const endMakerWethBalance = yield weth.balanceOf(makerAddress).callAsync();
                    const endMakerZrxBalance = yield zrx.balanceOf(makerAddress).callAsync();
                    const endTakerWethBalance = yield weth.balanceOf(takerAddress).callAsync();
                    const endTakerZrxBalance = yield zrx.balanceOf(takerAddress).callAsync();
                    contracts_test_utils_1.expect(endMakerWethBalance).to.be.bignumber.eq(startMakerWethBalance.plus(sellAmount));
                    contracts_test_utils_1.expect(endMakerZrxBalance).to.be.bignumber.eq(startMakerZrxBalance.minus(largeBuyAmount));
                    contracts_test_utils_1.expect(endTakerWethBalance).to.be.bignumber.eq(startTakerWethBalance.minus(sellAmount));
                    contracts_test_utils_1.expect(endTakerZrxBalance).to.be.bignumber.eq(startTakerZrxBalance.plus(largeBuyAmount));
                }));
            });
        });
    });
});
function calculateSellAmount(buyAmount, price) {
    return (parseInt(buyAmount, 10) * parseFloat(price)).toString();
}
// tslint:disable-line:max-file-line-count
//# sourceMappingURL=meta_transaction_test.js.map