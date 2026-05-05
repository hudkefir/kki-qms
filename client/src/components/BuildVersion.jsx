import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function BuildVersion() {
  const [version, setVersion] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/version`)
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(() => {}); // silently fail — non-critical
  }, []);

  if (!version || version.commit === 'dev') return null;

  const shortDate = version.buildTime
    ? new Date(version.buildTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <p className="text-[10px] text-navy-500 mt-1 px-1">
      Build {version.commit}{shortDate ? ` \u00B7 ${shortDate}` : ''}
    </p>
  );
}
