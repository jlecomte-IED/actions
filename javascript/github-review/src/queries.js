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
  orgSearchAndCountQuery: `
  query($q: String!){
    search(query: $q , type: ISSUE, last: 100)   
    {
      issueCount
    }
  }`,
  orgListRepoIssueQuery: `
  query ($organization: String!, $repo: String!,$issuesCursor: String, $states: [IssueState!]) {
    organization(login: $organization) {
      repository(name: $repo) {
        issues(first: 100 after: $issuesCursor, states: $states) {
          edges {
            node {
              id
              title
              number
              state
              labels(first: 10) {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
          pageInfo {
            startCursor
            hasNextPage
            endCursor
          }
        }
      }
    }
  }`
};

module.exports = queries;
