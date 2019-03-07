module.exports = ({ header, body }) => new Buffer(`${header} ${body}`, 'binary')
