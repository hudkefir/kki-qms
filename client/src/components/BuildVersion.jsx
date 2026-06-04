import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function BuildVersion() {
  const [version, setVersion] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/version`)
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(() => {});
  }, []);

  if (!version || version.commit === 'dev') return null;

  const shortDate = version.buildTime && version.buildTime !== 'unknown'
    ? new Date(version.buildTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';

  const label = version.build
    ? `Build #${version.build} · ${version.commit}${shortDate ? ` · ${shortDate}` : ''}`
    : `Build ${version.commit}${shortDate ? ` · ${shortDate}` : ''}`;

  const fullInfo = `Build #${version.build || '?'} · ${version.commit} · ${version.buildTime}`;

  const handleClick = () => {
    navigator.clipboard.writeText(fullInfo).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <button
      onClick={handleClick}
      className="text-[10px] font-mono text-navy-500 hover:text-navy-300 transition-colors cursor-pointer mt-1 px-1 text-left"
      title="Click to copy build info"
    >
      {copied ? 'Copied!' : label}
    </button>
  );
}
