import { fetchPRMetadata } from '../githubClient';

const mockedFetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();

describe('fetchPRMetadata', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockedFetch.mockReset();
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: mockedFetch,
      writable: true,
    });
    process.env = { ...originalEnv, GITHUB_TOKEN: 'dummy-token' };
  });

  afterAll(() => {
    process.env = originalEnv;
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: originalFetch,
      writable: true,
    });
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
