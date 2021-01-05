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
var DeployEnv;
(function (DeployEnv) {
    DeployEnv["dev"] = "dev";
    DeployEnv["preprod"] = "preprod";
    DeployEnv["prod"] = "prod";
})(DeployEnv || (DeployEnv = {}));
function generateButton(deployId, deployType, deployEnv) {
    if (!(deployEnv in DeployEnv)) {
        console.error('deployEnv variable should be equal to "dev", "preprod" or "prod" ');
        process.exit(1);
    }
    const { PRIVATE_KEY, GITHUB_REPOSITORY, GITHUB_REF } = process.env;
    if (!PRIVATE_KEY || !GITHUB_REPOSITORY || !GITHUB_REF) {
        console.error('Environment variable PRIVATE_KEY, GITHUB_REPOSITORY and GITHUB_REF are required.');
        process.exit(1);
    }
    const [owner, repo] = GITHUB_REPOSITORY.split('/');
    const [, , refName] = GITHUB_REF.split('/');
    const sign = crypto_1.default.createSign('RSA-SHA256');
    sign.update(owner + repo + deployId + refName);
    const query = querystring_1.stringify({
        owner,
        repo,
        deploy: deployId,
        tag: refName,
        sign: sign.sign(PRIVATE_KEY, 'hex'),
    });
    const url = `https://auto-deploy.inextenso.io/deploy?${query}`;
    let buttonStyle = { name: 'Production', color: 'orange' };
    switch (deployEnv) {
        case DeployEnv.dev:
            buttonStyle = { name: 'Dev', color: 'blue' };
            break;
        case DeployEnv.preprod:
            buttonStyle = { name: 'Preprod', color: 'yellow' };
            break;
        case DeployEnv.prod:
            buttonStyle = { name: 'Production', color: 'orange' };
            break;
    }
	const title = encodeURI(`Deploy ${deployType} to`.replace(/\s+/g,' '))
    const img = `https://img.shields.io/badge/${title}-${buttonStyle.name}-${buttonStyle.color}.svg?style=for-the-badge`;
    core.setOutput('release-button', `[![Deploy to prod](${img})](${url})`);
    process.stdout.write(`[![Deploy to prod](${img})](${url})`);
}
try {
    const deployId = core.getInput('deploy_id');
    const deployType = core.getInput('deploy_type');
    const deployEnv = core.getInput('deploy_env');
    generateButton(deployId, deployType, deployEnv);
}
catch (err) {
    core.setFailed(err);
    process.exit(1);
}
