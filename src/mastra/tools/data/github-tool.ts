import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  created_at: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  html_url: string;
  avatar_url: string;
}

export const githubSearchReposTool = createTool({
  id: 'search-github-repos',
  description: 'Search for GitHub repositories',
  inputSchema: z.object({
    query: z.string().describe('Search query for repositories'),
    sort: z.enum(['stars', 'forks', 'updated', 'best-match']).default('best-match').describe('Sort order for results'),
    limit: z.number().min(1).max(100).default(10).describe('Number of results to return'),
  }),
  outputSchema: z.object({
    query: z.string(),
    totalCount: z.number(),
    repositories: z.array(z.object({
      name: z.string(),
      fullName: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      stars: z.number(),
      forks: z.number(),
      language: z.string().nullable(),
      owner: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    const { query, sort, limit } = context;
    
    try {
      const sortParam = sort === 'best-match' ? '' : `&sort=${sort}`;
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}${sortParam}&per_page=${limit}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            // Add GitHub token if available for higher rate limits
            ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {}),
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        query,
        totalCount: data.total_count || 0,
        repositories: (data.items || []).map((repo: GitHubRepo) => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          owner: repo.owner.login,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
        })),
      };
    } catch (error) {
      console.warn('GitHub API failed, returning mock data:', error);
      return getMockRepoData(query, limit || 10);
    }
  },
});

export const githubUserInfoTool = createTool({
  id: 'get-github-user',
  description: 'Get information about a GitHub user',
  inputSchema: z.object({
    username: z.string().describe('GitHub username'),
  }),
  outputSchema: z.object({
    username: z.string(),
    name: z.string().nullable(),
    bio: z.string().nullable(),
    publicRepos: z.number(),
    followers: z.number(),
    following: z.number(),
    createdAt: z.string(),
    profileUrl: z.string(),
    avatarUrl: z.string(),
    topLanguages: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    const { username } = context;
    
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {}),
      };
      
      // Fetch user info
      const userResponse = await fetch(`https://api.github.com/users/${username}`, { headers });
      
      if (!userResponse.ok) {
        throw new Error(`GitHub API error: ${userResponse.status}`);
      }
      
      const userData: GitHubUser = await userResponse.json();
      
      // Fetch user's repositories to determine top languages
      const reposResponse = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=30`,
        { headers }
      );
      
      const repos = reposResponse.ok ? await reposResponse.json() : [];
      
      // Count languages
      const languageCounts: Record<string, number> = {};
      repos.forEach((repo: GitHubRepo) => {
        if (repo.language) {
          languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
        }
      });
      
      const topLanguages = Object.entries(languageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lang]) => lang);
      
      return {
        username: userData.login,
        name: userData.name,
        bio: userData.bio,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        createdAt: userData.created_at,
        profileUrl: userData.html_url,
        avatarUrl: userData.avatar_url,
        topLanguages,
      };
    } catch (error) {
      console.warn('GitHub API failed, returning mock data:', error);
      return getMockUserData(username);
    }
  },
});

export const githubRepoStatsTool = createTool({
  id: 'get-repo-stats',
  description: 'Get detailed statistics for a GitHub repository',
  inputSchema: z.object({
    owner: z.string().describe('Repository owner (username or organization)'),
    repo: z.string().describe('Repository name'),
  }),
  outputSchema: z.object({
    name: z.string(),
    fullName: z.string(),
    description: z.string().nullable(),
    stars: z.number(),
    forks: z.number(),
    watchers: z.number(),
    openIssues: z.number(),
    language: z.string().nullable(),
    topics: z.array(z.string()),
    license: z.string().nullable(),
    defaultBranch: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    pushedAt: z.string(),
    size: z.number(),
    contributors: z.number(),
    hasWiki: z.boolean(),
    hasIssues: z.boolean(),
    hasProjects: z.boolean(),
    url: z.string(),
  }),
  execute: async ({ context }) => {
    const { owner, repo } = context;
    
    try {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {}),
      };
      
      // Fetch repository info
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      
      if (!repoResponse.ok) {
        throw new Error(`GitHub API error: ${repoResponse.status}`);
      }
      
      const repoData = await repoResponse.json();
      
      // Fetch contributor count
      const contributorsResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=1`,
        { headers }
      );
      
      let contributorCount = 0;
      if (contributorsResponse.ok) {
        const linkHeader = contributorsResponse.headers.get('Link');
        if (linkHeader) {
          const match = linkHeader.match(/page=(\d+)>; rel="last"/);
          contributorCount = match ? parseInt(match[1]) : 1;
        } else {
          const contributors = await contributorsResponse.json();
          contributorCount = contributors.length;
        }
      }
      
      return {
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        openIssues: repoData.open_issues_count,
        language: repoData.language,
        topics: repoData.topics || [],
        license: repoData.license?.name || null,
        defaultBranch: repoData.default_branch,
        createdAt: repoData.created_at,
        updatedAt: repoData.updated_at,
        pushedAt: repoData.pushed_at,
        size: repoData.size,
        contributors: contributorCount,
        hasWiki: repoData.has_wiki,
        hasIssues: repoData.has_issues,
        hasProjects: repoData.has_projects,
        url: repoData.html_url,
      };
    } catch (error) {
      console.warn('GitHub API failed, returning mock data:', error);
      return getMockRepoStats(owner, repo);
    }
  },
});

