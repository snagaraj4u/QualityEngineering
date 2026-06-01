import axios, { AxiosInstance } from 'axios';

export interface QMetryConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
}

export interface Defect {
  defectId?: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assignee?: string;
}

export class QMetryService {
  private config: QMetryConfig;
  private client: AxiosInstance;

  constructor(config: QMetryConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });
  }

  async createDefect(defect: Defect): Promise<any> {
    try {
      const response = await this.client.post('/defects', defect);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to create defect: ${error}`);
    }
  }

  async getDefect(defectId: string): Promise<any> {
    try {
      const response = await this.client.get(`/defects/${defectId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch defect: ${error}`);
    }
  }

  async updateDefect(defectId: string, defect: Defect): Promise<any> {
    try {
      const response = await this.client.put(`/defects/${defectId}`, defect);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update defect: ${error}`);
    }
  }

  async listDefects(): Promise<any> {
    try {
      const response = await this.client.get('/defects');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list defects: ${error}`);
    }
  }
}
