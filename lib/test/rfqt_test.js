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
// tslint:disable:max-file-line-count
const asset_swapper_1 = require("@0x/asset-swapper");
const quote_requestor_1 = require("@0x/asset-swapper/lib/src/utils/quote_requestor");
const contract_wrappers_1 = require("@0x/contract-wrappers");
const contracts_erc20_1 = require("@0x/contracts-erc20");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const dev_utils_1 = require("@0x/dev-utils");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const HttpStatus = require("http-status-codes");
require("mocha");
const request = require("supertest");
const app_1 = require("../src/app");
const config_1 = require("../src/config");
const constants_1 = require("../src/constants");
const constants_2 = require("./constants");
const deployment_1 = require("./utils/deployment");
const mocks_1 = require("./utils/mocks");
let app;
let server;
let web3Wrapper;
let provider;
let accounts;
let blockchainLifecycle;
let dependencies;
// tslint:disable-next-line:custom-no-magic-numbers
const MAX_UINT256 = new utils_1.BigNumber(2).pow(256).minus(1);
const SUITE_NAME = 'rfqt tests';
const EXCLUDED_SOURCES = Object.values(asset_swapper_1.ERC20BridgeSource).filter(s => s !== asset_swapper_1.ERC20BridgeSource.Native);
const DEFAULT_EXCLUDED_SOURCES = EXCLUDED_SOURCES.join(',');
const DEFAULT_SELL_AMOUNT = new utils_1.BigNumber(100000000000000000);
describe(SUITE_NAME, () => {
    const contractAddresses = constants_2.CONTRACT_ADDRESSES;
    let makerAddress;
    let takerAddress;
    let wethContract;
    let zrxToken;
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        // start the 0x-api app
        yield deployment_1.setupDependenciesAsync(SUITE_NAME);
        // connect to ganache and run contract migrations
        const ganacheConfigs = {
            shouldUseInProcessGanache: false,
            shouldAllowUnlimitedContractSize: true,
            rpcUrl: config_1.defaultHttpServiceWithRateLimiterConfig.ethereumRpcUrl,
        };
        provider = dev_utils_1.web3Factory.getRpcProvider(ganacheConfigs);
        web3Wrapper = new web3_wrapper_1.Web3Wrapper(provider);
        blockchainLifecycle = new dev_utils_1.BlockchainLifecycle(web3Wrapper);
        yield blockchainLifecycle.startAsync();
        accounts = yield web3Wrapper.getAvailableAddressesAsync();
        [makerAddress, takerAddress] = accounts;
        wethContract = new contract_wrappers_1.WETH9Contract(contractAddresses.etherToken, provider);
        zrxToken = new contracts_erc20_1.DummyERC20TokenContract(contractAddresses.zrxToken, provider);
        // start the 0x-api app
        dependencies = yield app_1.getDefaultAppDependenciesAsync(provider, config_1.defaultHttpServiceWithRateLimiterConfig);
        ({ app, server } = yield app_1.getAppAsync(Object.assign({}, dependencies), config_1.defaultHttpServiceWithRateLimiterConfig));
    }));
    after(() => __awaiter(void 0, void 0, void 0, function* () {
        yield new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                }
                resolve();
            });
        });
        yield deployment_1.teardownDependenciesAsync(SUITE_NAME);
    }));
    describe('v1', () => __awaiter(void 0, void 0, void 0, function* () {
        const SWAP_PATH = `${constants_1.SWAP_PATH}/v1`;
        let DEFAULT_RFQT_RESPONSE_DATA;
        let signedOrder;
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            const flashWalletAddress = constants_2.CONTRACT_ADDRESSES.exchangeProxyFlashWallet;
            DEFAULT_RFQT_RESPONSE_DATA = {
                endpoint: 'https://mock-rfqt1.club',
                responseCode: 200,
                requestApiKey: 'koolApiKey1',
                requestParams: {
                    sellTokenAddress: contractAddresses.etherToken,
                    buyTokenAddress: contractAddresses.zrxToken,
                    sellAmountBaseUnits: DEFAULT_SELL_AMOUNT.toString(),
                    buyAmountBaseUnits: undefined,
                    takerAddress: flashWalletAddress,
                },
            };
            const order = Object.assign(Object.assign({}, mocks_1.ganacheZrxWethOrderExchangeProxy), { takerAddress: flashWalletAddress, makerAssetAmount: new utils_1.BigNumber(mocks_1.ganacheZrxWethOrderExchangeProxy.makerAssetAmount), takerAssetAmount: new utils_1.BigNumber(mocks_1.ganacheZrxWethOrderExchangeProxy.takerAssetAmount), takerFee: new utils_1.BigNumber(mocks_1.ganacheZrxWethOrderExchangeProxy.takerFee), makerFee: new utils_1.BigNumber(mocks_1.ganacheZrxWethOrderExchangeProxy.makerFee), expirationTimeSeconds: new utils_1.BigNumber(mocks_1.ganacheZrxWethOrderExchangeProxy.expirationTimeSeconds), salt: new utils_1.BigNumber(mocks_1.ganacheZrxWethOrderExchangeProxy.salt) });
            signedOrder = yield order_utils_1.signatureUtils.ecSignOrderAsync(provider, order, order.makerAddress);
            signedOrder = JSON.parse(JSON.stringify(signedOrder));
        }));
        context('with maker allowances set', () => __awaiter(void 0, void 0, void 0, function* () {
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield zrxToken
                    .approve(contractAddresses.erc20Proxy, MAX_UINT256)
                    .sendTransactionAsync({ from: makerAddress });
            }));
            context('getting a quote from an RFQ-T provider', () => __awaiter(void 0, void 0, void 0, function* () {
                it('should succeed when taker has balances and amounts', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: { signedOrder } }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.orders.length).to.equal(1);
                        contracts_test_utils_1.expect(responseJson.orders[0]).to.eql(signedOrder);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should not include an RFQ-T order when intentOnFilling === false', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.rfqtIndicativeQuoteResponse }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=false&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should not include an RFQ-T order when intentOnFilling is omitted', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.rfqtIndicativeQuoteResponse }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }));
                }));
                it('should fail when taker address is not supplied', () => __awaiter(void 0, void 0, void 0, function* () {
                    const appResponse = yield request(app)
                        .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                    contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                }));
                it("should fail when it's a buy order and those are disabled (which is the default)", () => __awaiter(void 0, void 0, void 0, function* () {
                    const buyAmount = new utils_1.BigNumber(100000000000000000);
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    const appResponse = yield request(app)
                        .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&buyAmount=${buyAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                    contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                }));
                it('should succeed when taker can not actually fill but we skip validation', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: { signedOrder } }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.orders.length).to.equal(1);
                        contracts_test_utils_1.expect(responseJson.orders[0]).to.eql(signedOrder);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should fail when bad api key used', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    // this RFQ-T mock should never actually get hit b/c of the bad api key
                    // but in the case in which the bad api key was _not_ blocked
                    // this would cause the API to respond with RFQ-T liquidity
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: signedOrder, requestApiKey: 'badApiKey' }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'badApiKey')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }));
                }));
                it('should fail validation when taker can not actually fill', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .approve(contractAddresses.exchangeProxyAllowanceTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: signedOrder }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                    }));
                }));
                it('should get an indicative quote from an RFQ-T provider', () => __awaiter(void 0, void 0, void 0, function* () {
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.rfqtIndicativeQuoteResponse }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.buyAmount).to.equal('100000000000000000');
                        contracts_test_utils_1.expect(responseJson.price).to.equal('1');
                        contracts_test_utils_1.expect(responseJson.sellAmount).to.equal('100000000000000000');
                        contracts_test_utils_1.expect(responseJson.sources).to.deep.include.members([{ name: '0x', proportion: '1' }]);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should fail silently when RFQ-T provider gives an error response', () => __awaiter(void 0, void 0, void 0, function* () {
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: {}, responseCode: 500 }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
            }));
        }));
        context('without maker allowances set', () => __awaiter(void 0, void 0, void 0, function* () {
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield zrxToken
                    .approve(contractAddresses.erc20Proxy, new utils_1.BigNumber(0))
                    .sendTransactionAsync({ from: makerAddress });
            }));
            it('should not return order if maker allowances are not set', () => __awaiter(void 0, void 0, void 0, function* () {
                yield wethContract
                    .approve(contractAddresses.exchangeProxyAllowanceTarget, new utils_1.BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });
                return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                    Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: signedOrder }),
                ], () => __awaiter(void 0, void 0, void 0, function* () {
                    const appResponse = yield request(app)
                        .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                    contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                }), quote_requestor_1.quoteRequestorHttpClient);
            }));
        }));
    }));
    describe('/v0', () => __awaiter(void 0, void 0, void 0, function* () {
        const SWAP_PATH = `${constants_1.SWAP_PATH}/v0`;
        const approvalTarget = contractAddresses.erc20Proxy;
        let DEFAULT_RFQT_RESPONSE_DATA;
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            DEFAULT_RFQT_RESPONSE_DATA = {
                endpoint: 'https://mock-rfqt1.club',
                responseCode: 200,
                requestApiKey: 'koolApiKey1',
                requestParams: {
                    sellTokenAddress: contractAddresses.etherToken,
                    buyTokenAddress: contractAddresses.zrxToken,
                    sellAmountBaseUnits: DEFAULT_SELL_AMOUNT.toString(),
                    buyAmountBaseUnits: undefined,
                    takerAddress,
                },
            };
        }));
        context('with maker allowances set', () => __awaiter(void 0, void 0, void 0, function* () {
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield zrxToken.approve(approvalTarget, MAX_UINT256).sendTransactionAsync({ from: makerAddress });
            }));
            context('getting a quote from an RFQ-T provider', () => __awaiter(void 0, void 0, void 0, function* () {
                it('should succeed when taker has balances and amounts', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(approvalTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: { signedOrder: mocks_1.ganacheZrxWethOrder1 } }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.orders.length).to.equal(1);
                        contracts_test_utils_1.expect(responseJson.orders[0]).to.eql(mocks_1.ganacheZrxWethOrder1);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should not include an RFQ-T order when intentOnFilling === false', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(approvalTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.rfqtIndicativeQuoteResponse }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=false&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should not include an RFQ-T order when intentOnFilling is omitted', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(approvalTarget, DEFAULT_SELL_AMOUNT)
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.rfqtIndicativeQuoteResponse }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should succeed when includedSources is RFQT', () => __awaiter(void 0, void 0, void 0, function* () {
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: { signedOrder: mocks_1.ganacheZrxWethOrder1 } }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?intentOnFilling=true&buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&includedSources=RFQT&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.orders.length).to.equal(1);
                        contracts_test_utils_1.expect(responseJson.orders[0]).to.eql(mocks_1.ganacheZrxWethOrder1);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should not succeed when includedSources is RFQT and no taker address is specified', () => __awaiter(void 0, void 0, void 0, function* () {
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: { signedOrder: mocks_1.ganacheZrxWethOrder1 } }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        yield request(app)
                            .get(`${SWAP_PATH}/quote?intentOnFilling=true&buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&includedSources=RFQT&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should fail when taker address is not supplied', () => __awaiter(void 0, void 0, void 0, function* () {
                    const appResponse = yield request(app)
                        .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                    contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                }));
                it("should fail when it's a buy order and those are disabled (which is the default)", () => __awaiter(void 0, void 0, void 0, function* () {
                    const buyAmount = new utils_1.BigNumber(100000000000000000);
                    yield wethContract
                        .approve(contractAddresses.erc20Proxy, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    const appResponse = yield request(app)
                        .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&buyAmount=${buyAmount.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                    contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                }));
                it('should succeed when taker can not actually fill but we skip validation', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .approve(approvalTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: { signedOrder: mocks_1.ganacheZrxWethOrder1 } }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.orders.length).to.equal(1);
                        contracts_test_utils_1.expect(responseJson.orders[0]).to.eql(mocks_1.ganacheZrxWethOrder1);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should fail when bad api key used', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .deposit()
                        .sendTransactionAsync({ value: DEFAULT_SELL_AMOUNT, from: takerAddress });
                    yield wethContract
                        .approve(approvalTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    // this RFQ-T mock should never actually get hit b/c of the bad api key
                    // but in the case in which the bad api key was _not_ blocked
                    // this would cause the API to respond with RFQ-T liquidity
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.ganacheZrxWethOrder1, requestApiKey: 'badApiKey' }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                            .set('0x-api-key', 'badApiKey')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should fail validation when taker can not actually fill', () => __awaiter(void 0, void 0, void 0, function* () {
                    yield wethContract
                        .approve(approvalTarget, new utils_1.BigNumber(0))
                        .sendTransactionAsync({ from: takerAddress });
                    return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.ganacheZrxWethOrder1 }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        yield request(app)
                            .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should get an indicative quote from an RFQ-T provider', () => __awaiter(void 0, void 0, void 0, function* () {
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.rfqtIndicativeQuoteResponse }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.OK)
                            .expect('Content-Type', /json/);
                        const responseJson = JSON.parse(appResponse.text);
                        contracts_test_utils_1.expect(responseJson.buyAmount).to.equal('100000000000000000');
                        contracts_test_utils_1.expect(responseJson.price).to.equal('1');
                        contracts_test_utils_1.expect(responseJson.sellAmount).to.equal('100000000000000000');
                        contracts_test_utils_1.expect(responseJson.sources).to.deep.include.members([{ name: '0x', proportion: '1' }]);
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
                it('should fail silently when RFQ-T provider gives an error response', () => __awaiter(void 0, void 0, void 0, function* () {
                    return asset_swapper_1.rfqtMocker.withMockedRfqtIndicativeQuotes([
                        Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: {}, responseCode: 500 }),
                    ], () => __awaiter(void 0, void 0, void 0, function* () {
                        const appResponse = yield request(app)
                            .get(`${SWAP_PATH}/price?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&excludedSources=${DEFAULT_EXCLUDED_SOURCES}`)
                            .set('0x-api-key', 'koolApiKey1')
                            .expect(HttpStatus.BAD_REQUEST)
                            .expect('Content-Type', /json/);
                        const validationErrors = appResponse.body.validationErrors;
                        contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                        contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                    }), quote_requestor_1.quoteRequestorHttpClient);
                }));
            }));
        }));
        context('without maker allowances set', () => __awaiter(void 0, void 0, void 0, function* () {
            beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
                yield zrxToken.approve(approvalTarget, new utils_1.BigNumber(0)).sendTransactionAsync({ from: makerAddress });
            }));
            it('should not return order if maker allowances are not set', () => __awaiter(void 0, void 0, void 0, function* () {
                yield wethContract
                    .approve(approvalTarget, new utils_1.BigNumber(0))
                    .sendTransactionAsync({ from: takerAddress });
                return asset_swapper_1.rfqtMocker.withMockedRfqtFirmQuotes([
                    Object.assign(Object.assign({}, DEFAULT_RFQT_RESPONSE_DATA), { responseData: mocks_1.ganacheZrxWethOrder1 }),
                ], () => __awaiter(void 0, void 0, void 0, function* () {
                    const appResponse = yield request(app)
                        .get(`${SWAP_PATH}/quote?buyToken=ZRX&sellToken=WETH&sellAmount=${DEFAULT_SELL_AMOUNT.toString()}&takerAddress=${takerAddress}&intentOnFilling=true&excludedSources=${DEFAULT_EXCLUDED_SOURCES}&skipValidation=true`)
                        .set('0x-api-key', 'koolApiKey1')
                        .expect(HttpStatus.BAD_REQUEST)
                        .expect('Content-Type', /json/);
                    const validationErrors = appResponse.body.validationErrors;
                    contracts_test_utils_1.expect(validationErrors.length).to.eql(1);
                    contracts_test_utils_1.expect(validationErrors[0].reason).to.eql('INSUFFICIENT_ASSET_LIQUIDITY');
                }), quote_requestor_1.quoteRequestorHttpClient);
            }));
        }));
    }));
});
//# sourceMappingURL=rfqt_test.js.map