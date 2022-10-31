#!/usr/bin/env node
/* eslint-disable global-require, import/no-dynamic-require */
import * as core from '@actions/core'
import crypto from 'crypto'
import { stringify } from 'querystring'

enum DeployEnv {
  dev = 'dev',
  preprod = 'preprod',
  beta = 'beta',
  prod = 'prod',
}

function generateButton(
  deployId: string,
  deployType: string,
  deployEnv: string,
) {
  if (!(deployEnv in DeployEnv)) {
    console.error(
      'deployEnv variable should be equal to "dev", "preprod" or "prod" ',
    )
    process.exit(1)
  }

  const { PRIVATE_KEY, GITHUB_REPOSITORY, GITHUB_REF } = process.env

  if (!PRIVATE_KEY || !GITHUB_REPOSITORY || !GITHUB_REF) {
    console.error(
      'Environment variable PRIVATE_KEY, GITHUB_REPOSITORY and GITHUB_REF are required.',
    )
    process.exit(1)
  }

  const [owner, repo] = GITHUB_REPOSITORY!.split('/')
  const [, , refName] = GITHUB_REF!.split('/')

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(owner + repo + deployId + refName)

  const query = stringify({
    owner,
    repo,
    deploy: deployId,
    tag: refName,
    sign: sign.sign(PRIVATE_KEY!, 'hex'),
  })

  const url = `https://auto-deploy.inextenso.io/deploy?${query}`

  interface IbuttonStyle {
    name: string
    color: string
  }

  let buttonStyle: IbuttonStyle = { name: 'Production', color: 'orange' }

  switch (deployEnv) {
    case DeployEnv.dev:
      buttonStyle = { name: 'Dev', color: 'blue' }
      break
    case DeployEnv.preprod:
      buttonStyle = { name: 'Preprod', color: 'yellow' }
      break
    case DeployEnv.beta:
        buttonStyle = { name: 'Beta', color: 'purple' }
        break
    case DeployEnv.prod:
      buttonStyle = { name: 'Production', color: 'orange' }
      break
  }
  const title = encodeURI(`Deploy ${deployType} to`.replace(/\s+/g, ' '))

  const img = `https://img.shields.io/badge/${title}-${buttonStyle.name}-${buttonStyle.color}.svg?style=for-the-badge`

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
