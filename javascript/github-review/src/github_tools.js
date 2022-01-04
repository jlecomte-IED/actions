const artifact = require("@actions/artifact");
const core = require("@actions/core");
const csvToMarkdown = require("csv-to-markdown-table");
const github = require("@actions/github");
const dateFormat = require("date-fns");

class GithubTools {

  constructor(token, organization, options) {
    this.options = options
    this.organization = organization;
    const [owner, repo] = options.repository.split("/");
    this.owner = owner;
    this.repo = repo;
    this.issue_number = null;
    this.initiateOctokit(token);
  }

  initiateOctokit(token) {
    this.octokit = new github.GitHub(token);
  }

  async createIssue(body, issueTitle) {
    const { data: issue_response } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: `[Github-Actions] ${dateFormat.format(new Date(), 'MM/yyyy')} ${issueTitle}`,
      body: body,
      labels: this.options.labels,
      assignee: this.options.assignee
    });
    this.issue_number = issue_response.number;
    core.info(`Issue #${this.issue_number} in ${this.options.repository} has been created`);
  }

  async postCommentToIssue(body) {
    core.info(`Posting Comment ...`);
    await this.octokit.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.issue_number,
      body
    });
  }

  async closeIssue(issue_number) {
    await this.octokit.issues.update({
      owner: this.owner,
      repo: this.repo,
      issue_number: this.issue_number,
      state: "closed"
    });
  }

  async createandUploadArtifacts(files) {
    if (!process.env.GITHUB_RUN_NUMBER) {
      return core.debug("not running in actions, skipping artifact upload");
    }

    const artifactClient = artifact.create();
    const artifactName = `github-review-${dateFormat.format(new Date(), 'yyyy-MM-dd')}`;
    const rootDirectory = "./";
    const options = { continueOnError: true };

    const uploadResult = await artifactClient.uploadArtifact(
      artifactName,
      files,
      rootDirectory,
      options
    );
    return uploadResult;
  }

  async findReviewIssue() {

    core.info("Finding review issue...");
    let reviewIssueTitle = "Revue des accès Github";

    const { data: issueList } = await this.octokit.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      labels: "check",
      state: "open"
    });

    issueList.forEach(issue => {
      if (issue.title.includes(`${dateFormat.format(new Date(), 'MM/yyyy')} ${reviewIssueTitle}`)) {
        core.info(`✅ ${issue.title} Found`)
        this.issue_number = issue.number;
      }
    });

    if (!this.issue_number) {
      core.info(`Issue not found. Creating issue ...`);
      let body =
        "### Description\n" +
        "\n" +
        "Conformément au :\n" +
        "\n" +
        "- **[Programme d'audits/revues]()**\n" +
        "- [Calendrier]()\n" +
        "\n" +
        "### Ressources documentaires à mettre à jour\n" +
        "\n" +
        "ℹ️ Se reporter au **[wiki correspondant]()**\n" +
        "\n" +
        "- [Liste des accès github]()\n";

      this.createIssue(body, reviewIssueTitle);
    }
  }
}

module.exports = GithubTools;


