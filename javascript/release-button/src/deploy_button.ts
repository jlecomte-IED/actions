#!/usr/bin/env node
/* eslint-disable global-require, import/no-dynamic-require */
import * as core from '@actions/core'
import crypto from 'crypto'
import { stringify } from 'querystring'

function generateButton(deployId: string) {
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

  const query = stringify({
    owner,
    repo,
    deploy: deployId,
    tag: refName,
    sign: sign.sign(PRIVATE_KEY, 'hex'),
  })

  const url = `https://auto-deploy.inextenso.io/deploy?${query}`
  const img =
    'https://img.shields.io/badge/Deploy%20to-Production-orange.svg?style=for-the-badge'

  core.setOutput('release-button', `[![Deploy to prod](${img})](${url})`)
  process.stdout.write(`[![Deploy to prod](${img})](${url})`)
}
try {
  const deployId = core.getInput('deploy_id', { required: true })
  generateButton(deployId)
} catch (err) {
  core.setFailed(err)
  process.exit(1)
}
