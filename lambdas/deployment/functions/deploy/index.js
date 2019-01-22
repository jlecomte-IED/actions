const { readFileSync } = require('fs')
const { stringify } = require('querystring')
const { checkAuth, redirectToAuth } = require('../../utils')

const template = readFileSync('./functions/deploy/confirm.html', 'utf8')

module.exports = async ({
  queryStringParameters,
  requestContext: { domainName, path },
  headers,
}) => {
  if (!checkAuth(headers, queryStringParameters.sign)) {
    return redirectToAuth(queryStringParameters)
  }

  const url = `https://${domainName}${path.replace(
    'deploy',
    'confirm',
  )}?${stringify(queryStringParameters)}`

  const backUrl = `https://github.com/${queryStringParameters.owner}/${
    queryStringParameters.repo
  }/releases/tag/${queryStringParameters.tag}`

  const appName = `${queryStringParameters.owner}/${
    queryStringParameters.repo
  }:${queryStringParameters.tag}`

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: template
      .replace('__LINK__', url)
      .replace('__BACK_LINK__', backUrl)
      .replace('__APP__', appName),
  }
}
