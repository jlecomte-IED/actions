const { stringify: query } = require('querystring')
const { serialize: cookie } = require('cookie')
const octokit = require('@octokit/rest')()
const { sign } = require('../../utils')
const { getToken } = require('./auth')

module.exports = async ({ queryStringParameters }) => {
  const { state, code } = queryStringParameters

  const token = await getToken({ code, state })

  octokit.authenticate({
    type: 'token',
    token,
  })

  try {
    // 1. get username
    const {
      data: { login },
    } = await octokit.users.getAuthenticated({})

    // 2. find ied teams
    const { data: teams } = await octokit.teams.list({
      org: 'inextensodigital',
      headers: {
        Accept: 'application/vnd.github.hellcat-preview+json',
      },
    })

    // 3. select authorized team id
    const { id } = teams.find(t => t.name === process.env.AUTHORIZED_TEAM)

    // 4. check membership of user in authorized team
    const { status } = await octokit.teams.getMembership({
      team_id: id,
      username: login,
    })

    if (status === 200) {
      const normalizedState = JSON.parse(decodeURIComponent(state))
      // create cookie & redirect to confirm
      return {
        statusCode: 302,
        body: JSON.stringify({
          id,
          login,
          status,
          state: normalizedState,
        }),
        headers: {
          'Set-Cookie': cookie(
            'sign',
            sign(normalizedState.sign, process.env.PRIVATE_KEY),
            {
              httpOnly: true,
              secure: true,
              maxAge: 60, // seconds
            },
          ),
          Location: `/deploy?${query(normalizedState)}`,
        },
      }
    }
  } catch (error) {
    console.error(error)
  }

  return {
    statusCode: 403,
    body: 'pas bien !',
  }
}
