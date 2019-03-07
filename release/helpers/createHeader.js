module.exports = ({ status, published_at, created_at, tag_name }) =>
  `
---
status: ${status}
date: ${published_at || created_at}
tag: ${tag_name}
---
`
