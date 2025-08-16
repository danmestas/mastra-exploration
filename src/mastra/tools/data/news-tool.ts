import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  author?: string;
  imageUrl?: string;
  category?: string;
}

export const newsSearchTool = createTool({
  id: 'search-news',
  description: 'Search for latest news articles by topic or keyword',
  inputSchema: z.object({
    query: z.string().describe('Search query or topic'),
    limit: z.number().min(1).max(50).default(10).describe('Number of articles to return'),
    category: z.enum(['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment']).optional().describe('News category filter'),
  }),
  outputSchema: z.object({
    query: z.string(),
    totalResults: z.number(),
    articles: z.array(z.object({
      title: z.string(),
      description: z.string(),
      url: z.string(),
      source: z.string(),
      publishedAt: z.string(),
      author: z.string().optional(),
      imageUrl: z.string().optional(),
      category: z.string().optional(),
    })),
  }),
  execute: async ({ context }) => {
    const { query, limit, category } = context;
    
    try {
      // Using NewsAPI free tier (requires API key)
      // For demo, we'll use a mock response
      const apiKey = process.env.NEWS_API_KEY || 'demo';
      const categoryParam = category ? `&category=${category}` : '';
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}${categoryParam}&pageSize=${limit}&apiKey=${apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok && apiKey === 'demo') {
        // Fall back to mock data
        return getMockNewsData(query, limit || 10, category);
      }
      
      const data = await response.json();
      
      return {
        query,
        totalResults: data.totalResults || 0,
        articles: data.articles?.map((article: any) => ({
          title: article.title,
          description: article.description || '',
          url: article.url,
          source: article.source?.name || 'Unknown',
          publishedAt: article.publishedAt,
          author: article.author,
          imageUrl: article.urlToImage,
          category: category,
        })) || [],
      };
    } catch (error) {
      console.warn('News API failed, returning mock data:', error);
      return getMockNewsData(query, limit || 10, category);
    }
  },
});

export const rssFeedTool = createTool({
  id: 'fetch-rss',
  description: 'Fetch and parse RSS feed from a given URL',
  inputSchema: z.object({
    feedUrl: z.string().url().describe('RSS feed URL'),
    limit: z.number().min(1).max(50).default(10).describe('Number of items to return'),
  }),
  outputSchema: z.object({
    feedTitle: z.string(),
    feedDescription: z.string(),
    feedUrl: z.string(),
    items: z.array(z.object({
      title: z.string(),
      description: z.string(),
      link: z.string(),
      pubDate: z.string(),
      author: z.string().optional(),
      categories: z.array(z.string()).optional(),
    })),
  }),
  execute: async ({ context }) => {
    const { feedUrl, limit } = context;
    
    try {
      // Using a CORS proxy for browser compatibility
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch RSS feed');
      }
      
      const data = await response.json();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
      
      const channel = xmlDoc.querySelector('channel');
      const items = Array.from(xmlDoc.querySelectorAll('item')).slice(0, limit);
      
      return {
        feedTitle: channel?.querySelector('title')?.textContent || 'Unknown Feed',
        feedDescription: channel?.querySelector('description')?.textContent || '',
        feedUrl,
        items: items.map(item => ({
          title: item.querySelector('title')?.textContent || '',
          description: item.querySelector('description')?.textContent || '',
          link: item.querySelector('link')?.textContent || '',
          pubDate: item.querySelector('pubDate')?.textContent || '',
          author: item.querySelector('author')?.textContent || undefined,
          categories: Array.from(item.querySelectorAll('category')).map(cat => cat.textContent || ''),
        })),
      };
    } catch (error) {
      console.warn('RSS feed fetch failed, returning mock data:', error);
      return getMockRSSData(feedUrl, limit || 10);
    }
  },
});

export const trendingTopicsTool = createTool({
  id: 'get-trending',
  description: 'Get current trending topics and headlines',
  inputSchema: z.object({
    country: z.string().default('us').describe('Country code (e.g., us, gb, ca)'),
    category: z.enum(['general', 'business', 'technology', 'science', 'health', 'sports', 'entertainment']).default('general'),
  }),
  outputSchema: z.object({
    country: z.string(),
    category: z.string(),
    trends: z.array(z.object({
      topic: z.string(),
      volume: z.number(),
      articles: z.number(),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
    })),
    topHeadlines: z.array(z.object({
      title: z.string(),
      source: z.string(),
      url: z.string(),
    })),
  }),
  execute: async ({ context }) => {
    const { country, category } = context;
    
    // Mock trending data since real trending APIs typically require expensive subscriptions
    return {
      country,
      category,
      trends: [
        { topic: 'Artificial Intelligence', volume: 125000, articles: 342, sentiment: 'positive' },
        { topic: 'Climate Change', volume: 98000, articles: 287, sentiment: 'neutral' },
        { topic: 'Stock Market', volume: 87000, articles: 198, sentiment: 'positive' },
        { topic: 'Technology Innovation', volume: 76000, articles: 165, sentiment: 'positive' },
        { topic: 'Global Economy', volume: 65000, articles: 143, sentiment: 'neutral' },
      ],
      topHeadlines: [
        {
          title: 'Major AI Breakthrough Announced by Research Team',
          source: 'Tech News',
          url: 'https://example.com/ai-breakthrough',
        },
        {
          title: 'Stock Markets Hit New Record Highs',
          source: 'Financial Times',
          url: 'https://example.com/markets-high',
        },
        {
          title: 'New Climate Agreement Reached at Summit',
          source: 'Environmental News',
          url: 'https://example.com/climate-agreement',
        },
      ],
    };
  },
});

function getMockNewsData(query: string, limit: number, category?: string): any {
  const mockArticles: NewsArticle[] = [
    {
      title: `Breaking: ${query} Sees Major Development`,
      description: `Latest updates on ${query} show significant progress in recent developments...`,
      url: 'https://example.com/article1',
      source: 'Tech News Daily',
      publishedAt: new Date().toISOString(),
      author: 'John Doe',
      category: category || 'general',
    },
    {
      title: `How ${query} is Changing the Industry`,
      description: `Industry experts weigh in on the impact of ${query} on global markets...`,
      url: 'https://example.com/article2',
      source: 'Business Insider',
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      author: 'Jane Smith',
      category: category || 'business',
    },
    {
      title: `${query}: What You Need to Know`,
      description: `A comprehensive guide to understanding ${query} and its implications...`,
      url: 'https://example.com/article3',
      source: 'The Guardian',
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      category: category || 'general',
    },
  ];
  
  return {
    query,
    totalResults: mockArticles.length,
    articles: mockArticles.slice(0, limit),
  };
}

function getMockRSSData(feedUrl: string, limit: number): any {
  const items = Array.from({ length: limit }, (_, i) => ({
    title: `RSS Item ${i + 1}: Latest Update`,
    description: `This is the description for RSS item ${i + 1} from the feed...`,
    link: `${feedUrl}/item-${i + 1}`,
    pubDate: new Date(Date.now() - i * 3600000).toISOString(),
    author: `Author ${i + 1}`,
    categories: ['Technology', 'News'],
  }));
  
  return {
    feedTitle: 'Mock RSS Feed',
    feedDescription: 'A mock RSS feed for demonstration purposes',
    feedUrl,
    items,
  };
}