const core = require("@actions/core");

async function accessRemover(githubTools, repositoriesWithDirectAccess) {
  core.info("🪚 Start remove direct access ...");
  repositoriesWithDirectAccess.forEach(async repository => {
    const [, repo] = repository.name.split("/");
    console.log(repository.members)
    if (members.length > 0) {
      for (const member of repository.members) {

        await this.githubTools.removeDirectAccess(repo, member.login);
      }
    } else {
      core.info('No collaborators to remove');
    }


  });

  core.info("✅  Finished remove direct access");

}

module.exports = {
  accessRemover
}