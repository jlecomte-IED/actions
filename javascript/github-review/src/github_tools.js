const artifact = require("@actions/artifact");
const core = require("@actions/core");
const csvToMarkdown = require("csv-to-markdown-table");
const github = require("@actions/github");
const dateFormat = require("date-fns");
const { graphql } = require("@octokit/graphql");

const {
  orgTeamsAndReposAndMembersQuery,
  orgSearchAndCountQuery,
  orgListRepoIssueQuery,
} = require("./queries");

const ERROR_MESSAGE_TOKEN_UNAUTHORIZED =
  "Resource protected by organization SAML enforcement. You must grant your personal token access to this organization.";

class GithubTools {

  constructor(token, organization, options) {
    this.options = options
    this.organization = organization;
    const [owner, repo] = options.repository.split("/");
    this.owner = owner;
    this.repo = repo;
    this.issue_number = null;
    this.result = null;
    this.initiateOctokit(token);
    this.initiateGraphQLClient(token);
  }

  initiateOctokit(token) {
    this.octokit = new github.GitHub(token);
  }

  initiateGraphQLClient(token) {
    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${token}`
      }
    });
  }

  /****************************** 
   *  GraphQL Requests Methods  *
  *******************************/
  async requestOrgTeamsAndReposAndMembers(
    organization,
    teamsCursor = null,
    repositoriesCursor = null,
    membersCursor = null
  ) {
    const { organization: data } = await this.graphqlClient(
      orgTeamsAndReposAndMembersQuery,
      {
        organization,
        teamsCursor,
        repositoriesCursor,
        membersCursor
      }
    );

    return data;
  }

  async requestOrgPullRequest(
    organization,
    isClosed,
    creationPeriod
  ) {
    let queryBody = `org:${organization} is:pr archived:false created:${creationPeriod}`;
    if (isClosed != null) {
      queryBody = queryBody + " " + isClosed;
    }
    console.log(queryBody);
    const data = await this.graphqlClient(
      orgSearchAndCountQuery, {
      q: queryBody
    }
    );
    console.log(data);

    return data;
  }

  async searchAndCountIssue(organization, query) {
    let data;
    try {
      data = await this.graphqlClient(
        orgSearchAndCountQuery,
        {
          q: query
        }
      );

    } catch (error) {
      core.info(error.message);
      if (error.message === ERROR_MESSAGE_TOKEN_UNAUTHORIZED) {
        core.info(
          `⏸  The token you use isn't authorized to be used with ${organization}`
        );
        return null;
      }
    } finally {
      if (!data) {
        core.info(
          `⏸  No data found for ${organization}, probably you don't have the right permission`
        );
        return;
      }
      return data.search.issueCount;
    }
  }

  async requestOrgListRepoIssues(
    organization,
    repo,
    issuesCursor = null,
    states
  ) {
    const { organization: data } = await this.graphqlClient(
      orgListRepoIssueQuery,
      {
        organization,
        repo,
        issuesCursor,
        states
      }
    );
    return data;
  }

  async requestProjectListCards(
    organization,
    repo,
    column_id
  ) {

  }

  /****************************** 
   *       Utils Methods        *
  *******************************/
  async createIssue(body, issueTitle) {
    const { data: issue_response } = await this.octokit.issues.create({
      owner: this.owner,
      repo: this.repo,
      title: `[Github-Actions] ${dateFormat.format(new Date(), 'MM/yyyy')} ${issueTitle}`,
      body: body,
      labels: this.options.labels,
      assignees: this.options.assignees
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
      labels: ["check"],
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

      await this.createIssue(body, reviewIssueTitle);
    }
  }

  async getIssue(issue_number) {
    const { data: issue } = await this.octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number,
    });

    return issue;
  }

  async getProjectId(project_name) {
    let projectId;

    const { data: projects } = await this.octokit.projects.listForRepo({
      owner: this.owner,
      repo: this.repo
    });

    projects.forEach(project => {
      if (project.name == project_name) {
        projectId = project.id
      }
    });

    return projectId;
  }

  async listProjectColumns(project_id) {

    const { data: projectColumns } = await this.octokit.projects.listColumns({
      project_id,
    });

    return projectColumns;
  }

  async getColumnId(column_name, columns) {
    let column_id;

    columns.forEach(col => {
      if (col.name == column_name) {
        column_id = col.id;
      }
    });

    return column_id;
  }

  async getColumn(column_id) {
    const { data: column } = await this.octokit.projects.getColumn({
      column_id,
    });

    return column;
  }

  async listCards(column_id) {
    const result = await this.octokit.paginate('GET /projects/columns/{column_id}/cards',
      {
        column_id
      });

    return result;
  }

  /*
    Count Issue in Kanban project.
    If state param is not defined, opened and closed issue will be counted 
    If creation param is not defined, issue will be counted regardless of the date of creation.
  */
  async countIssuesInColumn(project_name, column_name, state, ...labels) {
    let issue_counter = 0;

    var projectISMSId = await this.getProjectId(project_name);
    var columns = await this.listProjectColumns(projectISMSId);
    var column_id = await this.getColumnId(column_name, columns);
    var cards = await this.listCards(column_id);

    for (var card of cards) {
      var issue = await this.getIssue(card.content_url.split('/').pop());
      if (state != null) {
        if (labels != null) {
          var issueLabels = []
          issue.labels.forEach(label => {
            issueLabels.push(label.name);
          });

          if (labels.every(i => issueLabels.includes(i))) issue_counter++;
        } else {
          issue_counter++;
        }
      } else {
        issue_counter++;
      }
    }
    return issue_counter;
  }

  async listRepoIssues(state) {
    const result = await this.octokit.paginate('GET /repos/{owner}/{repo}/issues',
      {
        owner: this.organization,
        repo: this.repo,
        state,
      });
    return result;
  }

}
module.exports = GithubTools;


