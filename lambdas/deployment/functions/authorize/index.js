const { stringify } = require("querystring");
const fetch = require("node-fetch");
const octokit = require("@octokit/rest")();
const { sign } = require("../../utils");
const { getToken } = require("./auth");

module.exports = async (
  { queryStringParameters, headers },
  context,
  callback
) => {
  const { state, code } = queryStringParameters;

  const token = await getToken({ code, state });

  octokit.authenticate({
    type: "token",
    token
  });

  try {
    //1. get username
    const {
      data: { login }
    } = await octokit.users.getAuthenticated({});

    //2. find ied teams
    const { data: teams } = await octokit.teams.list({
      org: "inextensodigital",
      headers: {
        Accept: "application/vnd.github.hellcat-preview+json"
      }
    });

    //3. select authorized team id
    const id = teams.find(t => t.name === process.env.AUTHORIZED_TEAM).id;

    //4. check membership of user in authorized team
    const { status } = await octokit.teams.getMembership({
      team_id: id,
      username: login
    });

    if (status === 200) {
      const normalizedState = JSON.parse(decodeURIComponent(state));
      // create cookie & redirect to confirm
      callback(null, {
        statusCode: 302,
        body: JSON.stringify({
          id,
          login,
          status,
          state: normalizedState
        }),
        headers: {
          "Set-Cookie": `sign=${sign(
            normalizedState.sign,
            process.env.PRIVATE_KEY
          )}; Max-Age=60; Secure; HttpOnly`,
          Location: `/deploy?${stringify(normalizedState)}`
        }
      });
      return;
    }
  } catch (error) {
    console.error(error);
  }

  callback(null, {
    statusCode: 403,
    body: "pas bien !"
  });
};
