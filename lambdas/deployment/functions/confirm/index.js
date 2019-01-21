const octokit = require('@octokit/rest')()
const { readFileSync } = require('fs')
const { checkAuth, redirectToAuth, verify } = require('../../utils')

const template = readFileSync('./functions/confirm/ok.html', 'utf8')

module.exports = async ({ queryStringParameters, headers }) => {
  if (queryStringParameters) {
    const {
      owner, repo, deploy, tag, sign,
    } = queryStringParameters
    if (!checkAuth(headers, sign)) {
      return redirectToAuth(queryStringParameters)
    }

    if (owner && repo && deploy && sign && tag) {
      if (verify(owner + repo + deploy + tag, process.env.PUBLIC_KEY, sign)) {
        octokit.authenticate({
          type: 'token',
          token: process.env.GITHUB_TOKEN,
        })

        await octokit.repos.createDeploymentStatus({
          owner,
          repo,
          deployment_id: deploy,
          state: 'in_progress',
          headers: {
            accept: 'application/vnd.github.flash-preview+json',
          },
        })

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
          },
          body: template.replace(
            '__LINK__',
            `https://github.com/${owner}/${repo}/deployments`,
          ),
        }
      }
    }
  }

  return {
    statusCode: 400,
    body: 'Missing params',
  }
}
