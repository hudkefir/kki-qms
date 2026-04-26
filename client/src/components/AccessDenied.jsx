import React from 'react';
import { ShieldOff, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccessDenied({ requiredRole, message }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        <div className="w-16 h-16 bg-navy-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-8 h-8 text-navy-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-200 mb-2">Access Restricted</h2>
        <p className="text-gray-400 mb-6">
          {message || "You don't have permission to view this page."}
        </p>
        {requiredRole && (
          <p className="text-sm text-navy-400 mb-6">
            This page requires <span className="font-semibold text-navy-300">{requiredRole}</span> access.
          </p>
        )}
        <p className="text-sm text-gray-500 mb-8">
          If you believe you should have access, contact your administrator.
        </p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy-600 hover:bg-navy-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
