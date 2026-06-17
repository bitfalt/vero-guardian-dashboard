type PRMetadata = {
  hash: string;
  title: string;
  author: string;
  url: string;
};

type JsonRecord = Record<string, unknown>;

type PullRequestNode = {
  oid: string;
  title: string;
  url: string;
  authorLogin?: string;
};

function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined;
}

function extractFirstPullRequest(value: unknown): PullRequestNode | undefined {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  const repository = asRecord(data?.repository);
  const object = asRecord(repository?.object);
  const associatedPullRequests = asRecord(object?.associatedPullRequests);
  const edges = associatedPullRequests?.edges;

  if (!Array.isArray(edges)) {
    return undefined;
  }

  const firstEdge = asRecord(edges[0]);
  const node = asRecord(firstEdge?.node);

  if (
    typeof node?.oid !== 'string' ||
    typeof node.title !== 'string' ||
    typeof node.url !== 'string'
  ) {
    return undefined;
  }

  const author = asRecord(node.author);
  const authorLogin = typeof author?.login === 'string' ? author.login : undefined;

  return {
    oid: node.oid,
    title: node.title,
    url: node.url,
    authorLogin,
  };
}

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
export async function fetchPRMetadata(prHash: string): Promise<PRMetadata> {
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

  const pr = extractFirstPullRequest(await response.json());
  if (!pr) {
    throw new Error('No associated PR found for this commit hash');
  }

  return {
    hash: pr.oid,
    title: pr.title,
    author: pr.authorLogin ?? 'unknown',
    url: pr.url,
  };
}
