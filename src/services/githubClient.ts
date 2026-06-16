import fetch from 'node-fetch';

// GraphQL query to fetch PR details by commit SHA (prHash)
const PR_QUERY = `
  query($owner: String!, $name: String!, $commitSha: String!) {
    repository(owner: $owner, name: $name) {
      object(expression: $commitSha) {
        ... on Commit {
          associatedPullRequests(first: 1) {
            edges {
              node {
                url
                title
                author {
                  login
                }
                oid
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch PR metadata from GitHub GraphQL API using a commit hash.
 * @param prHash - The commit SHA associated with the PR.
 * @returns An object containing hash, title, author, and url.
 */
export async function fetchPRMetadata(prHash: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  // Repository details – adjust if the repo changes.
  const owner = 'AugistineCreates';
  const name = 'vero-guardian-dashboard';

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: JSON.stringify({
      query: PR_QUERY,
      variables: { owner, name, commitSha: prHash },
    }),
  });

  if (!response.ok) {
    // Handle rate limiting (HTTP 403 with "rate limit" in body)
    const text = await response.text();
    if (response.status === 403 && /rate limit/i.test(text)) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const commitObj = json.data?.repository?.object;
  if (!commitObj || !commitObj.associatedPullRequests?.edges?.[0]?.node) {
    throw new Error('No associated PR found for this commit hash');
  }

  const pr = commitObj.associatedPullRequests.edges[0].node;
  return {
    hash: pr.oid,
    title: pr.title,
    author: pr.author?.login ?? 'unknown',
    url: pr.url,
  };
}
