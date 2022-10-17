const core = require("@actions/core");
const { graphql } = require("@octokit/graphql");
const { promisify, format } = require("util");
const { JSONtoCSV, validateInput } = require("./utils");
const fs = require("fs");
const dateFormat = require("date-fns");

const GithubTools = require("./github_tools");

const ERROR_MESSAGE_TOKEN_UNAUTHORIZED =
  "Resource protected by organization SAML enforcement. You must grant your personal token access to this organization.";
const ARTIFACT_FILE_NAME = "ISMS-indicators";
const DATA_FOLDER = "./data"

const writeFileAsync = promisify(fs.writeFile);
!fs.existsSync(DATA_FOLDER) && fs.mkdirSync(DATA_FOLDER);

class IndicatorsCollector {

  constructor(token, organization, options) {
    validateInput(organization, token);
    this.token = token
    this.organizations = [{ login: organization }]
    this.options = options
    this.projectItemsV2 = {};
    this.indicators = new Object();
    this.githubTools = new GithubTools(this.token, organization, this.options);
  }

  async collectProjectV2Items(projectId, itemsCursor) {
    let data;
    try {
      data = await this.githubTools.requestOrgListProjectV2Items(
        projectId,
        itemsCursor
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

      let result;
      const projectTitle = data.node.title
      const itemsPage = data.node.items.nodes
      const itemsHasNextPage = data.node.items.pageInfo.hasNextPage;
      const itemsNextCursor = data.node.items.pageInfo.endCursor;

      if (!this.projectItemsV2[projectId]) {
        result = this.projectItemsV2[projectId] = data;
      } else {
        result = this.projectItemsV2[projectId];

        result.node.items.nodes = [
          ...result.node.items.nodes,
          ...itemsPage
        ];
      }

      this.projectItemsV2[projectId] = result;
      if (itemsHasNextPage === true) {
        core.info(
          `⏳ Still scanning project "${projectTitle}" items, total items count: ${result.node.items.nodes.length}`
        );
        let itemsStartCursor = itemsNextCursor;
        await this.collectProjectV2Items(
          projectId,
          itemsStartCursor
        );
        return;
      }

      return this.projectItemsV2[projectId];
    }
  }

  async countIssueInProjectV2(projectId,status, state, ...labels) {

    let items = this.projectItemsV2[projectId].node.items.nodes
    let issue_counter = 0;

    for (var item of items) {
      if (item.content != null && item.content.state == state) {

        //create labels array
        var issueLabels = []
        item.content.labels.nodes.forEach(label => {
          issueLabels.push(label.name);
        });

        //Verify for item status && labels

        item.fieldValues.nodes.forEach(fieldValue => {
          if (fieldValue.size != 0 && 'name' in fieldValue) {
            if (fieldValue.field.name == 'Status' && fieldValue.name == status) {
              if(labels.every(i => issueLabels.includes(i))) issue_counter++;
            }
          }
        })

      }
    }
    return issue_counter;
  }

  async collectSimpleIndicators(organization, creationPeriod) {
    core.info(`🔍 Start Collecting Simple indicators`);

    this.indicators.BUGS_OPEN = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:fulll/superheroes is:issue label:bug created:${creationPeriod}`
    );

    this.indicators.BUGS_CLOSED = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:fulll/superheroes is:issue label:bug closed:${creationPeriod}`
    );

    this.indicators.DEV_PULLS_OPEN = await this.githubTools.searchAndCountIssue(
      organization,
      `org:${organization} is:pr archived:false created:${creationPeriod}`
    );

    this.indicators.DEV_PULLS_CLOSED = await this.githubTools.searchAndCountIssue(
      organization,
      `org:${organization} is:pr is:closed archived:false closed:${creationPeriod}`
    );

    this.indicators.SMSI_THIRD_FAILURE_COUNT = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:${this.options.repository} is:issue is:open label:third created:${creationPeriod}`
    );

    this.indicators.SMSI_FAILURE_OPEN = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:${this.options.repository} is:issue label:failure created:${creationPeriod}`
    );

