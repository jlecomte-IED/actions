const core = require("@actions/core");
const OrgDataCollector = require("./data_collector.js");

const DEFAULT_ISSUE_TITLE = "Github Organization Review";

const main = async () => {
  const token = core.getInput("token") || process.env.TOKEN;
  const organization =
    core.getInput("organization") || process.env.ORGANIZATION;
  const Collector = new OrgDataCollector(token, organization, {
    repository: process.env.GITHUB_REPOSITORY,
    postToIssue: core.getInput("postToIssue") || process.env.ISSUE,
    issueTitle: core.getInput("issueTitle") || DEFAULT_ISSUE_TITLE,
    labels: core.getInput("labels") || "",
    assignees: core.getInput("assignees") || ""
  });

  await Collector.startOrgReview();
};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}