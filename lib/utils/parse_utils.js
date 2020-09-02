"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseUtils = void 0;
const assert_1 = require("@0x/assert");
const asset_swapper_1 = require("@0x/asset-swapper");
const errors_1 = require("../errors");
const rate_limiters_1 = require("./rate-limiters");
/**
 * This constant contains, as keys, all ERC20BridgeSource types except from `Native`.
 * As we add more bridge sources to AssetSwapper, we want to keep ourselves accountable to add
 * them to this constant. Since there isn't a good way to enumerate over enums, we use a obect type.
 * The type has been defined in a way that the code won't compile if a new ERC20BridgeSource is added.
 */
const ALL_EXCEPT_NATIVE = {
    Uniswap: true,
    Balancer: true,
    Bancor: true,
    Curve: true,
    Eth2Dai: true,
    Kyber: true,
    LiquidityProvider: true,
    MultiBridge: true,
    Uniswap_V2: true,
    mStable: true,
};
exports.parseUtils = {
    parseRequestForExcludedSources(request, validApiKeys, endpoint) {
        // Ensure that both filtering arguments cannot be present.
        if (request.excludedSources !== undefined && request.includedSources !== undefined) {
            throw new errors_1.ValidationError([
                {
                    field: 'excludedSources',
                    code: errors_1.ValidationErrorCodes.IncorrectFormat,
                    reason: errors_1.ValidationErrorReasons.ConflictingFilteringArguments,
                },
                {
                    field: 'includedSources',
                    code: errors_1.ValidationErrorCodes.IncorrectFormat,
                    reason: errors_1.ValidationErrorReasons.ConflictingFilteringArguments,
                },
            ]);
        }
        // If excludedSources is present, parse the string array and return
        if (request.excludedSources !== undefined) {
            return {
                excludedSources: exports.parseUtils.parseStringArrForERC20BridgeSources(request.excludedSources.split(',')),
                nativeExclusivelyRFQT: false,
            };
        }
        if (request.includedSources !== undefined) {
            // Only RFQT is eligible as of now
            if (request.includedSources === 'RFQT') {
                // We assume that if a `takerAddress` key is present, it's value was already validated by the JSON
                // schema.
                if (request.takerAddress === undefined) {
                    throw new errors_1.ValidationError([
                        {
                            field: 'takerAddress',
                            code: errors_1.ValidationErrorCodes.RequiredField,
                            reason: errors_1.ValidationErrorReasons.TakerAddressInvalid,
                        },
                    ]);
                }
                // We enforce a valid API key - we don't want to fail silently.
                if (request.apiKey === undefined) {
                    throw new errors_1.ValidationError([
                        {
                            field: '0x-api-key',
                            code: errors_1.ValidationErrorCodes.RequiredField,
                            reason: errors_1.ValidationErrorReasons.InvalidApiKey,
                        },
                    ]);
                }
                if (!validApiKeys.includes(request.apiKey)) {
                    throw new errors_1.ValidationError([
                        {
                            field: '0x-api-key',
                            code: errors_1.ValidationErrorCodes.FieldInvalid,
                            reason: errors_1.ValidationErrorReasons.InvalidApiKey,
                        },
                    ]);
                }
                // If the user is requesting a firm quote, we want to make sure that `intentOnFilling` is set to "true".
                if (endpoint === 'quote' && request.intentOnFilling !== 'true') {
                    throw new errors_1.ValidationError([
                        {
                            field: 'intentOnFilling',
                            code: errors_1.ValidationErrorCodes.RequiredField,
                            reason: errors_1.ValidationErrorReasons.RequiresIntentOnFilling,
                        },
                    ]);
                }
                return {
                    nativeExclusivelyRFQT: true,
                    excludedSources: Object.keys(ALL_EXCEPT_NATIVE),
                };
            }
            else {
                throw new errors_1.ValidationError([
                    {
                        field: 'includedSources',
                        code: errors_1.ValidationErrorCodes.IncorrectFormat,
                        reason: errors_1.ValidationErrorReasons.ArgumentNotYetSupported,
                    },
                ]);
            }
        }
        return { excludedSources: [], nativeExclusivelyRFQT: false };
    },
    parseStringArrForERC20BridgeSources(excludedSources) {
        // Need to compare value of the enum instead of the key, as values are used by asset-swapper
        // CurveUsdcDaiUsdt = 'Curve_USDC_DAI_USDT' is excludedSources=Curve_USDC_DAI_USDT
        return excludedSources
            .map(source => (source === '0x' ? 'Native' : source))
            .filter((source) => Object.keys(asset_swapper_1.ERC20BridgeSource).find((k) => asset_swapper_1.ERC20BridgeSource[k] === source));
    },
    parseJsonStringForMetaTransactionRateLimitConfigOrThrow(configString) {
        const parsedConfig = JSON.parse(configString);
        Object.entries(parsedConfig).forEach(entry => {
            const [key, value] = entry;
            assert_1.assert.doesBelongToStringEnum('dbField', key, rate_limiters_1.DatabaseKeysUsedForRateLimiter);
            Object.entries(value).forEach(configEntry => {
                const [rateLimiterType, rateLimiterConfig] = configEntry;
                switch (rateLimiterType) {
                    case rate_limiters_1.AvailableRateLimiter.Daily:
                        const dailyConfig = rateLimiterConfig;
                        if (dailyConfig === undefined) {
                            throw new Error(`missing configuration for daily rate limiter: ${entry}`);
                        }
                        assert_1.assert.isNumber('allowedDailyLimit', dailyConfig.allowedDailyLimit);
                        break;
                    case rate_limiters_1.AvailableRateLimiter.Rolling:
                        const rollingConfig = rateLimiterConfig;
                        if (rollingConfig === undefined) {
                            throw new Error(`missing configuration for rolling rate limiter: ${entry}`);
                        }
                        assert_1.assert.isNumber('allowedLimit', rollingConfig.allowedLimit);
                        assert_1.assert.isNumber('intervalNumber', rollingConfig.intervalNumber);
                        assert_1.assert.doesBelongToStringEnum('intervalUnit', rollingConfig.intervalUnit, rate_limiters_1.RollingLimiterIntervalUnit);
                        break;
                    case rate_limiters_1.AvailableRateLimiter.RollingValue:
                        const rollingValueConfig = rateLimiterConfig;
                        if (rollingValueConfig === undefined) {
                            throw new Error(`missing configuration for rolling value rate limiter: ${entry}`);
                        }
                        assert_1.assert.isNumber('allowedLimitEth', rollingValueConfig.allowedLimitEth);
                        assert_1.assert.isNumber('intervalNumber', rollingValueConfig.intervalNumber);
                        assert_1.assert.doesBelongToStringEnum('intervalUnit', rollingValueConfig.intervalUnit, rate_limiters_1.RollingLimiterIntervalUnit);
                        break;
                    default:
                        throw new Error(`unsupported rate limiter type: ${key}`);
                }
            });
        });
        return parsedConfig;
    },
};
//# sourceMappingURL=parse_utils.js.map