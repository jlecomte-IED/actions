const crypto = require("crypto");
const { stringify } = require("querystring");
const { parse } = require("cookie");

const checkAuth = (headers, message) => {
  if (headers["Cookie"]) {
    const { sign } = parse(headers["Cookie"]);

    return verify(message, process.env.PUBLIC_KEY, sign);
  }

  return false;
};

const redirectToAuth = queries => {
  return {
    statusCode: 302,
    headers: {
      Location: `https://github.com/login/oauth/authorize?${stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: "https://auto-deploy.inextenso.io/authorize",
        state: encodeURIComponent(JSON.stringify(queries)),
        scope: "read:org"
      })}`
    },
    body: ""
  };
};

const verify = (message, key, sign) => {
  const verify = crypto.createVerify("SHA256");
  verify.update(message);
  return verify.verify(key, sign, "hex");
};

const sign = (message, key) => {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(message);
  return sign.sign(key, "hex");
};

module.exports = {
  checkAuth,
  redirectToAuth,
  verify,
  sign
};
