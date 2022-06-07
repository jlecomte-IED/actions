const core = require("@actions/core");

class Analyser {
  constructor(githubTools, normalizedResult) {
    this.normalizedResult = normalizedResult;
    this.githubTools = githubTools;
    this.analysisResults = new Object();
  }

  async startAnalysis() {
    core.info(`🔍 Starting Analysis...`);
    this.analysisResults.membersWithNoName = this.getMembersWithNameNotDefined();
    this.analysisResults.membersWithDirectAccess = await this.getMembersWithDirectAccess();
    core.info(`✅ Finished Analysis...`);
  }

  getMembersWithNameNotDefined() {
    core.info(`🔍 Search for members without name...`);
    let membersWithNoName = [];

    this.normalizedResult.forEach(team => {
      team.members.forEach(member => {
        if (!member.name && !membersWithNoName.includes(member.login)) {
          membersWithNoName.push(member.login);
        }
      })
    });

    core.info(`✅ Finished Search for members without name.`);
    return membersWithNoName;
  }

  async getMembersWithDirectAccess() {
    core.info(`🔍 Search for members with direct access...`);
    let repositories = [];
    let membersWithDirectAccess = [];

    // List all repos
    this.normalizedResult.forEach(team => {
      team.repositories.forEach(repo => {
        const [owner, r] = repo.split("/");
        if (!repositories.includes(r)) {
          repositories.push(r);
        }
      })
    });

    core.info(`Total repositories analysed: ${repositories.length}`);

    for (const repo of repositories) {
      let members = [];
      try {
        members = await this.githubTools.listRepoCollaborators(repo, "direct")
      } catch (error) {
        core.info(`${repo} = ${error.message}`);
      }
      finally{
        if(members.length > 0){
          membersWithDirectAccess.push({
            name: repo,
            members 
          });
        }
        
      }
    }
    core.info(`✅ Finished Search for members with direct access.`);
    return membersWithDirectAccess;
  }
}

module.exports = Analyser