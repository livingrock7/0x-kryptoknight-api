"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const config_1 = require("./config");
const entities_1 = require("./entities");
const entities = [entities_1.SignedOrderEntity, entities_1.TransactionEntity, entities_1.KeyValueEntity];
exports.config = Object.assign({ type: 'postgres', entities, 
    // Disable synchronization in production
    synchronize: process.env.NODE_ENV && process.env.NODE_ENV === 'test', logging: true, logger: 'debug', extra: {
        max: 15,
        statement_timeout: 10000,
    } }, (config_1.POSTGRES_READ_REPLICA_URIS
    ? {
        replication: {
            master: { url: config_1.POSTGRES_URI },
            slaves: config_1.POSTGRES_READ_REPLICA_URIS.map(r => ({ url: r })),
        },
    }
    : { url: config_1.POSTGRES_URI }));
//# sourceMappingURL=ormconfig.js.map