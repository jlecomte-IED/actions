const core = require("@actions/core");
const OrgDataCollector = require("./data_collector.js");
const IndicatorsCollector = require("./indicators_collector.js");

const DEFAULT_ISSUE_TITLE = "Github Organization Review";
const DEFAULT_ISSUE_LABELS = ["check"]

const main = async () => {
  const token = core.getInput("token") || process.env.TOKEN;
  const organization =
    core.getInput("organization") || process.env.ORGANIZATION;
  const reviewType = core.getInput("review") || process.env.REVIEW

  if (reviewType == "members") {
    await new OrgDataCollector(token, organization, {
      repository: process.env.GITHUB_REPOSITORY,
      postToIssue: core.getInput("postToIssue") || process.env.ISSUE,
      exportAnalysis: core.getInput("exportAnalysis") || process.env.EXPORT_ANALYSIS,
      directAccessDeletion: core.getInput('directAccessDeletion') || process.env.DIRECT_ACCESS,
      directAccessExcludeMembers: core.getInput('directAccessExcludeMembers') || process.env.DIRECT_ACCESS_EXCLUDE_MEMBERS,
      issueTitle: core.getInput("issueTitle") || DEFAULT_ISSUE_TITLE,
      labels: core.getInput("labels").split(",") || DEFAULT_ISSUE_LABELS,
      assignees: core.getInput("assignees").split(",") || [""]
    }).startOrgReview();
  } else if (reviewType == "indicators") {
    await new IndicatorsCollector(token, organization, {
      repository: process.env.GITHUB_REPOSITORY,
      projectV2Number: parseInt(core.getInput("projectV2Number")) || parseInt(process.env.PROJECTV2_NUMBER)
    }).startIndicatorsReview();
  } else {
    core.info('review is not set in workflow');
  }
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}