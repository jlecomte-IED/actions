const { readFileSync } = require('fs')
const { stringify } = require('querystring')
const { checkAuth, redirectToAuth } = require('../../utils')

const template = readFileSync('./functions/deploy/confirm.html', 'utf8')

module.exports = ({
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

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: template
      .replace('__LINK__', url)
      .replace(
        '__BACK_LINK__',
        `https://github.com/${queryStringParameters.owner}/${
          queryStringParameters.repo
        }/releases/tag/${queryStringParameters.tag}`,
      )
      .replace(
        '__APP__',
        `${queryStringParameters.owner}/${queryStringParameters.repo}:${
          queryStringParameters.tag
        }`,
      ),
  }
}
