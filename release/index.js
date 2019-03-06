const aws = require("aws-sdk");
const fs = require("fs");

const getEnvs = require("./helpers/getEnvs");
const createBody = require("./helpers/createBody");

try {
  console.log("# Get envs");
  const {
    AMAZON_S3_BUCKET_NAME: Bucket,
    IED_PROJECT_ID,
    GITHUB_EVENT_PATH
  } = getEnvs();

  console.log("# Get release");
  const {
    release: { id: releaseID, tag_name, body, draft, created_at, published_at },
    repository: { id: repositoryID, full_name }
  } = require(GITHUB_EVENT_PATH);

  const status = draft ? "Draft" : "Publish";

  console.log("# Create body");
  const Body = createBody({ status, published_at, created_at, body });

  console.log("# Create path");
  const Key = `raw/${IED_PROJECT_ID}/${repositoryID}-${releaseID}.md`;

  const s3 = new aws.S3();

  console.log("# Put file on Amazon S3");
  s3.putObject({ Bucket, Key, Body }, resp => {
    if (!resp) {
      console.log("# File send on Amazon S3");
      process.exit(0);
    } else {
      throw new Error(`${resp.message}`);
    }
  });
} catch (error) {
  console.log(error);
  process.exit(1);
}
