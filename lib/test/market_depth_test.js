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
const types_1 = require("@0x/types");
const utils_1 = require("@0x/utils");
require("mocha");
const constants_1 = require("../src/constants");
const market_depth_utils_1 = require("../src/utils/market_depth_utils");
const B = v => new utils_1.BigNumber(v);
// tslint:disable:custom-no-magic-numbers
const SUITE_NAME = 'market depth utils';
describe(SUITE_NAME, () => {
    describe('getBucketPrices', () => {
        it('returns a range from start to end', () => __awaiter(void 0, void 0, void 0, function* () {
            const start = B('1');
            const end = B('123');
            const num = 10;
            const range = market_depth_utils_1.marketDepthUtils.getBucketPrices(start, end, num);
            contracts_test_utils_1.expect(range[0]).to.be.bignumber.eq('1');
            contracts_test_utils_1.expect(range[10]).to.be.bignumber.eq('123');
            contracts_test_utils_1.expect(range.length).to.be.eq(11);
        }));
        it('can go from high to low', () => __awaiter(void 0, void 0, void 0, function* () {
            const start = B('123');
            const end = B('1');
            const num = 10;
            const range = market_depth_utils_1.marketDepthUtils.getBucketPrices(start, end, num);
            contracts_test_utils_1.expect(range[0]).to.be.bignumber.eq('123');
            contracts_test_utils_1.expect(range[10]).to.be.bignumber.eq('1');
            contracts_test_utils_1.expect(range.length).to.be.eq(11);
        }));
    });
    describe('getSampleAmountsFromDepthSide', () => {
        it('plucks out the input sample amounts', () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultSample = { output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap };
            const sampleAmounts = market_depth_utils_1.marketDepthUtils.getSampleAmountsFromDepthSide([
                [
                    Object.assign(Object.assign({}, defaultSample), { input: B(1) }),
                    Object.assign(Object.assign({}, defaultSample), { input: B(2) }),
                ],
            ]);
            contracts_test_utils_1.expect(sampleAmounts).to.deep.include(B(1));
            contracts_test_utils_1.expect(sampleAmounts).to.deep.include(B(2));
        }));
        it('ignores Native results if they are present', () => __awaiter(void 0, void 0, void 0, function* () {
            const defaultSample = { output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap };
            const nativeSample = { output: B(10), source: asset_swapper_1.ERC20BridgeSource.Native };
            const sampleAmounts = market_depth_utils_1.marketDepthUtils.getSampleAmountsFromDepthSide([
                [Object.assign(Object.assign({}, defaultSample), { input: B(1) })],
                [
                    Object.assign(Object.assign({}, nativeSample), { input: B(1) }),
                    Object.assign(Object.assign({}, nativeSample), { input: B(2) }),
                ],
            ]);
            contracts_test_utils_1.expect(sampleAmounts).to.deep.include(B(1));
            contracts_test_utils_1.expect(sampleAmounts).to.not.deep.include(B(2));
        }));
        it('plucks Native results if it has to', () => __awaiter(void 0, void 0, void 0, function* () {
            const nativeSample = { output: B(10), source: asset_swapper_1.ERC20BridgeSource.Native };
            const sampleAmounts = market_depth_utils_1.marketDepthUtils.getSampleAmountsFromDepthSide([
                [
                    Object.assign(Object.assign({}, nativeSample), { input: B(1) }),
                    Object.assign(Object.assign({}, nativeSample), { input: B(2) }),
                ],
            ]);
            contracts_test_utils_1.expect(sampleAmounts).to.deep.include(B(1));
            contracts_test_utils_1.expect(sampleAmounts).to.deep.include(B(2));
        }));
    });
    describe('sampleNativeOrders', () => {
        it('can partially fill a sample amount', () => __awaiter(void 0, void 0, void 0, function* () {
            const nativePath = [{ input: B(100), output: B(200), source: asset_swapper_1.ERC20BridgeSource.Native }];
            const output = market_depth_utils_1.marketDepthUtils.sampleNativeOrders(nativePath, B(10), types_1.MarketOperation.Sell);
            contracts_test_utils_1.expect(output).to.be.bignumber.eq(B(20));
        }));
        it('returns zero if it cannot fully fill the amount', () => __awaiter(void 0, void 0, void 0, function* () {
            const nativePath = [{ input: B(100), output: B(200), source: asset_swapper_1.ERC20BridgeSource.Native }];
            const output = market_depth_utils_1.marketDepthUtils.sampleNativeOrders(nativePath, B(101), types_1.MarketOperation.Sell);
            contracts_test_utils_1.expect(output).to.be.bignumber.eq(constants_1.ZERO);
        }));
        it('runs across multiple orders', () => __awaiter(void 0, void 0, void 0, function* () {
            const nativePath = [
                { input: B(50), output: B(200), source: asset_swapper_1.ERC20BridgeSource.Native },
                { input: B(50), output: B(50), source: asset_swapper_1.ERC20BridgeSource.Native },
            ];
            const output = market_depth_utils_1.marketDepthUtils.sampleNativeOrders(nativePath, B(100), types_1.MarketOperation.Sell);
            contracts_test_utils_1.expect(output).to.be.bignumber.eq(B(250));
        }));
    });
    describe('normalizeMarketDepthToSampleOutput', () => {
        it('converts raw orders into samples for Native', () => __awaiter(void 0, void 0, void 0, function* () {
            const nativePath = [
                { input: B(50), output: B(200), source: asset_swapper_1.ERC20BridgeSource.Native },
                { input: B(50), output: B(50), source: asset_swapper_1.ERC20BridgeSource.Native },
            ];
            const uniPath = [
                { input: B(1), output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
                { input: B(2), output: B(20), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
            ];
            const results = market_depth_utils_1.marketDepthUtils.normalizeMarketDepthToSampleOutput([uniPath, nativePath], types_1.MarketOperation.Sell);
            contracts_test_utils_1.expect(results).to.deep.include(uniPath);
            contracts_test_utils_1.expect(results).to.deep.include([
                { input: B(1), output: B(4), source: asset_swapper_1.ERC20BridgeSource.Native },
                { input: B(2), output: B(8), source: asset_swapper_1.ERC20BridgeSource.Native },
            ]);
        }));
    });
    describe('calculateStartEndBucketPrice', () => {
        const nativePath = [
            { input: B(1), output: B(4), source: asset_swapper_1.ERC20BridgeSource.Native },
            { input: B(2), output: B(8), source: asset_swapper_1.ERC20BridgeSource.Native },
        ];
        const uniPath = [
            { input: B(1), output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
            { input: B(2), output: B(20), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
        ];
        describe('sell', () => {
            it('starts at the best (highest) price and ends perc lower', () => __awaiter(void 0, void 0, void 0, function* () {
                const [start, end] = market_depth_utils_1.marketDepthUtils.calculateStartEndBucketPrice([nativePath, uniPath], types_1.MarketOperation.Sell, 20);
                // Best price is the uniswap 1 for 10
                contracts_test_utils_1.expect(start).to.be.bignumber.eq(B(10));
                contracts_test_utils_1.expect(end).to.be.bignumber.eq(start.times(0.8));
            }));
        });
        describe('buy', () => {
            it('starts at the best (lowest) price and ends perc higher', () => __awaiter(void 0, void 0, void 0, function* () {
                const [start, end] = market_depth_utils_1.marketDepthUtils.calculateStartEndBucketPrice([nativePath, uniPath], types_1.MarketOperation.Buy, 20);
                // Best price is the native 4 to receive 1
                contracts_test_utils_1.expect(start).to.be.bignumber.eq(B(4));
                contracts_test_utils_1.expect(end).to.be.bignumber.eq(start.times(1.2));
            }));
        });
    });
    describe('distributeSamplesToBuckets', () => {
        const nativePath = [
            { input: B(1), output: B(4), source: asset_swapper_1.ERC20BridgeSource.Native },
            { input: B(2), output: B(8), source: asset_swapper_1.ERC20BridgeSource.Native },
        ];
        const uniPath = [
            { input: B(1), output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
            { input: B(2), output: B(20), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
        ];
        describe('sell', () => {
            it('allocates the samples to the right bucket by price', () => __awaiter(void 0, void 0, void 0, function* () {
                const buckets = [B(10), B(8), B(4), B(1)];
                const allocated = market_depth_utils_1.marketDepthUtils.distributeSamplesToBuckets([nativePath, uniPath], buckets, types_1.MarketOperation.Sell);
                const [first, second, third, fourth] = allocated;
                contracts_test_utils_1.expect(first.cumulative).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(first.bucketTotal).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(first.bucket).to.be.eq(0);
                contracts_test_utils_1.expect(first.price).to.be.bignumber.eq(10);
                contracts_test_utils_1.expect(first.sources[asset_swapper_1.ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(second.cumulative).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(second.bucketTotal).to.be.bignumber.eq(0);
                contracts_test_utils_1.expect(second.bucket).to.be.eq(1);
                contracts_test_utils_1.expect(second.price).to.be.bignumber.eq(8);
                contracts_test_utils_1.expect(second.sources[asset_swapper_1.ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(third.cumulative).to.be.bignumber.eq(4);
                contracts_test_utils_1.expect(third.bucketTotal).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(third.bucket).to.be.eq(2);
                contracts_test_utils_1.expect(third.price).to.be.bignumber.eq(4);
                contracts_test_utils_1.expect(third.sources[asset_swapper_1.ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(third.sources[asset_swapper_1.ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(fourth.cumulative).to.be.bignumber.eq(4);
                contracts_test_utils_1.expect(fourth.bucketTotal).to.be.bignumber.eq(0);
                contracts_test_utils_1.expect(fourth.bucket).to.be.eq(3);
                contracts_test_utils_1.expect(fourth.price).to.be.bignumber.eq(1);
                contracts_test_utils_1.expect(fourth.sources[asset_swapper_1.ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(fourth.sources[asset_swapper_1.ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
            }));
            it('does not allocate to a bucket if there is none available', () => __awaiter(void 0, void 0, void 0, function* () {
                const buckets = [B(10)];
                const badSource = [{ input: B(1), output: B(5), source: asset_swapper_1.ERC20BridgeSource.Uniswap }];
                const allocated = market_depth_utils_1.marketDepthUtils.distributeSamplesToBuckets([badSource], buckets, types_1.MarketOperation.Sell);
                const [first] = allocated;
                contracts_test_utils_1.expect(first.cumulative).to.be.bignumber.eq(0);
                contracts_test_utils_1.expect(first.bucketTotal).to.be.bignumber.eq(0);
                contracts_test_utils_1.expect(first.bucket).to.be.eq(0);
                contracts_test_utils_1.expect(first.price).to.be.bignumber.eq(10);
                contracts_test_utils_1.expect(first.sources[asset_swapper_1.ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(0);
            }));
        });
        describe('buy', () => {
            it('allocates the samples to the right bucket by price', () => __awaiter(void 0, void 0, void 0, function* () {
                const buckets = [B(1), B(4), B(10)];
                const allocated = market_depth_utils_1.marketDepthUtils.distributeSamplesToBuckets([nativePath, uniPath], buckets, types_1.MarketOperation.Buy);
                const [first, second, third] = allocated;
                contracts_test_utils_1.expect(first.cumulative).to.be.bignumber.eq(0);
                contracts_test_utils_1.expect(first.bucketTotal).to.be.bignumber.eq(0);
                contracts_test_utils_1.expect(first.bucket).to.be.eq(0);
                contracts_test_utils_1.expect(first.price).to.be.bignumber.eq(1);
                contracts_test_utils_1.expect(second.cumulative).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(second.bucketTotal).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(second.bucket).to.be.eq(1);
                contracts_test_utils_1.expect(second.price).to.be.bignumber.eq(4);
                contracts_test_utils_1.expect(second.sources[asset_swapper_1.ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(third.cumulative).to.be.bignumber.eq(4);
                contracts_test_utils_1.expect(third.bucketTotal).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(third.bucket).to.be.eq(2);
                contracts_test_utils_1.expect(third.price).to.be.bignumber.eq(10);
                contracts_test_utils_1.expect(third.sources[asset_swapper_1.ERC20BridgeSource.Uniswap]).to.be.bignumber.eq(2);
                contracts_test_utils_1.expect(third.sources[asset_swapper_1.ERC20BridgeSource.Native]).to.be.bignumber.eq(2);
            }));
        });
    });
    describe('calculateDepthForSide', () => {
        // Essentially orders not samples
        const nativePath = [{ input: B(10), output: B(80), source: asset_swapper_1.ERC20BridgeSource.Native }];
        it('calculates prices and allocates into buckets. Partial 0x', () => __awaiter(void 0, void 0, void 0, function* () {
            const dexPaths = [
                [
                    { input: B(1), output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
                    { input: B(2), output: B(11), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
                ],
                [
                    { input: B(1), output: B(0), source: asset_swapper_1.ERC20BridgeSource.Curve },
                    { input: B(2), output: B(0), source: asset_swapper_1.ERC20BridgeSource.Curve },
                ],
            ];
            const result = market_depth_utils_1.marketDepthUtils.calculateDepthForSide([nativePath, ...dexPaths], types_1.MarketOperation.Sell, 4, // buckets
            1, // distribution
            20);
            const emptySources = {};
            Object.values(asset_swapper_1.ERC20BridgeSource).forEach(s => (emptySources[s] = constants_1.ZERO));
            contracts_test_utils_1.expect(result).to.be.deep.eq([
                {
                    price: B(10),
                    bucket: 0,
                    bucketTotal: B(1),
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(9.5),
                    bucket: 1,
                    bucketTotal: constants_1.ZERO,
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(9),
                    bucket: 2,
                    bucketTotal: constants_1.ZERO,
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(8.5),
                    bucket: 3,
                    bucketTotal: constants_1.ZERO,
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                // Native is the sample for the sample for 2 (overriding the 1 sample), since we didn't sample for 10 it does
                // not contain the entire order
                {
                    price: B(8),
                    bucket: 4,
                    bucketTotal: B(2),
                    cumulative: B(3),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1), [asset_swapper_1.ERC20BridgeSource.Native]: B(2) }),
                },
            ]);
        }));
        it('calculates prices and allocates into buckets. Partial Uni', () => __awaiter(void 0, void 0, void 0, function* () {
            const dexPaths = [
                [
                    { input: B(1), output: B(10), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
                    { input: B(2), output: B(11), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
                    { input: B(10), output: B(0), source: asset_swapper_1.ERC20BridgeSource.Uniswap },
                ],
                [
                    { input: B(1), output: B(0), source: asset_swapper_1.ERC20BridgeSource.Curve },
                    { input: B(2), output: B(0), source: asset_swapper_1.ERC20BridgeSource.Curve },
                    { input: B(10), output: B(0), source: asset_swapper_1.ERC20BridgeSource.Curve },
                ],
            ];
            const result = market_depth_utils_1.marketDepthUtils.calculateDepthForSide([nativePath, ...dexPaths], types_1.MarketOperation.Sell, 4, // buckets
            1, // distribution
            20);
            const emptySources = {};
            Object.values(asset_swapper_1.ERC20BridgeSource).forEach(s => (emptySources[s] = constants_1.ZERO));
            contracts_test_utils_1.expect(result).to.be.deep.eq([
                {
                    price: B(10),
                    bucket: 0,
                    bucketTotal: B(1),
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(9.5),
                    bucket: 1,
                    bucketTotal: constants_1.ZERO,
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(9),
                    bucket: 2,
                    bucketTotal: constants_1.ZERO,
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(8.5),
                    bucket: 3,
                    bucketTotal: constants_1.ZERO,
                    cumulative: B(1),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1) }),
                },
                {
                    price: B(8),
                    bucket: 4,
                    bucketTotal: B(10),
                    cumulative: B(11),
                    sources: Object.assign(Object.assign({}, emptySources), { [asset_swapper_1.ERC20BridgeSource.Uniswap]: B(1), [asset_swapper_1.ERC20BridgeSource.Native]: B(10) }),
                },
            ]);
        }));
    });
});
//# sourceMappingURL=market_depth_test.js.map