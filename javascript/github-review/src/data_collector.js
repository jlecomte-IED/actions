const core = require("@actions/core");
const { promisify, format } = require("util");
const { JSONtoCSV } = require("./utils");
const fs = require("fs");
const dateFormat = require("date-fns");

const Analyser = require("./analyser");
const GithubTools = require("./github_tools");
const { accessRemover } = require("./access_remover");
const { csvToMarkdown } = require("csv-to-markdown-table/lib/CsvToMarkdown");


const ERROR_MESSAGE_TOKEN_UNAUTHORIZED =
  "Resource protected by organization SAML enforcement. You must grant your personal token access to this organization.";
const ARTIFACT_FILE_NAME = "github-review";
const DATA_FOLDER = "./data"

const writeFileAsync = promisify(fs.writeFile);

!fs.existsSync(DATA_FOLDER) && fs.mkdirSync(DATA_FOLDER);

class OrgDataCollector {
  constructor(token, organization, options) {
    this.validateInput(organization, token);

    this.organizations = [{ login: organization }];
    this.options = options
    this.result = {};
    this.orgNormalizedData = [];
    this.pullRequestData = {};
    this.indicators = new Object();
    this.lastTrackedTeam = null;


    this.githubTools = new GithubTools(token, organization, this.options);
    this.analyser = new Analyser(this.githubTools, this.orgNormalizedData);
  }

  validateInput(organization, token) {
    if (!organization || !token) {
      core.setFailed(
        "The organization or token parameter are not defined."
      );
      process.exit();
    }
  }


  async collectTeamsData(organization, teamsCursor, repositoriesCursor, membersCursor) {
    let data;
    try {
      data = await this.githubTools.requestOrgTeamsAndReposAndMembers(
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


  async startOrgReview(organization) {
    try {
      for (const { login } of this.organizations) {
        core.startGroup(`🔍 Start collecting for organization ${login}.`);
        this.result[login] = null;
        await this.collectTeamsData(login);
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
        let repositories = [];
        let members = [];
        team.node.repositories.edges.forEach(repository => { repositories.push(repository.node.nameWithOwner) });
        team.node.members.edges.forEach(member => {
          members.push({
            name: member.node.name,
            login: member.node.login
          }
          )
        });

        this.orgNormalizedData.push({
          organization,
          team: team.node.name,
          repositories: repositories,
          members: members
        });
      });
    });
  }

  async postingOrgReview() {
    let body;

    await this.githubTools.findReviewIssue();

    //Posting result comment
    body =
      `## Github Actions Results\n` +
      `\n` +
      `*Date of review :* ${dateFormat.format(new Date(), 'yyyy-MM-dd')} \n` +
      `\n` +
      `### Members review results\n` +
      `\n` +
      `Get review artifacts [here](https://github.com/fulll/ISO-27001/actions/runs/${process.env.GITHUB_RUN_ID})\n`
    await this.githubTools.postCommentToIssue(body);

    //Posting analysis
    body = `### Member(s) with no name:`;
    this.analyser.analysisResults.membersWithNoName.forEach(member => body = body + `\n- ${member}`);
    console.log(body);
    await this.githubTools.postCommentToIssue(body);


    body = `### Repositories with member with direct access:`;
    this.analyser.analysisResults.membersWithDirectAccess.forEach(repo => {
      body = body + `\n#### ${repo.name}`;
      repo.members.forEach(member => body = body + `\n- ${member.login}`);
    });
    console.log(body);
    await this.githubTools.postCommentToIssue(body);
  }

  async endOrgReview() {
    await this.normalizeResult();
    const result_json = this.orgNormalizedData;

    if (!result_json.length) {
      return core.setFailed(`⚠️  No data collected. Stopping action`);
    }

    /**********************************
    *** Create Artifact CSV and JSON ***
    **********************************/
    const json_filePath = `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}-${dateFormat.format(new Date(), 'yyyy-MM-dd')}.json`
    const analysis_filePath = `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}-analysis-${dateFormat.format(new Date(), 'yyyy-MM-dd')}.json`

    //Starting analysis
    await this.analyser.startAnalysis();

    await writeFileAsync(
      json_filePath,
      JSON.stringify(result_json)
    );

    // Upload artifacts
    await this.githubTools.createandUploadArtifacts([
      json_filePath,
    ]);

    //Create analysis files
    if (this.options.exportAnalysis == true) {
      await writeFileAsync(
        analysis_filePath,
        JSON.stringify(this.analyser.analysisResults)
      );

      await this.githubTools.createandUploadArtifacts([
        analysis_filePath,
      ]);
    }

    if (this.options.directAccessDeletion) accessRemover(this.githubTools, this.analyser.analysisResults.membersWithDirectAccess);

    if (this.options.postToIssue) {
      // Posting review
      await this.postingOrgReview();
    } else {
      return core.debug("Skipping posting review in issue");
    }

    process.exit();
  }
}

module.exports = OrgDataCollector;