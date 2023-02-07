const core = require("@actions/core");

async function accessRemover(githubTools, repositoriesWithDirectAccess, excludeMembers) {
  core.info("🪚 Start remove direct access ...");
  if (repositoriesWithDirectAccess){
  repositoriesWithDirectAccess.forEach(async repository => {
    const [, repo] = repository.name.split("/");
    if (repository.members.length > 0) {
      for (const member of repository.members) {
        if(!excludeMembers.includes(member.login)) await githubTools.removeDirectAccess(repo, member.login);
      }
    } else {
      core.info('No collaborators to remove');
    }
  });  
  } else {
    core.info('No collaborators to remove');
  }
  core.info("✅  Finished remove direct access");
}

module.exports = {
  accessRemover
}