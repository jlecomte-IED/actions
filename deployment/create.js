const crypto = require('crypto')
const { stringify } = require('querystring')
const fs = require('fs')

const {
  owner, repo, ref, refName, context,
} = require('./tools')
const api = require('./api')

const stage = process.env.STAGE || 'production'
const deploymentState = process.env.DEPLOY_STATUS || 'pending'

if (!['pending', 'in_progress'].includes(deploymentState)) {
  console.error(`invalid "${deploymentState}" deployment status. Should be one of ['pending', 'in_progress'].`)
  process.exit(1)
}

module.exports = async () => {
  const deploy = await api.createDeploymentFromRef({
    auto_merge: false,
    required_contexts: [],
    payload: JSON.stringify({
      ref,
      tag: refName,
    }),
    description: `${stage} deploy for tag ${refName}`,
  })

  await context.writeJSON('deployment', deploy)

  if (stage !== 'production' && deploymentState === 'pending') {
    process.exit(0)
  }

  await api.createDeploymentStatus(deploy.id, deploymentState)

  if (stage !== 'production') {
    const slackMessage = {
      type: 'mrkdwn',
      text: '**${owner}/${repo}:${refName} has been successfully deployed to `${stage}`. <https://github.com/${owner}/${repo}/commits/${refName}|see last changes>',
    }
    console.info('Preparing slack message:\n', slackMessage, '\n')
    await context.slackMessage(slackMessage)
  
    console.info(
      'Written slack message:\n',
      fs.readFileSync('./slack.json', 'utf8'),
      '\n'
    );
    process.exit(0)
  }

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(owner + repo + deploy.id + refName)

  const query = stringify({
    owner,
    repo,
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

  await context.slackMessage({
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
