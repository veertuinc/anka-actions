"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.Runner = void 0;
const axios = __importStar(require("axios"));
const axios_error_1 = require("./axios-error");
const log_1 = require("./log");
const RUNNERS_PER_PAGE = 100;
class Runner {
    constructor(ghPAT, ghBaseUrl, owner, repo) {
        this.owner = owner;
        this.repo = repo;
        this.client = axios.default.create({
            baseURL: ghBaseUrl,
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `token ${ghPAT}`,
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
    }
    // Shared base path for the repository self-hosted runner endpoints.
    runnersPath() {
        return `/repos/${this.owner}/${this.repo}/actions/runners`;
    }
    getRunnerByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            let page = 1;
            let collected = 0;
            let totalCount = 0;
            do {
                let response;
                try {
                    response = yield this.client.get(this.runnersPath(), { params: { per_page: RUNNERS_PER_PAGE, page } });
                }
                catch (error) {
                    throw (0, axios_error_1.createAxiosError)(error);
                }
                (0, log_1.logDebug)(`listSelfHostedRunners page ${page}: ${JSON.stringify(response.data)}`);
                totalCount = response.data.total_count;
                const { runners } = response.data;
                const found = runners.find(runner => runner.name === name);
                if (found) {
                    return found.id;
                }
                collected += runners.length;
                page++;
                if (runners.length === 0) {
                    break;
                }
            } while (collected < totalCount);
            return null;
        });
    }
    createToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield this.client.post(`${this.runnersPath()}/registration-token`);
                (0, log_1.logDebug)(`createRegistrationToken: ${JSON.stringify(response.data)}`);
                return response.data.token;
            }
            catch (error) {
                throw (0, axios_error_1.createAxiosError)(error);
            }
        });
    }
    delete(runnerId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.client.delete(`${this.runnersPath()}/${runnerId}`);
            }
            catch (error) {
                throw (0, axios_error_1.createAxiosError)(error);
            }
        });
    }
}
exports.Runner = Runner;
