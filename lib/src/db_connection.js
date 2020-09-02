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
exports.getDBConnectionAsync = void 0;
const typeorm_1 = require("typeorm");
const ormconfig_1 = require("./ormconfig");
let connection;
/**
 * Creates the DB connnection to use in an app
 */
function getDBConnectionAsync() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!connection) {
            connection = yield typeorm_1.createConnection(ormconfig_1.config);
        }
        return connection;
    });
}
exports.getDBConnectionAsync = getDBConnectionAsync;
//# sourceMappingURL=db_connection.js.map