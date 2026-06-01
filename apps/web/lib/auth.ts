export const jiraAuth = {
  async getAuthUrl(): Promise<string> {
    const response = await fetch('/api/jira/auth/url');
    const data = await response.json();
    return data.authUrl;
  },

  async fetchRequirements(accessToken: string): Promise<any> {
    const response = await fetch(`/api/jira/requirements?accessToken=${accessToken}`);
    return response.json();
  },

  async fetchRequirement(issueId: string, accessToken: string): Promise<any> {
    const response = await fetch(`/api/jira/requirements/${issueId}?accessToken=${accessToken}`);
    return response.json();
  },
};
