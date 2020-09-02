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
const utils_1 = require("@0x/utils");
require("mocha");
const parse_utils_1 = require("../src/utils/parse_utils");
const SUITE_NAME = 'parseUtils';
describe(SUITE_NAME, () => {
    it('raises a ValidationError if includedSources is anything else than RFQT', () => __awaiter(void 0, void 0, void 0, function* () {
        contracts_test_utils_1.expect(() => {
            parse_utils_1.parseUtils.parseRequestForExcludedSources({
                includedSources: 'Uniswap',
            }, [], 'price');
        }).throws();
    }));
    it('raises a ValidationError if includedSources is RFQT and a taker is not specified', () => __awaiter(void 0, void 0, void 0, function* () {
        contracts_test_utils_1.expect(() => {
            parse_utils_1.parseUtils.parseRequestForExcludedSources({
                includedSources: 'RFQT',
            }, [], 'price');
        }).throws();
    }));
    it('raises a ValidationError if API keys are not present or valid', () => __awaiter(void 0, void 0, void 0, function* () {
        contracts_test_utils_1.expect(() => {
            parse_utils_1.parseUtils.parseRequestForExcludedSources({
                includedSources: 'RFQT',
                takerAddress: utils_1.NULL_ADDRESS,
                apiKey: 'foo',
            }, ['lorem', 'ipsum'], 'price');
        }).throws();
    }));
    it('returns excludedSources correctly when excludedSources is present', () => __awaiter(void 0, void 0, void 0, function* () {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, nativeExclusivelyRFQT } = parse_utils_1.parseUtils.parseRequestForExcludedSources({
            excludedSources: 'Uniswap,Kyber',
        }, [], 'price');
        contracts_test_utils_1.expect(excludedSources[0]).to.eql(asset_swapper_1.ERC20BridgeSource.Uniswap);
        contracts_test_utils_1.expect(excludedSources[1]).to.eql(asset_swapper_1.ERC20BridgeSource.Kyber);
        contracts_test_utils_1.expect(nativeExclusivelyRFQT).to.eql(false);
    }));
    it('returns empty array if no includedSources and excludedSources are present', () => __awaiter(void 0, void 0, void 0, function* () {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, nativeExclusivelyRFQT } = parse_utils_1.parseUtils.parseRequestForExcludedSources({}, [], 'price');
        contracts_test_utils_1.expect(excludedSources.length).to.eql(0);
        contracts_test_utils_1.expect(nativeExclusivelyRFQT).to.eql(false);
    }));
    it('returns excludedSources correctly when includedSources=RFQT', () => __awaiter(void 0, void 0, void 0, function* () {
        // tslint:disable-next-line: boolean-naming
        const { excludedSources, nativeExclusivelyRFQT } = parse_utils_1.parseUtils.parseRequestForExcludedSources({
            includedSources: 'RFQT',
            takerAddress: utils_1.NULL_ADDRESS,
            apiKey: 'ipsum',
        }, ['lorem', 'ipsum'], 'price');
        contracts_test_utils_1.expect(nativeExclusivelyRFQT).to.eql(true);
        // Ensure that all sources of liquidity are excluded aside from `Native`.
        const allPossibleSources = new Set(Object.keys(asset_swapper_1.ERC20BridgeSource).map(s => asset_swapper_1.ERC20BridgeSource[s]));
        for (const source of excludedSources) {
            allPossibleSources.delete(source);
        }
        const allPossibleSourcesArray = Array.from(allPossibleSources);
        contracts_test_utils_1.expect(allPossibleSourcesArray.length).to.eql(1);
        contracts_test_utils_1.expect(allPossibleSourcesArray[0]).to.eql(asset_swapper_1.ERC20BridgeSource.Native);
    }));
    it('raises a ValidationError if includedSources and excludedSources are both present', () => __awaiter(void 0, void 0, void 0, function* () {
        contracts_test_utils_1.expect(() => {
            parse_utils_1.parseUtils.parseRequestForExcludedSources({
                excludedSources: 'Native',
                includedSources: 'RFQT',
            }, [], 'price');
        }).throws();
    }));
    it('raises a ValidationError if a firm quote is requested and "intentOnFilling" is not set to "true"', () => __awaiter(void 0, void 0, void 0, function* () {
        contracts_test_utils_1.expect(() => {
            parse_utils_1.parseUtils.parseRequestForExcludedSources({
                includedSources: 'RFQT',
                takerAddress: utils_1.NULL_ADDRESS,
                apiKey: 'ipsum',
            }, ['lorem', 'ipsum'], 'quote');
        }).throws();
    }));
});
//# sourceMappingURL=parse_utils_test.js.map