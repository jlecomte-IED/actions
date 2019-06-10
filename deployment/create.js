const crypto = require('crypto')
const { stringify } = require('querystring')

const {
  owner, repo, ref, refName, context,
} = require('./tools')
const api = require('./api')

const environment = process.env.DEPLOY_ENVIRONMENT || 'production'
const state = process.env.DEPLOY_STATUS || 'pending'
if (!['pending', 'in_progress'].includes(state)) {
  console.error(`invalid "${state}" deployment status. Should be one of ['pending', 'in_progress'].`)
  process.exit(1)
}

module.exports = async () => {
  const deploymentArgs = {
    auto_merge: false,
    required_contexts: [],
    payload: JSON.stringify({
      ref,
      tag: refName,
    }),
    description: `${environment} deploy for tag ${refName}`,
  }
  console.log('Deployment args', deploymentArgs)
  const deploy = await api.createDeploymentFromRef(deploymentArgs)

  await context.writeJSON('deployment', deploy)

  if (environment !== 'production') {
    process.exit(0)
  }

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(owner + repo + deploy.id + refName)



  const query = stringify({
    owner,
    repo,
    state,
    deploy: deploy.id,
    tag: refName,
    sign: sign.sign(process.env.PRIVATE_KEY, 'hex'),
  })

  const url = `https://auto-deploy.inextenso.io/deploy?${query}`

  const img = 'https://img.shields.io/badge/Deploy%20to-Production-orange.svg?style=for-the-badge'

  await api.appendToReleaseBody(
    refName,
    `## Deploy to production :rocket:

[![Deploy to prod](${img})](${url})`,
  )

  context.slackMessage({
    text: `[${owner}/${repo}:${refName}] Your release is ready to deploy!`,
    attachments: [
      {
        actions: [
          {
            type: 'button',
            text: 'Release 🚀',
            url: `https://github.com/${owner}/${repo}/releases/tag/${refName}`,
            style: 'danger',
          },
        ],
      },
    ],
  })
}
