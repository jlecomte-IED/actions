const {
  owner, repo, ref, context, stage,
} = require('./tools')

const kit = context.octokit()

const api = {
  
  createDeploymentFromRef: async (add) => {
    const args = {
      owner,
      repo,
      ref,
      environment: stage,
      ...add,
    }
    console.info('createDeploymentFromRef args:\n', args, '\n')
    const { data: deployment } = await kit.repos.createDeployment(args)

    return deployment
  },
  createDeploymentStatus: async (deploy, state) => {
    const args = {
      owner,
      repo,
      deployment_id: deploy,
      state,
      headers: {
        accept: 'application/vnd.github.flash-preview+json',
      },
    }
    console.info('createDeploymentStatus args:\n', args, '\n')
    const { data: stats } = await kit.repos.createDeploymentStatus(args)

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
