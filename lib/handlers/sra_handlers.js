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
exports.SRAHandlers = void 0;
const json_schemas_1 = require("@0x/json-schemas");
const order_utils_1 = require("@0x/order-utils");
const utils_1 = require("@0x/utils");
const HttpStatus = require("http-status-codes");
const config_1 = require("../config");
const constants_1 = require("../constants");
const errors_1 = require("../errors");
const schemas_1 = require("../schemas/schemas");
const order_utils_2 = require("../utils/order_utils");
const pagination_utils_1 = require("../utils/pagination_utils");
const schema_utils_1 = require("../utils/schema_utils");
class SRAHandlers {
    constructor(orderBook) {
        this._orderBook = orderBook;
    }
    static rootAsync(_req, res) {
        const message = `This is the root of the Standard Relayer API. Visit ${constants_1.SRA_DOCS_URL} for details about this API.`;
        res.status(HttpStatus.OK).send({ message });
    }
    static feeRecipients(req, res) {
        const { page, perPage } = pagination_utils_1.paginationUtils.parsePaginationConfig(req);
        const normalizedFeeRecipient = config_1.FEE_RECIPIENT_ADDRESS.toLowerCase();
        const feeRecipients = [normalizedFeeRecipient];
        const paginatedFeeRecipients = pagination_utils_1.paginationUtils.paginate(feeRecipients, page, perPage);
        res.status(HttpStatus.OK).send(paginatedFeeRecipients);
    }
    static orderConfig(req, res) {
        schema_utils_1.schemaUtils.validateSchema(req.body, json_schemas_1.schemas.orderConfigRequestSchema);
        const orderConfigResponse = order_utils_2.orderUtils.getOrderConfig(req.body);
        res.status(HttpStatus.OK).send(orderConfigResponse);
    }
    assetPairsAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            schema_utils_1.schemaUtils.validateSchema(req.query, json_schemas_1.schemas.assetPairsRequestOptsSchema);
            const { page, perPage } = pagination_utils_1.paginationUtils.parsePaginationConfig(req);
            const assetDataA = req.query.assetDataA;
            const assetDataB = req.query.assetDataB;
            const assetPairs = yield this._orderBook.getAssetPairsAsync(page, perPage, assetDataA && assetDataA.toLowerCase(), assetDataB && assetDataB.toLowerCase());
            res.status(HttpStatus.OK).send(assetPairs);
        });
    }
    getOrderByHashAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const orderIfExists = yield this._orderBook.getOrderByHashIfExistsAsync(req.params.orderHash);
            if (orderIfExists === undefined) {
                throw new errors_1.NotFoundError();
            }
            else {
                res.status(HttpStatus.OK).send(orderIfExists);
            }
        });
    }
    ordersAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            schema_utils_1.schemaUtils.validateSchema(req.query, json_schemas_1.schemas.ordersRequestOptsSchema);
            const { page, perPage } = pagination_utils_1.paginationUtils.parsePaginationConfig(req);
            const paginatedOrders = yield this._orderBook.getOrdersAsync(page, perPage, req.query);
            res.status(HttpStatus.OK).send(paginatedOrders);
        });
    }
    orderbookAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            schema_utils_1.schemaUtils.validateSchema(req.query, json_schemas_1.schemas.orderBookRequestSchema);
            const { page, perPage } = pagination_utils_1.paginationUtils.parsePaginationConfig(req);
            const baseAssetData = req.query.baseAssetData.toLowerCase();
            const quoteAssetData = req.query.quoteAssetData.toLowerCase();
            const orderbookResponse = yield this._orderBook.getOrderBookAsync(page, perPage, baseAssetData, quoteAssetData);
            res.status(HttpStatus.OK).send(orderbookResponse);
        });
    }
    postOrderAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            schema_utils_1.schemaUtils.validateSchema(req.body, schemas_1.schemas.sraPostOrderRequestSchema);
            const signedOrder = unmarshallOrder(req.body);
            if (config_1.WHITELISTED_TOKENS !== '*') {
                const allowedTokens = config_1.WHITELISTED_TOKENS;
                validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
                validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
            }
            const pinResult = yield this._orderBook.splitOrdersByPinningAsync([signedOrder]);
            const isPinned = pinResult.pin.length === 1;
            yield this._orderBook.addOrderAsync(signedOrder, isPinned);
            res.status(HttpStatus.OK).send();
        });
    }
    postOrdersAsync(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            schema_utils_1.schemaUtils.validateSchema(req.body, json_schemas_1.schemas.signedOrdersSchema);
            const signedOrders = unmarshallOrders(req.body);
            if (config_1.WHITELISTED_TOKENS !== '*') {
                const allowedTokens = config_1.WHITELISTED_TOKENS;
                for (const signedOrder of signedOrders) {
                    validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.makerAssetData, 'makerAssetData');
                    validateAssetDataIsWhitelistedOrThrow(allowedTokens, signedOrder.takerAssetData, 'takerAssetData');
                }
            }
            const pinResult = yield this._orderBook.splitOrdersByPinningAsync(signedOrders);
            yield Promise.all([
                this._orderBook.addOrdersAsync(pinResult.pin, true),
                this._orderBook.addOrdersAsync(pinResult.doNotPin, false),
            ]);
            res.status(HttpStatus.OK).send();
        });
    }
}
exports.SRAHandlers = SRAHandlers;
function validateAssetDataIsWhitelistedOrThrow(allowedTokens, assetData, field) {
    const decodedAssetData = order_utils_1.assetDataUtils.decodeAssetDataOrThrow(assetData);
    if (order_utils_2.orderUtils.isMultiAssetData(decodedAssetData)) {
        for (const [, nestedAssetDataElement] of decodedAssetData.nestedAssetData.entries()) {
            validateAssetDataIsWhitelistedOrThrow(allowedTokens, nestedAssetDataElement, field);
        }
    }
    else if (order_utils_2.orderUtils.isTokenAssetData(decodedAssetData)) {
        if (!allowedTokens.includes(decodedAssetData.tokenAddress)) {
            throw new errors_1.ValidationError([
                {
                    field,
                    code: errors_1.ValidationErrorCodes.ValueOutOfRange,
                    reason: `${decodedAssetData.tokenAddress} not supported`,
                },
            ]);
        }
    }
}
// As the order come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrder(signedOrderRaw) {
    const signedOrder = Object.assign(Object.assign({}, signedOrderRaw), { salt: new utils_1.BigNumber(signedOrderRaw.salt), makerAssetAmount: new utils_1.BigNumber(signedOrderRaw.makerAssetAmount), takerAssetAmount: new utils_1.BigNumber(signedOrderRaw.takerAssetAmount), makerFee: new utils_1.BigNumber(signedOrderRaw.makerFee), takerFee: new utils_1.BigNumber(signedOrderRaw.takerFee), expirationTimeSeconds: new utils_1.BigNumber(signedOrderRaw.expirationTimeSeconds) });
    return signedOrder;
}
// As the orders come in as JSON they need to be turned into the correct types such as BigNumber
function unmarshallOrders(signedOrdersRaw) {
    return signedOrdersRaw.map(signedOrderRaw => {
        return unmarshallOrder(signedOrderRaw);
    });
}
//# sourceMappingURL=sra_handlers.js.map