const core = require("@actions/core");

class Analyser{
  constructor (normalizedResult){
    this.normalizedResult = normalizedResult;
    this.analysisResults = new Object();
  }

  async startAnalysis(){  
    this.analysisResults.membersWithNoName = this.getMembersWithNameNotDefined();
  }
  
  getMembersWithNameNotDefined() {
    
    let membersWithNoName = [];

    this.normalizedResult.forEach(team => {
      team.members.forEach(member =>{
        if(!member.name && !membersWithNoName.includes(member.login)){
          membersWithNoName.push(member.login);
        }
      })
    });
    
    return membersWithNoName;
  }

}


module.exports = Analyser