import fetch, { Response } from 'node-fetch';
import { fetchPRMetadata } from '../../githubClient';

jest.mock('node-fetch', () => jest.fn());

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('fetchPRMetadata', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, GITHUB_TOKEN: 'dummy-token' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns PR data on success', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        data: {
          repository: {
            object: {
              associatedPullRequests: {
                edges: [{ node: { url: 'https://github.com/a/b/pull/1', title: 'Fix', author: { login: 'alice' }, oid: 'abcd1234' } }],
              },
            },
          },
        },
      }),
    } as unknown as Response;
    mockedFetch.mockResolvedValue(mockResponse);

    const result = await fetchPRMetadata('abcd1234');
    expect(result).toEqual({
      hash: 'abcd1234',
      title: 'Fix',
      author: 'alice',
      url: 'https://github.com/a/b/pull/1',
    });
    expect(mockedFetch).toHaveBeenCalledWith('https://api.github.com/graphql', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'bearer dummy-token' }),
    }));
  });

  it('throws error when token missing', async () => {
    delete process.env.GITHUB_TOKEN;
    await expect(fetchPRMetadata('abcd')).rejects.toThrow('GITHUB_TOKEN environment variable is not set');
  });

  it('throws rate limit error', async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      text: async () => 'rate limit exceeded',
      statusText: 'Forbidden',
    } as unknown as Response;
    mockedFetch.mockResolvedValue(mockResponse);
    await expect(fetchPRMetadata('abcd')).rejects.toThrow('GitHub API rate limit exceeded');
  });
});
