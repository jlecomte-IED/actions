const MAX_COLLABORATORS_PER_CALL = 100;

const queries = {
 orgTeamsAndReposAndMembersQuery: `
  query($organization: String!, $teamsCursor: String, $repositoriesCursor: String, $membersCursor: String) {
    organization(login: $organization) {
      teams(first:1 after: $teamsCursor) {
        edges {
          cursor
          node {
            name
            ancestors(first: 10) {
              nodes {
                name
              }
            }
            members(first: 100 after: $membersCursor) {
              totalCount
              edges {
                node {
                  login
                  name
                }
                #cursor
              }
              pageInfo {
                endCursor
                hasNextPage
                startCursor
              }
            }
            repositories(first: 100 after: $repositoriesCursor) {
              totalCount
              edges {
                node {
                  nameWithOwner
                }
                #cursor
              }
              pageInfo {
                endCursor
                hasNextPage
                startCursor
              }
            }
          }
      # cursor
        }
        pageInfo {
          endCursor
          hasNextPage
          startCursor
        }
      }
    }
  }
 `,
  orgTeamsReposQuery: `
  query($organization: String!, $teamsCursor: String, $repositoriesCursor: String) {
    organization(login: $organization) {
      teams(first: 1 after: $teamsCursor) {
        totalCount
        edges {
          cursor
          node {
            name
            ancestors(first: 10) {
              nodes {
                name
              }
            }
            repositories(first: 100 after: $repositoriesCursor) {
              totalCount
              edges {
                node {
                  nameWithOwner
                }
                #cursor
              }
              pageInfo {
                endCursor
                hasNextPage
                startCursor
              }
            }
          }
          # cursor
        }
        pageInfo {
          endCursor
          hasNextPage
          startCursor
        }
      }
    }
  }
  `,
  orgTeamsMembersQuery: `
  query($organization: String!, $teamsCursor: String, $membersCursor: String) {
    organization(login: $organization) {
      teams(first: 1 after: $teamsCursor) {
        totalCount
        edges {
          cursor
          node {
            name
            ancestors(first: 10) {
              nodes {
                name
              }
            }
            members(first: 100 after: $membersCursor) {
              totalCount
              edges {
                node {
                  login
                  name
                }
                #cursor
              }
              pageInfo {
                endCursor
                hasNextPage
                startCursor
              }
            }
          }
          # cursor
        }
        pageInfo {
          endCursor
          hasNextPage
          startCursor
        }
      }
    }
  }`,
  orgPullRequestQuery: `
  query($query: String!){
    search(query:$query, type: ISSUE, last: 100)   
    {
      issueCount
    }
  }`
};

module.exports = queries;
