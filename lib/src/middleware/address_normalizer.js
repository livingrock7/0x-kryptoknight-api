"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addressNormalizer = void 0;
/**
 * Searches for keys matching `[x]Address` in query params, and transforms values to lowercase
 */
function addressNormalizer(req, _, next) {
    const addressKeys = Object.keys(req.query).filter(key => key.match(/\w+Address/));
    const normalized = {};
    for (const key of addressKeys) {
        normalized[key] = req.query[key].toLowerCase();
    }
    req.query = Object.assign(Object.assign({}, req.query), normalized);
    next();
}
exports.addressNormalizer = addressNormalizer;
//# sourceMappingURL=address_normalizer.js.map