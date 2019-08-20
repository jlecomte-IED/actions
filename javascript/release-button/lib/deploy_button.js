#!/usr/bin/env node
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable global-require, import/no-dynamic-require */
const core = __importStar(require("@actions/core"));
const crypto_1 = __importDefault(require("crypto"));
const querystring_1 = require("querystring");
function generateButton(deployId) {
    const { PRIVATE_KEY, GITHUB_REPOSITORY, GITHUB_REF } = process.env;
    if (!PRIVATE_KEY || !GITHUB_REPOSITORY || !GITHUB_REF) {
        console.error('Environment variable PRIVATE_KEY, GITHUB_REPOSITORY and GITHUB_REF are required.');
        process.exit(1);
        return;
    }
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const [, , refName] = GITHUB_REF.split('/');
    const sign = crypto_1.default.createSign('RSA-SHA256');
    const query = querystring_1.stringify({
        owner,
        repo,
        deploy: deployId,
        tag: refName,
        sign: sign.sign(PRIVATE_KEY, 'hex'),
    });
    const url = `https://auto-deploy.inextenso.io/deploy?${query}`;
    const img = 'https://img.shields.io/badge/Deploy%20to-Production-orange.svg?style=for-the-badge';
    core.setOutput('release-button', `[![Deploy to prod](${img})](${url})`);
    process.stdout.write(`[![Deploy to prod](${img})](${url})`);
}
const actionName = core.getInput('action', { required: true });
const actions = new Map();
actions.set('generate-button', () => {
    const deployId = core.getInput('deploy-id', { required: true });
    generateButton(deployId);
});
const action = actions.get(actionName);
if (action === undefined) {
    let availableActions = Array.from(actions.keys()).reduce((prev, curr) => {
        return prev === '' ? curr : `${prev}, ${curr}`;
    }, '');
    core.setFailed(`Unknown action ${actionName}. Please give one of these actions: ${availableActions}}`);
    process.exit(1);
}
else {
    try {
        action();
    }
    catch (err) {
        core.setFailed(err);
        process.exit(1);
    }
}
