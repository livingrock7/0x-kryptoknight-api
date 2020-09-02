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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignedOrderEntity = void 0;
const typeorm_1 = require("typeorm");
let SignedOrderEntity = class SignedOrderEntity {
    constructor(opts = {}) {
        this.hash = opts.hash;
        this.senderAddress = opts.senderAddress;
        this.makerAddress = opts.makerAddress;
        this.takerAddress = opts.takerAddress;
        this.makerAssetData = opts.makerAssetData;
        this.takerAssetData = opts.takerAssetData;
        this.exchangeAddress = opts.exchangeAddress;
        this.feeRecipientAddress = opts.feeRecipientAddress;
        this.expirationTimeSeconds = opts.expirationTimeSeconds;
        this.makerFee = opts.makerFee;
        this.takerFee = opts.takerFee;
        this.makerFeeAssetData = opts.makerFeeAssetData;
        this.takerFeeAssetData = opts.takerFeeAssetData;
        this.makerAssetAmount = opts.makerAssetAmount;
        this.takerAssetAmount = opts.takerAssetAmount;
        this.salt = opts.salt;
        this.signature = opts.signature;
        this.remainingFillableTakerAssetAmount = opts.remainingFillableTakerAssetAmount;
    }
};
__decorate([
    typeorm_1.PrimaryColumn({ name: 'hash', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "hash", void 0);
__decorate([
    typeorm_1.Column({ name: 'sender_address', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "senderAddress", void 0);
__decorate([
    typeorm_1.Column({ name: 'maker_address', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "makerAddress", void 0);
__decorate([
    typeorm_1.Column({ name: 'taker_address', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "takerAddress", void 0);
__decorate([
    typeorm_1.Column({ name: 'maker_asset_data', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "makerAssetData", void 0);
__decorate([
    typeorm_1.Column({ name: 'taker_asset_data', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "takerAssetData", void 0);
__decorate([
    typeorm_1.Column({ name: 'exchange_address', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "exchangeAddress", void 0);
__decorate([
    typeorm_1.Column({ name: 'fee_recipient_address', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "feeRecipientAddress", void 0);
__decorate([
    typeorm_1.Column({ name: 'expiration_time_seconds', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "expirationTimeSeconds", void 0);
__decorate([
    typeorm_1.Column({ name: 'maker_fee', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "makerFee", void 0);
__decorate([
    typeorm_1.Column({ name: 'taker_fee', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "takerFee", void 0);
__decorate([
    typeorm_1.Column({ name: 'maker_asset_amount', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "makerAssetAmount", void 0);
__decorate([
    typeorm_1.Column({ name: 'taker_asset_amount', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "takerAssetAmount", void 0);
__decorate([
    typeorm_1.Column({ name: 'salt', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "salt", void 0);
__decorate([
    typeorm_1.Column({ name: 'signature', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "signature", void 0);
__decorate([
    typeorm_1.Column({ name: 'remaining_fillable_taker_asset_amount', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "remainingFillableTakerAssetAmount", void 0);
__decorate([
    typeorm_1.Column({ name: 'maker_fee_asset_data', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "makerFeeAssetData", void 0);
__decorate([
    typeorm_1.Column({ name: 'taker_fee_asset_data', type: 'varchar' }),
    __metadata("design:type", String)
], SignedOrderEntity.prototype, "takerFeeAssetData", void 0);
SignedOrderEntity = __decorate([
    typeorm_1.Entity({ name: 'signed_orders' }),
    __metadata("design:paramtypes", [Object])
], SignedOrderEntity);
exports.SignedOrderEntity = SignedOrderEntity;
//# sourceMappingURL=SignedOrderEntity.js.map