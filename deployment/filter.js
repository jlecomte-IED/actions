const { context } = require('./tools')

module.exports = async () => {
  const type = process.argv[3]
  const value = process.argv[4]
  let pass = false

  const event = await context.readEvent()

  switch (type) {
    case 'deployment_status':
      const current_state = event.deployment_status.state
      if (current_state) {
        pass = current_state === value
      }
      console.info(`${current_state} === ${value} ?`, pass ? 'yes' : 'no')
      break
    default:
      console.error(`Filter ${type} not exists`)
      break
  }

  process.exit(pass ? 0 : 78)
}
