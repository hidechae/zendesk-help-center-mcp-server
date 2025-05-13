import * as readline from "node:readline";
import axios from "axios";

// Zendesk API configuration interface
export interface ZendeskConfig {
  subdomain: string;
  email: string;
  apiToken: string;
  defaultLocale?: string;
}

// Zendesk API response types
export interface ZendeskArticle extends Record<string, unknown> {
  id: number;
  url: string;
  html_url: string;
  author_id: number;
  comments_disabled: boolean;
  draft: boolean;
  promoted: boolean;
  position: number;
  vote_sum: number;
  vote_count: number;
  section_id: number;
  created_at: string;
  updated_at: string;
  name: string;
  title: string;
  source_locale: string;
  locale: string;
  outdated: boolean;
  outdated_locales: string[];
  edited_at: string;
  user_segment_id: number | null;
  permission_group_id: number;
  content_tag_ids: number[];
  label_names: string[];
  body?: string; // Make body optional so we can remove it
}

export interface ZendeskSearchResponse {
  results: ZendeskArticle[];
  count: number;
  next_page?: string;
  previous_page?: string;
}

export interface ZendeskArticleResponse {
  article: ZendeskArticle;
}

// Zendesk API client class
export class ZendeskClient {
  private baseUrl: string;
  private config: ZendeskConfig;
  private defaultLocale: string;

  constructor(config: ZendeskConfig) {
    this.config = config;
    this.baseUrl = `https://${config.subdomain}.zendesk.com/api/v2/help_center`;
    this.defaultLocale = config.defaultLocale || "en";
  }

  // Helper function for Zendesk API requests
  async makeRequest<T>(
    url: string,
    params: Record<string, string | number | boolean> = {},
  ): Promise<T> {
    try {
      const response = await axios.get(url, {
        params,
        auth: {
          username: `${this.config.email}/token`,
          password: this.config.apiToken,
        },
      });
      return response.data as T;
    } catch (error) {
      console.error("Request error:", error);
      throw error;
    }
  }

  // Helper function to clean HTML content by removing empty tags and unnecessary attributes
  private cleanHtmlContent(html: string | undefined): string | undefined {
    if (!html) return html;

    // 空のタグを削除する正規表現パターン
    // <p> </p>, <p></p>, <h3> </h3>などの空のタグを削除
    const emptyTagPattern = /<([a-z][a-z0-9]*)[^>]*>\s*<\/\1>/gi;

    // 不要な属性を削除する正規表現パターン
    const styleAttributePattern = /\s+style=["']([^"']*)["']/gi;
    const idAttributePattern = /\s+id=["']([^"']*)["']/gi;
    const classAttributePattern = /\s+class=["']([^"']*)["']/gi;
    const targetAttributePattern = /\s+target=["']([^"']*)["']/gi;
    const borderAttributePattern = /\s+border=["']([^"']*)["']/gi;

    // 不要なタグを削除してテキストのみを残すパターン
    const spanTagPattern = /<span[^>]*>([\s\S]*?)<\/span>/gi;
    const fontTagPattern = /<font[^>]*>([\s\S]*?)<\/font>/gi;

    // 連続した空白行を削除
    const multipleLineBreaksPattern = /\n\s*\n/g;

    // 空のタグを削除
    let cleanedHtml = html.replace(emptyTagPattern, "");

    // 不要な属性を削除
    cleanedHtml = cleanedHtml.replace(styleAttributePattern, "");
    cleanedHtml = cleanedHtml.replace(idAttributePattern, "");
    cleanedHtml = cleanedHtml.replace(classAttributePattern, "");
    cleanedHtml = cleanedHtml.replace(targetAttributePattern, "");
    cleanedHtml = cleanedHtml.replace(borderAttributePattern, "");

    // 不要なタグを削除してテキストのみを残す
    cleanedHtml = cleanedHtml.replace(spanTagPattern, "$1");
    cleanedHtml = cleanedHtml.replace(fontTagPattern, "$1");

    // 連続した空白行を1つの改行に置換
    cleanedHtml = cleanedHtml.replace(multipleLineBreaksPattern, "\n");

    // テーブルのセル内の余分な改行を削除
    cleanedHtml = cleanedHtml.replace(/<td>\s*<p>(.*?)<\/p>\s*<\/td>/gi, "<td>$1</td>");

    return cleanedHtml;
  }

