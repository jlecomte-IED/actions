const { readFileSync } = require('fs')
const { stringify } = require('querystring')
const { checkAuth, redirectToAuth } = require('../../utils')

const template = readFileSync('./functions/deploy/confirm.html', 'utf8')

module.exports = (
  { queryStringParameters, requestContext: { domainName, path }, headers },
  context,
  callback,
) => {
  if (!checkAuth(headers, queryStringParameters.sign)) {
    callback(null, redirectToAuth(queryStringParameters))
    return
  }

  const url = `https://${domainName}${path.replace(
    'deploy',
    'confirm',
  )}?${stringify(queryStringParameters)}`

  callback(null, {
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
  })
}
