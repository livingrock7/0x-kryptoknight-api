"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = void 0;
const metaTransactionFillRequestSchema = require("./meta_transaction_fill_request_schema.json");
const metaTransactionQuoteRequestSchema = require("./meta_transaction_quote_request_schema.json");
const sraPostOrderRequestSchema = require("./sra_post_order_request_schema.json");
const stakingEpochRequestSchema = require("./staking_epoch_request_schema.json");
const swapQuoteRequestSchema = require("./swap_quote_request_schema.json");
exports.schemas = {
    swapQuoteRequestSchema,
    sraPostOrderRequestSchema,
    metaTransactionFillRequestSchema,
    metaTransactionQuoteRequestSchema,
    stakingEpochRequestSchema,
};
//# sourceMappingURL=schemas.js.map