module.exports = () => {
  const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_PROFILE,
    AMAZON_S3_BUCKET_NAME,
    PROJECT_ID,
    GITHUB_EVENT_PATH
  } = process.env;

  if (!AWS_PROFILE) {
    if (!AWS_ACCESS_KEY_ID) throw new Error("Missing env AMAZON_S3_KEY");
    if (!AWS_SECRET_ACCESS_KEY) throw new Error("Missing env AMAZON_S3_SECRET");
  }
  if (!AMAZON_S3_BUCKET_NAME)
    throw new Error("Missing env AMAZON_S3_BUCKET_NAME");
  if (!PROJECT_ID) throw new Error("Missing env PROJECT_ID");
  if (!GITHUB_EVENT_PATH) throw new Error("Missing env GITHUB_EVENT_PATH");

  return process.env;
};
