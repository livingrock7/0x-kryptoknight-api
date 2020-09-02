"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const asset_swapper_1 = require("@0x/asset-swapper");
const contracts_test_utils_1 = require("@0x/contracts-test-utils");
const utils_1 = require("@0x/utils");
// tslint:disable-next-line:no-implicit-dependencies
require("mocha");
const constants_1 = require("../src/constants");
const service_utils_1 = require("../src/utils/service_utils");
const constants_2 = require("./constants");
const mocks_1 = require("./utils/mocks");
const SUITE_NAME = 'serviceUtils test';
// tslint:disable:custom-no-magic-numbers
describe(SUITE_NAME, () => {
    describe('excludeProprietarySources', () => {
        it('will exclude liquidity provider if an API key is not present or invalid', () => {
            const tests = ['foo', undefined, 'lol'];
            for (const test of tests) {
                const result = service_utils_1.serviceUtils.determineExcludedSources([asset_swapper_1.ERC20BridgeSource.Balancer], test, ['bar']);
                contracts_test_utils_1.expect(result).to.eql([asset_swapper_1.ERC20BridgeSource.Balancer, asset_swapper_1.ERC20BridgeSource.LiquidityProvider]);
            }
        });
        it('will not add a duplicate entry for LiquidityProvider if already present', () => {
            const result = service_utils_1.serviceUtils.determineExcludedSources([asset_swapper_1.ERC20BridgeSource.LiquidityProvider], 'foo', ['bar']);
            contracts_test_utils_1.expect(result).to.eql([asset_swapper_1.ERC20BridgeSource.LiquidityProvider]);
        });
        it('will not modify the existing excluded sources if a valid API key is present', () => {
            const tests = [
                [[], 'bar'],
                [[asset_swapper_1.ERC20BridgeSource.Curve, asset_swapper_1.ERC20BridgeSource.Eth2Dai], 'bar'],
                [[asset_swapper_1.ERC20BridgeSource.LiquidityProvider, asset_swapper_1.ERC20BridgeSource.Eth2Dai], 'bar'],
            ];
            for (const test of tests) {
                const [currentExcludedSources, apiKey] = test;
                const newExcludedSources = service_utils_1.serviceUtils.determineExcludedSources(currentExcludedSources, apiKey, [
                    'bar',
                ]);
                contracts_test_utils_1.expect(newExcludedSources).to.eql(currentExcludedSources);
            }
        });
    });
    describe('getEstimatedGasTokenRefundInfo', () => {
        it('returns an estimate when there are gasTokens and bridge fills', () => {
            const fakeOrders = [
                {
                    fills: [
                        {
                            source: asset_swapper_1.ERC20BridgeSource.Uniswap,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = service_utils_1.serviceUtils.getEstimatedGasTokenRefundInfo(fakeOrders, constants_2.MAX_INT);
            contracts_test_utils_1.expect(usedGasTokens).to.be.eq(8);
            contracts_test_utils_1.expect(gasTokenRefund.toNumber()).to.be.eq(1920000);
            contracts_test_utils_1.expect(gasTokenGasCost.toNumber()).to.be.eq(54960);
        });
        it('does not return an estimate when there are bridge fills but no gas tokens', () => {
            const fakeOrders = [
                {
                    fills: [
                        {
                            source: asset_swapper_1.ERC20BridgeSource.Uniswap,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = service_utils_1.serviceUtils.getEstimatedGasTokenRefundInfo(fakeOrders, constants_1.ZERO);
            contracts_test_utils_1.expect(usedGasTokens).to.be.eq(0);
            contracts_test_utils_1.expect(gasTokenRefund.toNumber()).to.be.eq(0);
            contracts_test_utils_1.expect(gasTokenGasCost.toNumber()).to.be.eq(0);
        });
        it('does not return an estimate when there are gas tokens but no bridge fills', () => {
            const fakeOrders = [
                {
                    fills: [
                        {
                            source: asset_swapper_1.ERC20BridgeSource.Native,
                        },
                    ],
                },
            ];
            const { usedGasTokens, gasTokenRefund, gasTokenGasCost } = service_utils_1.serviceUtils.getEstimatedGasTokenRefundInfo(fakeOrders, constants_2.MAX_INT);
            contracts_test_utils_1.expect(usedGasTokens).to.be.eq(0);
            contracts_test_utils_1.expect(gasTokenRefund.toNumber()).to.be.eq(0);
            contracts_test_utils_1.expect(gasTokenGasCost.toNumber()).to.be.eq(0);
        });
    });
    describe('attributeCallData', () => {
        it('it returns a reasonable ID and timestamp', () => {
            const fakeCallData = '0x0000000000000';
            const fakeAffiliate = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
            const attributedCallData = service_utils_1.serviceUtils.attributeCallData(fakeCallData, fakeAffiliate).affiliatedData;
            const currentTime = new Date();
            // parse out items from call data to ensure they are reasonable values
            const selectorPos = attributedCallData.indexOf(constants_2.AFFILIATE_DATA_SELECTOR);
            const affiliateAddress = '0x'.concat(attributedCallData.substring(selectorPos + 32, selectorPos + 72));
            const randomId = attributedCallData.substring(selectorPos + 118, selectorPos + 128);
            const timestampFromCallDataHex = attributedCallData.substring(selectorPos + 128, selectorPos + 136);
            const timestampFromCallData = parseInt(timestampFromCallDataHex, 16);
            contracts_test_utils_1.expect(affiliateAddress).to.be.eq(fakeAffiliate);
            // call data timestamp is within 3 seconds of timestamp created during test
            contracts_test_utils_1.expect(timestampFromCallData).to.be.greaterThan(currentTime.getTime() / 1000 - 3);
            contracts_test_utils_1.expect(timestampFromCallData).to.be.lessThan(currentTime.getTime() / 1000 + 3);
            // ID is a 10-digit hex number
            contracts_test_utils_1.expect(randomId).to.match(/[0-9A-Fa-f]{10}/);
        });
    });
    describe('getAffiliateFeeAmounts', () => {
        it('returns the correct amounts if the fee is zero', () => {
            const affiliateFee = {
                recipient: '',
                buyTokenPercentageFee: 0,
                sellTokenPercentageFee: 0,
            };
            const costInfo = service_utils_1.serviceUtils.getAffiliateFeeAmounts(mocks_1.randomSellQuote, affiliateFee);
            contracts_test_utils_1.expect(costInfo).to.deep.equal({
                buyTokenFeeAmount: constants_1.ZERO,
                sellTokenFeeAmount: constants_1.ZERO,
                gasCost: constants_1.ZERO,
            });
        });
        it('returns the correct amounts if the fee is non-zero', () => {
            const affiliateFee = {
                recipient: '',
                buyTokenPercentageFee: 0.01,
                sellTokenPercentageFee: 0,
            };
            const costInfo = service_utils_1.serviceUtils.getAffiliateFeeAmounts(mocks_1.randomSellQuote, affiliateFee);
            contracts_test_utils_1.expect(costInfo).to.deep.equal({
                buyTokenFeeAmount: mocks_1.randomSellQuote.worstCaseQuoteInfo.makerAssetAmount
                    .times(affiliateFee.buyTokenPercentageFee)
                    .dividedBy(affiliateFee.buyTokenPercentageFee + 1)
                    .integerValue(utils_1.BigNumber.ROUND_DOWN),
                sellTokenFeeAmount: constants_1.ZERO,
                gasCost: constants_1.AFFILIATE_FEE_TRANSFORMER_GAS,
            });
        });
    });
});
//# sourceMappingURL=service_utils_test.js.map