  // Search for articles
  async searchArticles(params: {
    query: string;
    locale?: string;
    page?: number;
    per_page?: number;
  }): Promise<ZendeskSearchResponse> {
    const { query, locale = this.defaultLocale, page = 1, per_page = 20 } = params;
    const searchUrl = `${this.baseUrl}/articles/search.json`;

    const data = await this.makeRequest<ZendeskSearchResponse>(searchUrl, {
      query,
      locale,
      page,
      per_page,
    });

    // Filter results to only include specified fields
    if (data.results && Array.isArray(data.results)) {
      data.results = data.results.map((article) => {
        // Only keep the specified fields
        const filteredArticle: Partial<ZendeskArticle> = {
          id: article.id,
          url: article.url,
          html_url: article.html_url,
          author_id: article.author_id,
          created_at: article.created_at,
          updated_at: article.updated_at,
          title: article.title,
          label_names: article.label_names,
        };
        return filteredArticle as ZendeskArticle;
      });
    }

    return data;
  }

  // Get article details
  async getArticle(params: {
    id: number;
    locale?: string;
  }): Promise<ZendeskArticleResponse> {
    const { id, locale = this.defaultLocale } = params;
    const articleUrl = `${this.baseUrl}/articles/${id}.json`;

    const data = await this.makeRequest<ZendeskArticleResponse>(articleUrl, { locale });

    // Filter article to only include specified fields
    if (data.article) {
      const filteredArticle: Partial<ZendeskArticle> = {
        id: data.article.id,
        url: data.article.url,
        html_url: data.article.html_url,
        author_id: data.article.author_id,
        created_at: data.article.created_at,
        updated_at: data.article.updated_at,
        title: data.article.title,
        label_names: data.article.label_names,
        body: this.cleanHtmlContent(data.article.body),
      };

      data.article = filteredArticle as ZendeskArticle;
    }

    return data;
  }

  // Interactive chat loop
  async chatLoop(): Promise<void> {
    console.log("\nZendesk Help Center client started!");
    console.log("Enter a command ('quit' to exit):");
    console.log("- search <keyword> [locale] [page] [per_page]");
    console.log("- article <articleID> [locale]");

    // Use Node.js readline to process console input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = () => {
      rl.question("\nCommand: ", async (input: string) => {
        try {
          if (input.toLowerCase() === "quit") {
            rl.close();
            return;
          }

          const parts = input.split(" ");
          const command = parts[0].toLowerCase();

          if (command === "search") {
            if (parts.length < 2) {
              console.log("Usage: search <keyword> [locale] [page] [per_page]");
            } else {
              const query = parts[1];
              const locale = parts[2] || this.defaultLocale;
              const page = Number.parseInt(parts[3]) || 1;
              const per_page = Number.parseInt(parts[4]) || 20;

              const results = await this.searchArticles({
                query,
                locale,
                page,
                per_page,
              });
              console.log(JSON.stringify(results, null, 2));
            }
          } else if (command === "article") {
            if (parts.length < 2) {
              console.log("Usage: article <articleID> [locale]");
            } else {
              const id = Number.parseInt(parts[1]);
              const locale = parts[2] || this.defaultLocale;
              const article = await this.getArticle({ id, locale });
              console.log(JSON.stringify(article, null, 2));
            }
          } else {
            console.log("Unknown command. Available commands: search, article, quit");
          }

          askQuestion();
        } catch (error) {
          console.error("\nError:", error);
          askQuestion();
        }
      });
    };

    askQuestion();
  }
}
