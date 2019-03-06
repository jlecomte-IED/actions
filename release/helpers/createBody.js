module.exports = ({ status, published_at, created_at, body }) =>
  new Buffer(
    `
---
status: ${status}
date: ${published_at || created_at}
---
${body}
`,
    "binary"
  );