    this.indicators.SMSI_FAILURE_CLOSED =
      await this.githubTools.searchAndCountIssue(
        organization,
        `repo:${this.options.repository} is:issue is:closed label:failure closed:${creationPeriod}`
      );

    core.info(`✅ Finishing Collecting Simple indicators`);
  }

  async collectComplexIndicators(organization, creationPeriod) {
    core.info(`🔍 Start Collecting Complex indicators`);
    core.info(`Start Collecting Project Items...`);
    console.log(this.options.projectV2Number)
    const SMSI_PROJECT_ID = await this.githubTools.getProjectV2ID(organization,this.options.projectV2Number)
    console.log(SMSI_PROJECT_ID)
    await this.collectProjectV2Items(SMSI_PROJECT_ID,null);

    core.info("Getting SMSI_FAILURE_CRITICAL ...");
  
    this.indicators.SMSI_FAILURE_CRITICAL = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:${this.options.repository} is:issue is:open label:failure label:critical`
      ) - await this.countIssueInProjectV2(SMSI_PROJECT_ID, '👍To validate', 'OPEN', 'failure', 'critical');

    core.info("Getting SMSI_FAILURE_PENDING ...");
    this.indicators.SMSI_FAILURE_PENDING =
      await this.githubTools.searchAndCountIssue(
        organization,
        `repo:${this.options.repository} is:issue is:open label:failure`
      )
      -
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '👍To validate', 'OPEN', 'failure');

    core.info("Getting SMSI_FAILURE_TO_VALIDATE ...");
    this.indicators.SMSI_FAILURE_TO_VALIDATE = await this.countIssueInProjectV2(SMSI_PROJECT_ID, '👍To validate', 'OPEN', 'failure');


    core.info("Getting SMSI_NC_COUNT ...");
    this.indicators.SMSI_NC_COUNT =
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '🚌 In progress', 'OPEN', 'bug') +
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '🤸‍♂To do', 'OPEN', 'bug') +
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '👀 To revie', 'OPEN', 'bug');

    core.info("Getting SMSI_OPP_COUNT ...");
    this.indicators.SMSI_OPP_COUNT =
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '🚌 In progress', 'OPEN', 'enhancement') +
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '🤸‍♂To do', 'OPEN', 'enhancement') +
      await this.countIssueInProjectV2(SMSI_PROJECT_ID, '👀 To revie', 'OPEN', 'enhancement');

    core.info(`✅ Finishing Collecting Complex indicators`);
  }

  async collectHRIndicators(organization) {
    core.info(`🔍 Start Collecting HR indicators`);

    const hr_repo = 'fulll/service-rh';
    const date = new Date();
    const reviewPeriod = dateFormat.format(new Date(date.getFullYear(), date.getMonth() - 1, 1), 'yyyy-MM');
    var githubToolsForRH = new GithubTools(this.token, organization, {
      repository: hr_repo,
    });

    const hr_indicators = {
      HR_EMPLOYEE_IN_AIX: 0,
      HR_EMPLOYEE_OUT_AIX: 0,
      HR_EMPLOYEE_IN_LYON: 0,
      HR_EMPLOYEE_OUT_LYON: 0,
      HR_EMPLOYEE_IN_ROUEN: 0,
      HR_EMPLOYEE_OUT_ROUEN: 0,
      HR_INTERN_IN_AIX: 0,
      HR_INTERN_OUT_AIX: 0,
      HR_INTERN_IN_LYON: 0,
      HR_INTERN_OUT_LYON: 0,
      HR_INTERN_IN_ROUEN: 0,
      HR_INTERN_OUT_ROUEN: 0
    }

    var issues = await githubToolsForRH.listRepoIssues('all');

    for (var issue of issues) {
      var extractDate = issue.title.substring(0, 12).split(/\D/g).filter(Number);

      if (extractDate.length == 3) {
        var issueDate = `${extractDate[0]}-${extractDate[1]}`;
        if (issueDate == reviewPeriod) {
          var issueLabels = []
          issue.labels.forEach(label => {
            issueLabels.push(label.name);
          });
          if (!issueLabels.includes('intern')) {
            if (issueLabels.includes('aix')) {
              if (issueLabels.includes('entree')) hr_indicators.HR_EMPLOYEE_IN_AIX++;
              if (issueLabels.includes('sortie')) hr_indicators.HR_EMPLOYEE_OUT_AIX++;
            }
            if (issueLabels.includes('lyon')) {
              if (issueLabels.includes('entree')) hr_indicators.HR_EMPLOYEE_IN_LYON++;
              if (issueLabels.includes('sortie')) hr_indicators.HR_EMPLOYEE_OUT_LYON++;
            }
            if (issueLabels.includes('rouen')) {
              if (issueLabels.includes('entree')) hr_indicators.HR_EMPLOYEE_IN_ROUEN++;
              if (issueLabels.includes('sortie')) hr_indicators.HR_EMPLOYEE_OUT_ROUEN++;
            }
          } else {
            if (issueLabels.includes('aix')) {
              if (issueLabels.includes('entree')) hr_indicators.HR_INTERN_IN_AIX++;
              if (issueLabels.includes('sortie')) hr_indicators.HR_INTERN_OUT_AIX++;
            }
            if (issueLabels.includes('lyon')) {
              if (issueLabels.includes('entree')) hr_indicators.HR_INTERN_IN_LYON++;
              if (issueLabels.includes('sortie')) hr_indicators.HR_INTERN_OUT_LYON++;
            }
            if (issueLabels.includes('rouen')) {
              if (issueLabels.includes('entree')) hr_indicators.HR_INTERN_IN_ROUEN++;
              if (issueLabels.includes('sortie')) hr_indicators.HR_INTERN_OUT_ROUEN++;
            }
          }
        }
      }
    }

    Object.assign(this.indicators, hr_indicators);

    core.info(`✅ Finishing Collecting HR indicators`);
  }

  async startIndicatorsReview() {
    try {
      for (const { login } of this.organizations) {
        core.startGroup(`🔍 Start collecting Indicators in organization ${login}.`);
        let date = new Date();
        let firstDayString = dateFormat.format(new Date(date.getFullYear(), date.getMonth() - 1, 1), 'yyyy-MM-dd');
        let lastDayString = dateFormat.format(new Date(date.getFullYear(), date.getMonth(), 0), 'yyyy-MM-dd');
        let creationPeriod = firstDayString + ".." + lastDayString;

        core.info(`Review Period: ${creationPeriod}`);

        await this.collectSimpleIndicators(login, creationPeriod);
        await this.collectComplexIndicators(login, creationPeriod);
        await this.collectHRIndicators(login);

        if (this.indicators) {
          core.info(
            `✅ Finished collecting ISMS indicators for organization ${login}`
          );
          core.endGroup();
        }

        const indicators_json = []
        Object.entries(this.indicators).forEach(([key, value]) => {
          indicators_json.push({
            indicators: key,
            value: value
          })
        });

        const indicators_csv = JSONtoCSV(indicators_json);

        const file_path = `${DATA_FOLDER}/${ARTIFACT_FILE_NAME}-${dateFormat.format(new Date(), 'yyyy-MM-dd')}`

        await writeFileAsync(
          `${file_path}.json`,
          JSON.stringify(indicators_json)
        );

        await writeFileAsync(
          `${file_path}.csv`,
          indicators_csv
        );

        await this.githubTools.createandUploadArtifacts([
          `${file_path}.csv`,
          `${file_path}.json`
        ]);

        process.exit();
      }
    } catch (error) {
      console.log(error.message);
    }
  }

}

module.exports = IndicatorsCollector;