import axios, { AxiosInstance } from 'axios';

export interface JiraConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

export class JiraService {
  private config: JiraConfig;
  private client: AxiosInstance;

  constructor(config: JiraConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
    });
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: 'read:jira-work manage:jira-project',
    });
    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error}`);
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    try {
      const response = await axios.post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error}`);
    }
  }

  async getIssues(accessToken: string, jql?: string): Promise<any> {
    try {
      const response = await this.client.get('/rest/api/3/search', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          jql: jql || 'type = Requirement',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch issues: ${error}`);
    }
  }

  async getIssueDetails(accessToken: string, issueId: string): Promise<any> {
    try {
      const response = await this.client.get(`/rest/api/3/issues/${issueId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch issue details: ${error}`);
    }
  }
}
