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
    this.indicators = new Object();
    this.githubTools = new GithubTools(this.token, organization, this.options);
  }

  async collectSimpleIndicators(organization, creationPeriod) {
    core.info(`Start Collecting Simple indicators`);

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
      `org:${organization} is:pr is:closed archived:false created:${creationPeriod}`
    );

    this.indicators.SMSI_THIRD_FAILURE_COUNT = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:${this.options.repository} is:issue is:open label:third created:${creationPeriod}`
    );

    this.indicators.SMSI_FAILURE_OPEN = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:${this.options.repository} is:issue is:open label:failure created:${creationPeriod}`
    );

    this.indicators.SMSI_FAILURE_CRITICAL = await this.githubTools.searchAndCountIssue(
      organization,
      `repo:${this.options.repository} is:issue is:open label:failure label:critical created:${creationPeriod}`
    );

    core.info(`✅ Finishing Collecting Simple indicators`);
  }

  async collectComplexIndicators(organization, creationPeriod) {
    core.info(`Start Collecting Complex indicators`);

    console.log("SMSI_FAILURE_CLOSED");

    this.indicators.SMSI_FAILURE_CLOSED =
      await this.githubTools.searchAndCountIssue(
        organization,
        `repo:${this.options.repository} is:issue is:closed label:failure closed:${creationPeriod}`
      )
      +
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'To validate', 'failure', 'open');

    console.log("SMSI_FAILURE_PENDING");
    this.indicators.SMSI_FAILURE_PENDING =
      await this.githubTools.searchAndCountIssue(
        organization,
        `repo:${this.options.repository} is:issue is:open label:failure`
      )
      -
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'To validate', 'failure', 'open');

    console.log("SMSI_NC_COUNT");
    this.indicators.SMSI_NC_COUNT =
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'In progress', 'bug', 'open') +
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'Current', 'bug', 'open') +
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'To review', 'bug', 'open');

    console.log("SMSI_OPP_COUNT");
    this.indicators.SMSI_OPP_COUNT =
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'In progress', 'enhancement', 'open') +
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'Current', 'enhancement', 'open') +
      await this.githubTools.countIssuesInColumn('Global ISO 27001', 'To review', 'enhancement', 'open');

    core.info(`✅ Finishing Collecting Complex indicators`);
  }

  async collectHRIndicators(organization) {
    core.info(`Start Collecting HR indicators`);

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
      HR_EMPLOYEE_OUT_ROUEN: 0
    }

    var issues = await githubToolsForRH.listIssues(['OPEN', 'CLOSED']);

    for (var issue of issues) {
      var extractDate = issue.title.substring(0, 12).split(/\D/g).filter(Number);

      if (extractDate.length == 3) {
        var issueDate = `${extractDate[0]}-${extractDate[1]}`;
        if (issueDate == reviewPeriod) {
          var issueLabels = []
          issue.labels.edges.forEach(label => {
            issueLabels.push(label.node.name);
          });
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