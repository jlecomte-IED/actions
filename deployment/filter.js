const { context } = require('./tools')

module.exports = async () => {
  const type = process.argv[3]
  const value = process.argv[4]
  let pass = false

  const event = await context.readEvent()

  switch (type) {
    case 'deployment_status':
      if (event.deployment_status) {
        pass = event.deployment_status.state === value
      }
      break
    default:
      console.error(`Filter ${type} not exists`)
      break
  }

  process.exit(pass ? 0 : 78)
}
