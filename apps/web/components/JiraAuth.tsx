import React, { useState } from 'react';
import { jiraAuth } from '../lib/auth';

export const JiraAuth: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const authUrl = await jiraAuth.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
      setLoading(false);
    }
  };

  return (
    <button onClick={handleConnect} disabled={loading}>
      {loading ? 'Connecting...' : 'Connect Jira'}
    </button>
  );
};
