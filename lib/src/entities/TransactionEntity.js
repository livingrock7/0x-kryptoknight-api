"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransactionEntity_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionEntity = void 0;
const assert_1 = require("@0x/assert");
const utils_1 = require("@0x/utils");
const typeorm_1 = require("typeorm");
const config_1 = require("../config");
const constants_1 = require("../constants");
const types_1 = require("../types");
const transformers_1 = require("./transformers");
let TransactionEntity = TransactionEntity_1 = class TransactionEntity {
    // HACK(oskar) we want all fields to be set and valid, otherwise we should
    // not accept a transaction entity, however because of this issue:
    // https://github.com/typeorm/typeorm/issues/1772 we cannot accept undefined
    // as an argument to the constructor, to not break migrations with
    // serialize. Please use the public static make method instead.
    constructor(opts = {
        refHash: '',
        txHash: '',
        to: '',
        data: '',
        apiKey: '',
        takerAddress: '',
        status: '',
        expectedMinedInSec: config_1.META_TXN_RELAY_EXPECTED_MINED_SEC,
        nonce: 0,
        gasPrice: constants_1.ZERO,
        value: constants_1.ZERO,
        from: '',
        gas: null,
        gasUsed: null,
        txStatus: null,
    }) {
        this.refHash = opts.refHash;
        this.txHash = opts.txHash;
        this.takerAddress = opts.takerAddress;
        this.to = opts.to;
        this.data = opts.data;
        this.apiKey = opts.apiKey;
        this.status = opts.status;
        this.expectedMinedInSec = opts.expectedMinedInSec;
        this.nonce = opts.nonce;
        this.gasPrice = opts.gasPrice;
        this.value = opts.value;
        this.blockNumber = opts.blockNumber;
        this.from = opts.from;
        this.gas = opts.gas;
        this.gasUsed = opts.gasUsed;
        this.txStatus = opts.txStatus;
        const now = new Date();
        this.expectedAt = new Date(now.getTime() + this.expectedMinedInSec * constants_1.ONE_SECOND_MS);
    }
    static make(opts) {
        assert_1.assert.isHexString('refHash', opts.refHash);
        if (opts.txHash !== undefined) {
            assert_1.assert.isHexString('txHash', opts.txHash);
        }
        if (opts.from !== undefined) {
            assert_1.assert.isETHAddressHex('from', opts.from);
        }
        assert_1.assert.doesBelongToStringEnum('status', opts.status, types_1.TransactionStates);
        if (opts.nonce !== undefined && !Number.isInteger(opts.nonce) && opts.nonce <= 0) {
            throw new Error(`Expected nonce to be a positive integer, encountered: ${opts.nonce}`);
        }
        if (opts.blockNumber !== undefined && !Number.isInteger(opts.blockNumber) && opts.blockNumber <= 0) {
            throw new Error(`Expected blockNumber to be a positive integer, encountered: ${opts.blockNumber}`);
        }
        return new TransactionEntity_1(opts);
    }
};
__decorate([
    typeorm_1.PrimaryColumn({ name: 'ref_hash', type: 'varchar' }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "refHash", void 0);
__decorate([
    typeorm_1.Column({ name: 'data', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "data", void 0);
__decorate([
    typeorm_1.Column({ name: 'to', type: 'varchar' }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "to", void 0);
__decorate([
    typeorm_1.Column({ name: 'tx_hash', type: 'varchar', unique: true, nullable: true }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "txHash", void 0);
__decorate([
    typeorm_1.Column({ name: 'status', type: 'varchar' }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "status", void 0);
__decorate([
    typeorm_1.Column({ name: 'taker_address', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "takerAddress", void 0);
__decorate([
    typeorm_1.Column({ name: 'expected_mined_in_sec', type: 'int' }),
    __metadata("design:type", Number)
], TransactionEntity.prototype, "expectedMinedInSec", void 0);
__decorate([
    typeorm_1.Column({ name: 'gas_price', type: 'bigint', nullable: true, transformer: transformers_1.BigNumberTransformer }),
    __metadata("design:type", utils_1.BigNumber)
], TransactionEntity.prototype, "gasPrice", void 0);
__decorate([
    typeorm_1.Column({ name: 'value', type: 'bigint', nullable: true, transformer: transformers_1.BigNumberTransformer }),
    __metadata("design:type", utils_1.BigNumber)
], TransactionEntity.prototype, "value", void 0);
__decorate([
    typeorm_1.Column({ name: 'gas', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], TransactionEntity.prototype, "gas", void 0);
__decorate([
    typeorm_1.Column({ name: 'from', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "from", void 0);
__decorate([
    typeorm_1.Column({ name: 'nonce', type: 'bigint', nullable: true, transformer: transformers_1.BigIntTransformer }),
    __metadata("design:type", Number)
], TransactionEntity.prototype, "nonce", void 0);
__decorate([
    typeorm_1.Column({ name: 'gas_used', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], TransactionEntity.prototype, "gasUsed", void 0);
__decorate([
    typeorm_1.Column({ name: 'block_number', type: 'bigint', nullable: true, transformer: transformers_1.BigIntTransformer }),
    __metadata("design:type", Number)
], TransactionEntity.prototype, "blockNumber", void 0);
__decorate([
    typeorm_1.Column({ name: 'tx_status', type: 'int', nullable: true }),
    __metadata("design:type", Number)
], TransactionEntity.prototype, "txStatus", void 0);
__decorate([
    typeorm_1.Column({ name: 'api_key', type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], TransactionEntity.prototype, "apiKey", void 0);
__decorate([
    typeorm_1.CreateDateColumn({ name: 'created_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TransactionEntity.prototype, "createdAt", void 0);
__decorate([
    typeorm_1.UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TransactionEntity.prototype, "updatedAt", void 0);
__decorate([
    typeorm_1.Column({ name: 'expected_at', type: 'timestamptz' }),
    __metadata("design:type", Date)
], TransactionEntity.prototype, "expectedAt", void 0);
TransactionEntity = TransactionEntity_1 = __decorate([
    typeorm_1.Entity({ name: 'transactions' }),
    __metadata("design:paramtypes", [Object])
], TransactionEntity);
exports.TransactionEntity = TransactionEntity;
//# sourceMappingURL=TransactionEntity.js.map