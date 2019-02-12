const crypto = require('crypto')
const { stringify } = require('querystring')
const { parse } = require('cookie')

const verify = (message, key, sign) => {
  const verifier = crypto.createVerify('SHA256')
  verifier.update(message)
  return verifier.verify(key, sign, 'hex')
}

const sign = (message, key) => {
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(message)
  return signer.sign(key, 'hex')
}

const checkAuth = (headers, message) => {
  if (headers && headers.Cookie) {
    try {
      const { sign: cookieSign } = parse(headers.Cookie)

      if (!cookieSign) {
        return false
      }

      return verify(message, process.env.PUBLIC_KEY, cookieSign)
    } catch (e) {
      console.error('unable to parse cookie & verify', parse(headers.Cookie), e)
      return false
    }
  }

  return false
}

const redirectToAuth = queries => ({
  statusCode: 302,
  headers: {
    Location: `https://github.com/login/oauth/authorize?${stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: 'https://auto-deploy.inextenso.io/authorize',
      state: encodeURIComponent(JSON.stringify(queries)),
      scope: 'read:org',
    })}`,
  },
  body: '',
})

module.exports = {
  checkAuth,
  redirectToAuth,
  verify,
  sign,
}
