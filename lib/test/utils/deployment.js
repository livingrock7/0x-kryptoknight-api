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
exports.teardownMeshAsync = exports.setupMeshAsync = exports.teardownDependenciesAsync = exports.setupDependenciesAsync = exports.teardownApiAsync = exports.setupApiAsync = exports.LogType = void 0;
const utils_1 = require("@0x/utils");
const child_process_1 = require("child_process");
const fs = require("fs");
const path = require("path");
const util_1 = require("util");
const config_1 = require("../../src/config");
const db_connection_1 = require("../../src/db_connection");
const db_connection_2 = require("./db_connection");
const apiRootDir = path.normalize(path.resolve(`${__dirname}/../../../`));
const testRootDir = `${apiRootDir}/test`;
var LogType;
(function (LogType) {
    LogType[LogType["Console"] = 0] = "Console";
    LogType[LogType["File"] = 1] = "File";
})(LogType = exports.LogType || (exports.LogType = {}));
let start;
/**
 * Sets up a 0x-api instance.
 * @param logConfig Where logs should be directed.
 */
function setupApiAsync(suiteName, logConfig = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        if (start) {
            throw new Error('Old 0x-api instance has not been torn down');
        }
        yield setupDependenciesAsync(suiteName, logConfig.dependencyLogType);
        start = child_process_1.spawn('yarn', ['start'], {
            cwd: apiRootDir,
            env: process.env,
        });
        directLogs(start, suiteName, 'start', logConfig.apiLogType);
        yield waitForApiStartupAsync(start);
    });
}
exports.setupApiAsync = setupApiAsync;
/**
 * Tears down the old 0x-api instance.
 * @param suiteName The name of the test suite that is using this function. This
 *        helps to make the logs more intelligible.
 * @param logType Indicates where logs should be directed.
 */
function teardownApiAsync(suiteName, logType) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!start) {
            throw new Error('There is no 0x-api instance to tear down');
        }
        yield killAsync(config_1.HTTP_PORT);
        start = undefined;
        yield teardownDependenciesAsync(suiteName, logType);
    });
}
exports.teardownApiAsync = teardownApiAsync;
function killAsync(port) {
    return __awaiter(this, void 0, void 0, function* () {
        yield util_1.promisify(child_process_1.exec)(`lsof -ti :${port} | xargs kill -9`);
    });
}
let didTearDown = false;
/**
 * Sets up 0x-api's dependencies.
 * @param suiteName The name of the test suite that is using this function. This
 *        helps to make the logs more intelligible.
 * @param logType Indicates where logs should be directed.
 */
function setupDependenciesAsync(suiteName, logType) {
    return __awaiter(this, void 0, void 0, function* () {
        yield createFreshDockerComposeFileOnceAsync();
        // Tear down any existing dependencies or lingering data if a tear-down has
        // not been called yet.
        if (!didTearDown) {
            yield teardownDependenciesAsync(suiteName, logType);
        }
        // Spin up the 0x-api dependencies
        const up = child_process_1.spawn('docker-compose', ['up'], {
            cwd: testRootDir,
            env: Object.assign(Object.assign({}, process.env), { ETHEREUM_RPC_URL: 'http://ganache:8545', ETHEREUM_CHAIN_ID: '1337', CHAIN_ID: '1337' }),
        });
        directLogs(up, suiteName, 'up', logType);
        didTearDown = false;
        // Wait for the dependencies to boot up.
        yield waitForDependencyStartupAsync(up);
        yield sleepAsync(10); // tslint:disable-line:custom-no-magic-numbers
        yield confirmPostgresConnectivityAsync();
        // Create a test db connection in this instance, and synchronize it
        yield db_connection_2.getTestDBConnectionAsync();
    });
}
exports.setupDependenciesAsync = setupDependenciesAsync;
/**
 * Tears down 0x-api's dependencies.
 * @param suiteName The name of the test suite that is using this function. This
 *        helps to make the logs more intelligible.
 * @param logType Indicates where logs should be directed.
 */
