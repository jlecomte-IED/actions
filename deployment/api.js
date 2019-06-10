const {
  owner, repo, ref, context, environment, state: deploymentState,
} = require('./tools')

const kit = context.octokit()

const api = {
  
  createDeploymentFromRef: async (add) => {
    if (!['pending', 'in_progress'].includes(deploymentState)) {
      console.error(`invalid "${deploymentState}" deployment status. Should be one of ['pending', 'in_progress'].`)
      process.exit(1)
    }

    const args = {
      owner,
      repo,
      ref,
      environment,
      state: deploymentState,
      ...add,
    }
    console.log('Deployment args', args)
    const { data: deployment } = await kit.repos.createDeployment(args)

    return deployment
  },
  createDeploymentStatus: async (deploy, state) => {
    const { data: stats } = await kit.repos.createDeploymentStatus({
      owner,
      repo,
      deployment_id: deploy,
      state,
      headers: {
        accept: 'application/vnd.github.flash-preview+json',
      },
    })

    return stats
  },
  getReleaseByTag: async (tag) => {
    const { data: release } = await kit.repos.getReleaseByTag({
      owner,
      repo,
      tag,
    })

    return release
  },
  appendToReleaseBody: async (tag, contents, mark = 'DEPLOY') => {
    const release = await api.getReleaseByTag(tag)

    await kit.repos.updateRelease({
      owner,
      repo,
      release_id: release.id,
      body: `${release.body}<!-- ${mark}_BEGIN -->
${contents}
<!-- ${mark}_END -->`,
    })

    return true
  },
}

module.exports = api
