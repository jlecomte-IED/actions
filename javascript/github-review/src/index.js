const core = require("@actions/core");
const artifact = require("@actions/artifact");
const github = require("@actions/github");
const { graphql } = require("@octokit/graphql");
const csvToMarkdown = require("csv-to-markdown-table");
const fs = require("fs");
const { promisify, format } = require("util");
const dateFormat = require("date-fns");

const { JSONtoCSV } = require("./utils");
const {
  orgTeamsAndReposAndMembersQuery,
  orgPullRequestQuery,
} = require("./queries");
const { is } = require("date-fns/locale");

const writeFileAsync = promisify(fs.writeFile);

const DEFAULT_ISSUE_TITLE = "Github Organization Review";
const ARTIFACT_FILE_NAME = "review-data";
const DATA_FOLDER = "./data"

const ERROR_MESSAGE_TOKEN_UNAUTHORIZED =
  "Resource protected by organization SAML enforcement. You must grant your personal token access to this organization.";

!fs.existsSync(DATA_FOLDER) && fs.mkdirSync(DATA_FOLDER);

class CollectOrgData {
  constructor(token, organization, options) {
    this.validateInput(organization, token);

    this.organizations = [{ login: organization }];
    this.options = options
    this.result = {};
    this.orgNormalizedData = [];
    this.pullRequestData = [];
    this.lastTrackedTeam = null;

    this.initiateGraphQLClient(token);
    this.initiateOctokit(token);
  }

  validateInput(organization, token) {
    if (!organization || !token) {
      core.setFailed(
        "The organization or token parameter are not defined."
      );
      process.exit();
    }
  }