function teardownDependenciesAsync(suiteName, logType) {
    return __awaiter(this, void 0, void 0, function* () {
        // Tear down any existing docker containers from the `docker-compose.yml` file.
        const down = child_process_1.spawn('docker-compose', ['down'], {
            cwd: testRootDir,
        });
        directLogs(down, suiteName, 'down', logType);
        const downTimeout = 20000;
        yield waitForCloseAsync(down, 'down', downTimeout);
        didTearDown = true;
    });
}
exports.teardownDependenciesAsync = teardownDependenciesAsync;
/**
 * Starts up 0x-mesh.
 * @param suiteName The name of the test suite that is using this function. This
 *        helps to make the logs more intelligible.
 * @param logType Indicates where logs should be directed.
 */
function setupMeshAsync(suiteName, logType) {
    return __awaiter(this, void 0, void 0, function* () {
        yield createFreshDockerComposeFileOnceAsync();
        // Spin up a 0x-mesh instance
        const up = child_process_1.spawn('docker-compose', ['up', 'mesh'], {
            cwd: testRootDir,
            env: Object.assign(Object.assign({}, process.env), { ETHEREUM_RPC_URL: 'http://ganache:8545', ETHEREUM_CHAIN_ID: '1337' }),
        });
        directLogs(up, suiteName, 'up', logType);
        yield waitForMeshStartupAsync(up);
        // HACK(jalextowle): For some reason, Mesh Clients would connect to
        // the old mesh node. Try to remove this.
        yield sleepAsync(15); // tslint:disable-line:custom-no-magic-numbers
    });
}
exports.setupMeshAsync = setupMeshAsync;
/**
 * Tears down the running 0x-mesh instance.
 * @param suiteName The name of the test suite that is using this function. This
 *        helps to make the logs more intelligible.
 * @param logType Indicates where logs should be directed.
 */
