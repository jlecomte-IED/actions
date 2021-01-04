#!/usr/bin/env node
/* eslint-disable global-require, import/no-dynamic-require */
import * as core from '@actions/core'
import crypto from 'crypto'
import { stringify } from 'querystring'

enum deployType {
  code = 'code',
  model = 'model',
}

enum deployEnv {
  dev = 'dev',
  preprod = 'preprod',
  prod = 'prod',
}

function generateButton(
  deployId: string,
  deploy_type: deployType,
  deploy_env: deployEnv,
) {
  const { PRIVATE_KEY, GITHUB_REPOSITORY, GITHUB_REF } = process.env

  if (!PRIVATE_KEY || !GITHUB_REPOSITORY || !GITHUB_REF) {
    console.error(
      'Environment variable PRIVATE_KEY, GITHUB_REPOSITORY and GITHUB_REF are required.',
    )
    process.exit(1)
    return
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/')
  const [, , refName] = GITHUB_REF.split('/')

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(owner + repo + deployId + refName)

  const query = stringify({
    owner,
    repo,
    deploy: deployId,
    tag: refName,
    sign: sign.sign(PRIVATE_KEY, 'hex'),
  })

  const url = `https://auto-deploy.inextenso.io/deploy?${query}`

  const button = {
    dev: { name: 'Dev', color: 'blue' },
    preprod: { name: 'Preprod', color: 'yellow' },
    prod: { name: 'Production', color: 'orange' },
  }

  const img = `https://img.shields.io/badge/Deploy${
    deploy_type === 'model' ? '%20model' : ''
  }%20to-${button[deploy_env]['name']}-${
    button[deploy_env]['color']
  }.svg?style=for-the-badge`

  core.setOutput('release-button', `[![Deploy to prod](${img})](${url})`)
  process.stdout.write(`[![Deploy to prod](${img})](${url})`)
}

try {
  const deployId = core.getInput('deploy_id')
  const deployType = core.getInput('deploy_type')
  const deployEnv = core.getInput('deploy_env')
  generateButton(deployId, deployType, deployEnv)
} catch (err) {
  core.setFailed(err)
  process.exit(1)
}