  async createandUploadArtifacts(files) {
    if (!process.env.GITHUB_RUN_NUMBER) {
      return core.debug("not running in actions, skipping artifact upload");
    }

    const artifactClient = artifact.create();
    const artifactName = `review-report-${new Date().getTime()}`;
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

  initiateGraphQLClient(token) {
    this.graphqlClient = graphql.defaults({
      headers: {
        authorization: `token ${token}`
      }
    });
  }

  initiateOctokit(token) {
    this.octokit = new github.GitHub(token);
  }

  async createIssue(body) {
    core.info(`Creating Issue ...`);
    const [owner, repo] = this.options.repository.split("/");
    const { data: issue_response } = await this.octokit.issues.create({
      owner,
      repo,
      title: `[Github-Actions] ${dateFormat.format(new Date(), 'MM/yyyy')} ${this.options.issueTitle}`,
      body: body
    });

    let issue_param;

    issue_param.push({
      owner: owner,
      repo: repo,
      issue_number: issue_response.number,
    });

    return issue_param;
  }

  async postCommentToIssue(owner, repo, issue_number, body) {
    core.info(`Posting Comment ...`);
    await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number,
      body
    });
  }

  async closeIssue(owner, repo, issue_number) {
    await this.octokit.issues.update({
      owner,
      repo,
      issue_number,
      state: "closed"
    });
  }

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
    let queryBody = `"org:${organization} is:pr archived:false created:${creationPeriod}"`;

    if (isClosed != null) {
      queryBody = queryBody + " " + isClosed;
    }

    core.info(queryBody);
    core.info(organization);

    const { organization: data } = await this.graphqlClient(
      format(orgPullRequestQuery, queryBody)
    );
    core.info(data);

    return data;
  }

  async collectTeamsData(organization, teamsCursor, repositoriesCursor, membersCursor) {
    let data;
    try {
      data = await this.requestOrgTeamsAndReposAndMembers(
        organization,
        teamsCursor,
        repositoriesCursor,
        membersCursor
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

      const teamsPage = data.teams;
      const currentTeam = teamsPage.edges[0];

      const repositoriesPage = currentTeam.node.repositories.edges;
      const repositoriesHasNextPage = currentTeam.node.repositories.pageInfo.hasNextPage;
      const lastRepoCursor = currentTeam.node.repositories.pageInfo.endCursor;

      const membersPage = currentTeam.node.members.edges;
      const membersHasNextPage = currentTeam.node.members.pageInfo.hasNextPage;
      const lastMemberCursor = currentTeam.node.members.pageInfo.endCursor;
      let result;

      if (!this.result[organization]) {
        result = this.result[organization] = data;
        this.lastTrackedTeam = teamsCursor;
      } else {
        result = this.result[organization];

        const teamsInResult = result.teams.edges.length;
        const lastTeamsInResult = result.teams.edges[teamsInResult - 1];

        if (result && currentTeam.node.name === lastTeamsInResult.node.name) {
          lastTeamsInResult.node.repositories.edges = [
            ...lastTeamsInResult.node.repositories.edges,
            ...repositoriesPage
          ];

          lastTeamsInResult.node.members.edges = [
            ...lastTeamsInResult.node.members.edges,
            ...membersPage
          ]
        } else {
          this.lastTrackedTeam = teamsCursor;
          result.teams.edges = [
            ...result.teams.edges,
            currentTeam
          ];
        }
      }

      this.result[organization] = result;

      if (repositoriesHasNextPage === true) {
        let teamsStartCursor = this.lastTrackedTeam;
        core.info(
          `⏳ Still scanning ${currentTeam.node.name} repositories, total repositories count: ${result.teams.edges[result.teams.edges.length - 1]
            .node.repositories.totalCount
          }`
        );
        await this.collectTeamsData(
          organization,
          teamsStartCursor,
          lastRepoCursor,
          null
        );
        return;
      }

      if (membersHasNextPage === true) {
        let teamsStartCursor = this.lastTrackedTeam;
        core.info(
          `⏳ Still scanning ${currentTeam.node.name} members, total members count: ${result.teams.edges[result.teams.edges.length - 1]
            .node.members.totalCount
          }`
        );
        await this.collectTeamsData(
          organization,
          teamsStartCursor,
          null,
          lastMemberCursor
        );
        return;
      }

      core.info(`✅ Finished scanning ${currentTeam.node.name}`);

      if (teamsPage.pageInfo.hasNextPage === true) {
        await this.collectTeamsData(
          organization,
          teamsPage.pageInfo.endCursor,
          null,
          null
        );
        return;
      }

      return this.result[organization];
    }

  }

  async getPullRequestCount(organization, isClosed, creationPeriod) {
    let data;
    try {
      data = await this.requestOrgPullRequest(
        organization,
        isClosed,
        creationPeriod
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
      core.info(data.issueCount);
      return data.search.issueCount;
    }
  }

  async collectPullRequestData(organization) {
    let nbPullResquestCreated;
    let nbPullResquestClosed;
    let date = new Date();

    let firstDayString = dateFormat.format(new Date(date.getFullYear(), date.getMonth(), 1), 'yyyy-MM-dd');
    let lastDayString = dateFormat.format(new Date(date.getFullYear(), date.getMonth() + 1, 0), 'yyyy-MM-dd');
    let creationPeriod = firstDayString + ".." + lastDayString;

    nbPullResquestCreated = await this.getPullRequestCount(
      organization,
      null,
      creationPeriod
    );

    nbPullResquestClosed = await this.getPullRequestCount(
      organization,
      "is:closed",
      creationPeriod
    );

    core.info(`Organization PR created between ${firstDayString} and ${lastDayString} = ${nbPullResquestCreated}`);
    core.info(`Organization PR Closed between ${firstDayString} and ${lastDayString} = ${nbPullResquestClosed}`);

    this.pullRequestData.push({
      beginDate: firstDayString,
      endDate: lastDayString,
      prCreated: nbPullResquestCreated,
      prClosed: nbPullResquestClosed
    })

    return this.pullRequestData;

  }

  async startOrgReview() {
    try {
      for (const { login } of this.organizations) {
        core.startGroup(`🔍 Start collecting for organization ${login}.`);
        this.result[login] = null;
        await this.collectTeamsData(login);
        //await this.collectPullRequestData(login);

        if (this.result[login]) {
          core.info(
            `✅ Finished collecting for organization ${login}`
          );
          core.endGroup();
        }
      }

      await this.endOrgReview();
    } catch (error) {
      console.log(error.message);
      await this.endOrgReview();
    }
  }

  normalizeResult() {
    core.info(`⚛  Normalizing result.`);
    Object.keys(this.result).forEach(organization => {
      if (!this.result[organization]) {
        return;
      }

      this.result[organization].teams.edges.forEach(team => {
        if (!team) {
          return;
        }
        team.node.repositories.edges.forEach(repository => {
          team.node.members.edges.forEach(member => {
            this.orgNormalizedData.push({
              organization,
              team: team.node.name,
              repository: repository.node.nameWithOwner,
              memberName: member.node.name,
              memberLogin: member.node.login
            });
          });
        });
      });
    });
  }

  normalizeTeamsRepoResult() {
    let normalizedData = [];
    core.info(`⚛  Normalizing repositories result.`);
    Object.keys(this.result).forEach(organization => {
      if (!this.result[organization]) {
        return;
      }

      this.result[organization].teams.edges.forEach(team => {
        if (!team) {
          return;
        }
        team.node.repositories.edges.forEach(repository => {
          normalizedData.push(
            {
              organization,
              team: team.node.name,
              repository: repository.node.nameWithOwner,
            }
          )
        });
      });
    });

    return normalizedData;
  }

  normalizeTeamsMembersResult() {
    let normalizedData = [];
    core.info(`⚛  Normalizing members result.`);
    Object.keys(this.result).forEach(organization => {
      if (!this.result[organization]) {
        return;
      }

      this.result[organization].teams.edges.forEach(team => {
        if (!team) {
          return;
        }
        team.node.members.edges.forEach(member => {
          normalizedData.push({
            team: team.node.name,
            memberName: member.node.name,
            memberLogin: member.node.login
          });
        });
      });
    });

    return normalizedData;
  }

  async endOrgReview() {
    await this.normalizeResult();
    const result_json = this.orgNormalizedData;
    const repositories_json = await this.normalizeTeamsRepoResult();
    const members_json = await this.normalizeTeamsMembersResult();

    if (!result_json.length) {
      return core.setFailed(`⚠️  No data collected. Stopping action`);
    }

    const result_csv = JSONtoCSV(result_json);
    const repositories_csv = JSONtoCSV(repositories_json);
    const members_csv = JSONtoCSV(members_json);

    /**********************************/
    /*** Create Result CSV and JSON ***/

    await writeFileAsync(
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}.json`,
      JSON.stringify(result_json)
    );
    await writeFileAsync(`${DATA_FOLDER}/${ARTIFACT_FILE_NAME}.csv`, result_csv);

    /*** Create Teams Repo CSV and JSON ***/
    await writeFileAsync(
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_repositories.json`,
      JSON.stringify(repositories_json)
    );
    await writeFileAsync(`${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_repositories.csv`, repositories_csv);

    /*** Create Teams Members CSV and JSON ***/
    await writeFileAsync(
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_members.json`,
      JSON.stringify(members_json)
    );
    await writeFileAsync(`${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_members.csv`, members_csv);

    await this.createandUploadArtifacts([
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}.json`,
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}.csv`,
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_repositories.json`,
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_repositories.csv`,
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_members.json`,
      `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}_teams_members.csv`
    ]);

    /****************************
    ***** POSTING TO ISSUE ****
    **************************/

    if (!this.options.postToIssue) {
      return core.info(
        `Skipping posting result to issue ${this.options.repository}.`
      );
    }

    const issue_param = await this.createIssue(`# Github Access Review`);
    core.info(`Posting result to issue in ${this.options.repository}.`);

    // Pull request review comment

    // let pull_request_comment = `

    // # Pull Request Info

    // ### Pull Request Created: 
    // ### Pull Request Closed: 
    // `


    // await this.postCommentToIssue(
    //   issue_param.owner,
    //   issue_param.repo,
    //   issue_param.issue_number,
    //   body
    // );
    // Repositories Review

    let comment_body = `
    # Repositories review

    ${csvToMarkdown(members_csv)}
    `;

    await this.postCommentToIssue(
      issue_param.owner,
      issue_param.repo,
      issue_param.issue_number,
      comment_body
    );

    // Members review comment

    comment_body = `
    # Members review

    ${csvToMarkdown(members_csv)}
    `;

    await this.postCommentToIssue(
      issue_param.owner,
      issue_param.repo,
      issue_param.issue_number,
      comment_body
    );

    process.exit();
  }

}


const main = async () => {
  const token = core.getInput("token") || process.env.TOKEN;
  const organization =
    core.getInput("organization") || process.env.ORGANIZATION;

  const Collector = new CollectOrgData(token, organization, {
    repository: process.env.GITHUB_REPOSITORY,
    postToIssue: core.getInput("postToIssue") || process.env.ISSUE,
    issueTitle: core.getInput("issueTitle") || DEFAULT_ISSUE_TITLE
  })
  await Collector.startOrgReview();

};

try {
  main();
} catch (error) {
  core.setFailed(error.message);
}