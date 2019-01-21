const fetch = require('node-fetch')

const getToken = async ({ code, state }) => {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'post',
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      state,
    }),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  })

  const { access_token: token } = await response.json()

  return token
}

module.exports = {
  getToken,
}
