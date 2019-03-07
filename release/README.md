# Push release note to S3

## Usage

Could be tested by:

- Define env variables
- `yarn`
- `yarn start`

```
action "Push release note to S3" {
  uses = "inextensodigital/actions/release@master"
  secrets = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
  env = {
    AMAZON_S3_BUCKET_NAME="release-note"
    PROJECT_ID="document-manager"
  }
}
```
