const { context } = require('./tools')
const api = require('./api')

module.exports = async () => {
  const event = await context.readEvent()
  console.info(event)
  if (event.deployment) {
    const response = await api.createDeploymentStatus(event.deployment.id, process.argv[3])
    process.exit(0)
  }

  const deploymentEvent = await context.readJSON('deployment')
  console.info(deploymentEvent)
  if (deploymentEvent.deployment) {
    const response = await api.createDeploymentStatus(deploymentEvent.deployment.id, process.argv[3])
  }
}
