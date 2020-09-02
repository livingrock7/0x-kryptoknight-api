"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDepthUtils = void 0;
const types_1 = require("@0x/asset-swapper/lib/src/utils/market_operation_utils/types");
const types_2 = require("@0x/types");
const utils_1 = require("@0x/utils");
const web3_wrapper_1 = require("@0x/web3-wrapper");
const _ = require("lodash");
const constants_1 = require("../constants");
// tslint:disable:custom-no-magic-numbers
const MAX_DECIMALS = 18;
const ONE_HUNDRED_PERC = 100;
exports.marketDepthUtils = {
    getBucketPrices: (startAmount, endAmount, numSamples, sampleDistributionBase = 1) => {
        const amount = endAmount.minus(startAmount);
        const distribution = [...Array(numSamples)].map((_v, i) => new utils_1.BigNumber(sampleDistributionBase).pow(i).decimalPlaces(MAX_DECIMALS));
        const stepSizes = distribution.map(d => d.div(utils_1.BigNumber.sum(...distribution)));
        const amounts = stepSizes.map((_s, i) => {
            return amount
                .times(utils_1.BigNumber.sum(...[0, ...stepSizes.slice(0, i + 1)]))
                .plus(startAmount)
                .decimalPlaces(MAX_DECIMALS);
        });
        return [startAmount, ...amounts];
    },
    calculateUnitPrice: (input, output, outputToken, inputToken) => {
        if (output && input && output.isGreaterThan(0)) {
            return web3_wrapper_1.Web3Wrapper.toUnitAmount(output, outputToken.decimals).dividedBy(web3_wrapper_1.Web3Wrapper.toUnitAmount(input, inputToken.decimals));
        }
        return constants_1.ZERO;
    },
    getSampleAmountsFromDepthSide: (depthSide) => {
        // Native is not a "sampled" output, here we convert it to be a accumulated sample output
        const nativeIndexIfExists = depthSide.findIndex(s => s[0] && s[0].source === types_1.ERC20BridgeSource.Native);
        // Find an on-chain source which has samples, if possible
        const nonNativeIndexIfExists = depthSide.findIndex(s => s[0] && s[0].source !== types_1.ERC20BridgeSource.Native);
        // If we don't have a on-chain samples, just use the native orders inputs for a super rough guide
        const sampleAmounts = nonNativeIndexIfExists !== -1
            ? depthSide[nonNativeIndexIfExists].map(s => s.input)
            : _.uniqBy(depthSide[nativeIndexIfExists].map(s => s.input), a => a.toString());
        return sampleAmounts;
    },
    sampleNativeOrders: (path, targetInput, side) => {
        let sortedPath = path.sort((a, b) => b.output.dividedBy(b.input).comparedTo(a.output.dividedBy(a.input)));
        sortedPath = side === types_2.MarketOperation.Sell ? sortedPath : sortedPath.reverse();
        let totalOutput = constants_1.ZERO;
        let totalInput = constants_1.ZERO;
        for (const fill of sortedPath) {
            if (totalInput.gte(targetInput)) {
                break;
            }
            const input = utils_1.BigNumber.min(targetInput.minus(totalInput), fill.input);
            const output = input.times(fill.output.dividedBy(fill.input)).integerValue();
            totalOutput = totalOutput.plus(output);
            totalInput = totalInput.plus(input);
        }
        if (totalInput.isLessThan(targetInput)) {
            // TODO do I really want to do this
            return constants_1.ZERO;
        }
        return totalOutput;
    },
    normalizeMarketDepthToSampleOutput: (depthSide, side) => {
        // Native is not a "sampled" output, here we convert it to be a accumulated sample output
        const nativeIndexIfExists = depthSide.findIndex(s => s[0] && s[0].source === types_1.ERC20BridgeSource.Native && s[0].output);
        if (nativeIndexIfExists === -1) {
            return depthSide.filter(s => s && s.length > 0);
        }
        // We should now have [1, 10, 100] sample amounts
        const sampleAmounts = exports.marketDepthUtils.getSampleAmountsFromDepthSide(depthSide);
        const nativeSamples = sampleAmounts.map(a => {
            const sample = exports.marketDepthUtils.sampleNativeOrders(depthSide[nativeIndexIfExists], a, side);
            const input = a;
            const output = sample;
            return {
                input,
                output,
                source: types_1.ERC20BridgeSource.Native,
            };
        });
        const normalizedDepth = [
            ...depthSide.filter(s => s[0] && s[0].source !== types_1.ERC20BridgeSource.Native),
            nativeSamples,
        ].filter(s => s.length > 0);
        return normalizedDepth;
    },
    calculateStartEndBucketPrice: (depthSide, side, endSlippagePerc = 20) => {
        const pricesByAmount = depthSide
            .map(samples => samples
            .map(s => (!s.output.isZero() ? s.output.dividedBy(s.input).decimalPlaces(MAX_DECIMALS) : constants_1.ZERO))
            .filter(s => s.isGreaterThan(constants_1.ZERO)))
            .filter(samples => samples.length > 0);
        let bestInBracket;
        let worstBestInBracket;
        if (side === types_2.MarketOperation.Sell) {
            // Sell we want to sell for a higher price as possible
            bestInBracket = utils_1.BigNumber.max(...pricesByAmount.map(s => utils_1.BigNumber.max(...s)));
            worstBestInBracket = bestInBracket.times((ONE_HUNDRED_PERC - endSlippagePerc) / ONE_HUNDRED_PERC);
        }
        else {
            // Buy we want to buy for the lowest price possible
            bestInBracket = utils_1.BigNumber.min(...pricesByAmount.map(s => utils_1.BigNumber.min(...s)));
            worstBestInBracket = bestInBracket.times((ONE_HUNDRED_PERC + endSlippagePerc) / ONE_HUNDRED_PERC);
        }
        return [bestInBracket, worstBestInBracket];
    },
    distributeSamplesToBuckets: (depthSide, buckets, side) => {
        const allocatedBuckets = buckets.map((b, i) => ({ price: b, bucket: i, bucketTotal: constants_1.ZERO, sources: {} }));
        const getBucketId = (price) => {
            return buckets.findIndex(b => {
                return side === types_2.MarketOperation.Sell ? price.isGreaterThanOrEqualTo(b) : price.isLessThanOrEqualTo(b);
            });
        };
        const sampleToSourceKey = (sample) => {
            const source = sample.source;
            if (!sample.fillData) {
                return source;
            }
            switch (source) {
                case types_1.ERC20BridgeSource.Curve:
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    return `${source}:${sample.fillData.curve.poolAddress}`;
                case types_1.ERC20BridgeSource.Balancer:
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    return `${source}:${sample.fillData.poolAddress}`;
                case types_1.ERC20BridgeSource.UniswapV2:
                    // tslint:disable-next-line:no-unnecessary-type-assertion
                    return `${source}:${sample.fillData.tokenAddressPath.join('-')}`;
                default:
                    break;
            }
            return source;
        };
        for (const samples of depthSide) {
            // Since multiple samples can fall into a bucket we do not want to
            // double count them.
            // Curve, Balancer etc can have the same source strings but be from different
            // pools, so we modify their source string temporarily to attribute
            // the different pool
            const source = sampleToSourceKey(samples[0]);
            for (const sample of samples) {
                if (sample.output.isZero()) {
                    continue;
                }
                const price = sample.output.dividedBy(sample.input).decimalPlaces(MAX_DECIMALS);
                const bucketId = getBucketId(price);
                if (bucketId === -1) {
                    // No bucket available so we ignore
                    continue;
                }
                const bucket = allocatedBuckets[bucketId];
                // If two samples from the same source have landed in the same bucket, take the latter
                bucket.bucketTotal =
                    bucket.sources[source] && !bucket.sources[source].isZero()
                        ? bucket.bucketTotal.minus(bucket.sources[source]).plus(sample.input)
                        : bucket.bucketTotal.plus(sample.input);
                bucket.sources[source] = sample.input;
            }
        }
        // Normalize the source names back and create a cumulative total
        const normalizedCumulativeBuckets = allocatedBuckets.map((b, bucketIndex) => {
            // Sum all of the various pools which fall under once source (Balancer, Uniswap, Curve...)
            const findLastNonEmptyBucketResult = (source) => {
                let lastValue = constants_1.ZERO;
                for (let i = bucketIndex - 1; i >= 0; i--) {
                    const value = allocatedBuckets[i].sources[source];
                    if (value && !value.isZero()) {
                        lastValue = value;
                        break;
                    }
                }
                return lastValue;
            };
            for (const key of Object.keys(b.sources)) {
                const source = key.split(':')[0];
                if (source !== key && Object.values(types_1.ERC20BridgeSource).includes(source)) {
                    // Curve:0xabcd,100 -> Curve,100
                    // Add Curve:0abcd to Curve
                    b.sources[source] = b.sources[source] ? b.sources[source].plus(b.sources[key]) : b.sources[key];
                    delete b.sources[key];
                }
            }
            // Accumulate the sources from the previous bucket
            for (const source of Object.values(types_1.ERC20BridgeSource)) {
                // Add the previous bucket
                const previousValue = findLastNonEmptyBucketResult(source);
                b.sources[source] = utils_1.BigNumber.max(previousValue, b.sources[source] || constants_1.ZERO);
            }
            const cumulative = utils_1.BigNumber.sum(...Object.values(b.sources));
            return Object.assign(Object.assign({}, b), { cumulative, sources: b.sources });
        });
        return normalizedCumulativeBuckets;
    },
    calculateDepthForSide: (rawDepthSide, side, numBuckets = constants_1.MARKET_DEPTH_MAX_SAMPLES, bucketDistribution = constants_1.MARKET_DEPTH_DEFAULT_DISTRIBUTION, maxEndSlippagePercentage = constants_1.MARKET_DEPTH_END_PRICE_SLIPPAGE_PERC) => {
        const depthSide = exports.marketDepthUtils.normalizeMarketDepthToSampleOutput(rawDepthSide, side);
        const [startPrice, endPrice] = exports.marketDepthUtils.calculateStartEndBucketPrice(depthSide, side, maxEndSlippagePercentage);
        const buckets = exports.marketDepthUtils.getBucketPrices(startPrice, endPrice, numBuckets, bucketDistribution);
        const distributedBuckets = exports.marketDepthUtils.distributeSamplesToBuckets(depthSide, buckets, side);
        return distributedBuckets;
    },
};
//# sourceMappingURL=market_depth_utils.js.map