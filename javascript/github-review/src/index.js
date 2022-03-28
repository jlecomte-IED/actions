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
      issueTitle: core.getInput("issueTitle") || DEFAULT_ISSUE_TITLE,
      labels: core.getInput("labels").split(",") || DEFAULT_ISSUE_LABELS,
      assignees: core.getInput("assignees").split(",") || [""]
    }).startOrgReview();
  } else if (reviewType == "indicators") {
    await new IndicatorsCollector(token, organization, {
      repository: process.env.GITHUB_REPOSITORY,
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