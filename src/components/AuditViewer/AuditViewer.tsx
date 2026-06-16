import React, { useEffect, useState } from 'react';
import { fetchPRMetadata } from '@/services/githubClient';

interface AuditViewerProps {
  /**
   * The PR hash (SHA) obtained from on‑chain task metadata.
   */
  prHash: string;
}

interface PRData {
  hash: string;
  title: string;
  author: string;
  url: string;
}

export const AuditViewer: React.FC<AuditViewerProps> = ({ prHash }) => {
  const [prData, setPrData] = useState<PRData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchPRMetadata(prHash);
        setPrData(data);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load PR data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [prHash]);

  if (loading) {
    return <div className="text-gray-500">Loading PR information…</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (!prData) {
    return <div className="text-gray-500">No PR data available.</div>;
  }

  const isMatch = prData.hash.toLowerCase() === prHash.toLowerCase();
  const badgeColor = isMatch ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  const badgeLabel = isMatch ? 'Match' : 'Mismatch';

  return (
    <div className="border rounded p-4 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium">GitHub PR Audit</h3>
        <span className={`px-2 py-1 rounded ${badgeColor} text-sm font-semibold`}>{badgeLabel}</span>
      </div>
      <p className="text-sm font-semibold mb-1">
        <a href={prData.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          {prData.title}
        </a>
      </p>
      <p className="text-xs text-gray-600">Author: {prData.author}</p>
      <p className="text-xs text-gray-600 mt-1">Hash: {prData.hash}</p>
    </div>
  );
};

export default AuditViewer;
