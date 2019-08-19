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

  process.stdout.write(`[![Deploy to prod](${img})](${url})`)
}

const action = core.getInput('action', { required: true })

switch (action) {
  case 'generate-button':
    const deployId = core.getInput('deploy-id', { required: true })
    generateButton(deployId)
    break

  default:
    process.exit(1)
}