function teardownMeshAsync(suiteName, logType) {
    return __awaiter(this, void 0, void 0, function* () {
        const stop = child_process_1.spawn('docker-compose', ['stop', 'mesh'], {
            cwd: testRootDir,
        });
        directLogs(stop, suiteName, 'mesh_stop', logType);
        const stopTimeout = 10000;
        yield waitForCloseAsync(stop, 'mesh_stop', stopTimeout);
        const rm = child_process_1.spawn('docker-compose', ['rm', '-f', '-s', '-v', 'mesh'], {
            cwd: testRootDir,
        });
        directLogs(rm, suiteName, 'mesh_rm', logType);
        const rmTimeout = 10000;
        yield waitForCloseAsync(rm, 'mesh_rm', rmTimeout);
    });
}
exports.teardownMeshAsync = teardownMeshAsync;
function directLogs(stream, suiteName, command, logType) {
    if (logType === LogType.Console) {
        stream.stdout.on('data', chunk => {
            neatlyPrintChunk(`[${suiteName}-${command}]`, chunk);
        });
        stream.stderr.on('data', chunk => {
            neatlyPrintChunk(`[${suiteName}-${command} | error]`, chunk);
        });
    }
    else if (logType === LogType.File) {
        const logStream = fs.createWriteStream(`${apiRootDir}/${suiteName}_${command}_logs`, { flags: 'a' });
        const errorStream = fs.createWriteStream(`${apiRootDir}/${suiteName}_${command}_errors`, { flags: 'a' });
        stream.stdout.pipe(logStream);
        stream.stderr.pipe(errorStream);
    }
}
const volumeRegex = new RegExp(/[ \t\r]*volumes:.*\n([ \t\r]*-.*\n)+/, 'g');
let didCreateFreshComposeFile = false;
// Removes the volume fields from the docker-compose.yml to fix a
// docker compatibility issue with Linux systems.
// Issue: https://github.com/0xProject/0x-api/issues/186
function createFreshDockerComposeFileOnceAsync() {
    return __awaiter(this, void 0, void 0, function* () {
        if (didCreateFreshComposeFile) {
            return;
        }
        const dockerComposeString = (yield util_1.promisify(fs.readFile)(`${apiRootDir}/docker-compose.yml`)).toString();
        yield util_1.promisify(fs.writeFile)(`${testRootDir}/docker-compose.yml`, dockerComposeString.replace(volumeRegex, ''));
        didCreateFreshComposeFile = true;
    });
}
function neatlyPrintChunk(prefix, chunk) {
    const data = chunk.toString().split('\n');
    data.filter((datum) => datum !== '').map((datum) => {
        utils_1.logUtils.log(prefix, datum.trim());
    });
}
function waitForCloseAsync(stream, command, timeout) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            stream.on('close', () => {
                resolve();
            });
            if (timeout !== undefined) {
                setTimeout(() => {
                    reject(new Error(`Timed out waiting for "${command}" to close`));
                }, timeout);
            }
        });
    });
}
function waitForApiStartupAsync(logStream) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            logStream.stdout.on('data', (chunk) => {
                const data = chunk.toString().split('\n');
                for (const datum of data) {
                    if (/server listening.*/.test(datum)) {
                        resolve();
                    }
                }
            });
            setTimeout(() => {
                reject(new Error('Timed out waiting for 0x-api logs'));
            }, 30000); // tslint:disable-line:custom-no-magic-numbers
        });
    });
}
function waitForMeshStartupAsync(logStream) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let didStartWSServer = false;
            let didStartHttpServer = false;
            logStream.stdout.on('data', (chunk) => {
                const data = chunk.toString().split('\n');
                for (const datum of data) {
                    if (!didStartHttpServer && /.*mesh.*started HTTP RPC server/.test(datum)) {
                        didStartHttpServer = true;
                    }
                    else if (!didStartWSServer && /.*mesh.*started WS RPC server/.test(datum)) {
                        didStartWSServer = true;
                    }
                    if (didStartHttpServer && didStartWSServer) {
                        resolve();
                    }
                }
            });
            setTimeout(() => {
                reject(new Error('Timed out waiting for 0x-mesh logs'));
            }, 10000); // tslint:disable-line:custom-no-magic-numbers
        });
    });
}
function waitForDependencyStartupAsync(logStream) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const hasSeenLog = [0, 0, 0];
            logStream.stdout.on('data', (chunk) => {
                const data = chunk.toString().split('\n');
                for (const datum of data) {
                    if (hasSeenLog[0] < 1 && /.*mesh.*started HTTP RPC server/.test(datum)) {
                        hasSeenLog[0]++;
                    }
                    else if (hasSeenLog[1] < 1 && /.*mesh.*started WS RPC server/.test(datum)) {
                        hasSeenLog[1]++;
                    }
                    else if (hasSeenLog[2] < 1 &&
                        /.*postgres.*PostgreSQL init process complete; ready for start up./.test(datum)) {
                        hasSeenLog[2]++;
                    }
                    if (hasSeenLog[0] === 1 && hasSeenLog[1] === 1 && hasSeenLog[2] === 1) {
                        resolve();
                    }
                }
            });
            setTimeout(() => {
                reject(new Error('Timed out waiting for dependency logs'));
            }, 30000); // tslint:disable-line:custom-no-magic-numbers
        });
    });
}
function confirmPostgresConnectivityAsync(maxTries = 5) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield Promise.all([
                // delay before retrying
                new Promise(resolve => setTimeout(resolve, 2000)),
                yield db_connection_1.getDBConnectionAsync(),
            ]);
            return;
        }
        catch (e) {
            if (maxTries > 0) {
                yield confirmPostgresConnectivityAsync(maxTries - 1);
            }
            else {
                throw e;
            }
        }
    });
}
function sleepAsync(timeSeconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            const secondsPerMillisecond = 1000;
            setTimeout(resolve, timeSeconds * secondsPerMillisecond);
        });
    });
}
//# sourceMappingURL=deployment.js.map