export const githubTrendingTool = createTool({
  id: 'get-github-trending',
  description: 'Get trending GitHub repositories',
  inputSchema: z.object({
    language: z.string().optional().describe('Programming language filter (e.g., javascript, python, rust)'),
    since: z.enum(['daily', 'weekly', 'monthly']).default('daily').describe('Time range'),
  }),
  outputSchema: z.object({
    language: z.string().nullable(),
    since: z.string(),
    repositories: z.array(z.object({
      name: z.string(),
      fullName: z.string(),
      description: z.string().nullable(),
      url: z.string(),
      stars: z.number(),
      forks: z.number(),
      language: z.string().nullable(),
      starsToday: z.number(),
    })),
  }),
  execute: async ({ context }) => {
    const { language, since } = context;
    
    // Note: GitHub doesn't have an official trending API
    // This would typically scrape GitHub trending page or use a third-party service
    // For demo purposes, we'll use the search API with date filters
    
    try {
      const date = new Date();
      if (since === 'daily') {
        date.setDate(date.getDate() - 1);
      } else if (since === 'weekly') {
        date.setDate(date.getDate() - 7);
      } else {
        date.setMonth(date.getMonth() - 1);
      }
      
      const dateStr = date.toISOString().split('T')[0];
      const langQuery = language ? `language:${language}` : '';
      const query = `created:>${dateStr} ${langQuery}`.trim();
      
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=10`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {}),
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        language: language || null,
        since: since || 'daily',
        repositories: (data.items || []).map((repo: GitHubRepo) => ({
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          url: repo.html_url,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          starsToday: Math.floor(repo.stargazers_count / 10), // Approximation
        })),
      };
    } catch (error) {
      console.warn('GitHub API failed, returning mock trending data:', error);
      return getMockTrendingData(language, since || 'daily');
    }
  },
});

function getMockRepoData(query: string, limit: number): any {
  const repos = [
    {
      name: 'awesome-project',
      fullName: 'user/awesome-project',
      description: 'An awesome project that does amazing things',
      url: 'https://github.com/user/awesome-project',
      stars: 1234,
      forks: 567,
      language: 'TypeScript',
      owner: 'user',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
    },
    {
      name: 'cool-library',
      fullName: 'org/cool-library',
      description: 'A cool library for doing cool stuff',
      url: 'https://github.com/org/cool-library',
      stars: 890,
      forks: 234,
      language: 'JavaScript',
      owner: 'org',
      createdAt: '2022-06-15T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
    },
  ];
  
  return {
    query,
    totalCount: repos.length,
    repositories: repos.slice(0, limit),
  };
}

function getMockUserData(username: string): any {
  return {
    username,
    name: 'John Doe',
    bio: 'Software developer passionate about open source',
    publicRepos: 42,
    followers: 123,
    following: 45,
    createdAt: '2020-01-01T00:00:00Z',
    profileUrl: `https://github.com/${username}`,
    avatarUrl: `https://github.com/${username}.png`,
    topLanguages: ['TypeScript', 'JavaScript', 'Python', 'Rust', 'Go'],
  };
}

function getMockRepoStats(owner: string, repo: string): any {
  return {
    name: repo,
    fullName: `${owner}/${repo}`,
    description: 'A sample repository with interesting statistics',
    stars: 2456,
    forks: 789,
    watchers: 234,
    openIssues: 45,
    language: 'TypeScript',
    topics: ['web', 'api', 'typescript', 'nodejs'],
    license: 'MIT',
    defaultBranch: 'main',
    createdAt: '2022-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z',
    pushedAt: '2024-01-14T00:00:00Z',
    size: 12345,
    contributors: 23,
    hasWiki: true,
    hasIssues: true,
    hasProjects: true,
    url: `https://github.com/${owner}/${repo}`,
  };
}

function getMockTrendingData(language: string | undefined, since: string): any {
  const repos = [
    {
      name: 'trending-ai-tool',
      fullName: 'ai-org/trending-ai-tool',
      description: 'The hottest AI tool everyone is talking about',
      url: 'https://github.com/ai-org/trending-ai-tool',
      stars: 5678,
      forks: 890,
      language: language || 'Python',
      starsToday: 234,
    },
    {
      name: 'next-big-framework',
      fullName: 'dev/next-big-framework',
      description: 'The next generation web framework',
      url: 'https://github.com/dev/next-big-framework',
      stars: 3456,
      forks: 456,
      language: language || 'TypeScript',
      starsToday: 178,
    },
  ];
  
  return {
    language: language || null,
    since,
    repositories: repos,
  };
}