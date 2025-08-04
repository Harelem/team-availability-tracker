'use client';

import { useState } from 'react';
import { 
  Crown,
  Building2,
  ChevronRight, 
  Loader2,
  BarChart3,
  TrendingUp,
  Zap,
  ArrowLeft
} from 'lucide-react';
import { COOUser } from '@/types';

interface ExecutiveLoginScreenProps {
  cooUsers: COOUser[];
  loading: boolean;
  onCOOAccess: (cooUser: COOUser) => void;
}

export default function ExecutiveLoginScreen({ 
  cooUsers, 
  loading, 
  onCOOAccess 
}: ExecutiveLoginScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCOOAccess = (cooUser: COOUser) => {
    setSelectedId(`coo-${cooUser.id}`);
    setTimeout(() => {
      onCOOAccess(cooUser);
    }, 150);
  };

  const handleBackToTeams = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 shadow-2xl max-w-md w-full text-center border border-white/20">
          <Loader2 className="w-12 h-12 text-white mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Executive Access...</h2>
          <p className="text-white/80">Preparing your executive dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 sm:p-8 shadow-2xl max-w-4xl w-full border border-white/20">
        {/* Back to Teams Link */}
        <div className="mb-6">
          <button
            onClick={handleBackToTeams}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Back to Team Access</span>
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Crown className="text-yellow-300 w-12 h-12" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Executive Dashboard
          </h1>
          <p className="text-white/80 text-sm sm:text-base">
            Access company-wide analytics and strategic insights
          </p>
        </div>

        {/* Executive Access Section */}
        {cooUsers.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="w-16 h-16 text-white/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Executive Access Configured</h3>
            <p className="text-white/60 mb-6">
              Executive dashboard access has not been set up yet. Please contact your system administrator.
            </p>
            <button
              onClick={handleBackToTeams}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-lg transition-colors touch-target"
            >
              Back to Team Access
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {cooUsers.map((cooUser) => {
              const isSelected = selectedId === `coo-${cooUser.id}`;
              
              return (
                <button
                  key={cooUser.id}
                  onClick={() => handleCOOAccess(cooUser)}
                  disabled={isSelected}
                  className={`
                    w-full group relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6 text-left transition-all duration-200 hover:bg-white/20 hover:scale-[1.02] active:scale-95 touch-target-xl
                    ${isSelected ? 'bg-white/20 scale-95' : ''}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-7 h-7 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-white mb-1">
                          {cooUser.name}
                        </h3>
                        <p className="text-white/80 text-sm mb-2">
                          {cooUser.hebrew} • {cooUser.title}
                        </p>
                        <p className="text-white/70 text-sm mb-4">
                          {cooUser.description}
                        </p>
                        
                        {/* Executive Features Preview */}
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2 text-white/80">
                            <BarChart3 className="w-4 h-4" />
                            <span>Company-wide Analytics</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <TrendingUp className="w-4 h-4" />
                            <span>Cross-team Insights</span>
                          </div>
                          <div className="flex items-center gap-2 text-white/80">
                            <Zap className="w-4 h-4" />
                            <span>Strategic Planning</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 shrink-0">
                      {isSelected ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                      )}
                    </div>
                  </div>
                  
                  {/* Executive Dashboard Preview */}
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-2xl font-bold text-white">Real-time</div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">Analytics</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">Cross-team</div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">Insights</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">Strategic</div>
                        <div className="text-xs text-white/70 uppercase tracking-wider">Planning</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Executive Features Highlight */}
        <div className="mt-8 p-6 bg-white/5 rounded-lg border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Executive Dashboard Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/70">
            <div className="flex items-start gap-2">
              <BarChart3 className="w-4 h-4 mt-0.5 text-blue-300" />
              <span>Real-time company metrics and KPIs</span>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 mt-0.5 text-green-300" />
              <span>Team performance comparisons</span>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 mt-0.5 text-yellow-300" />
              <span>Strategic planning tools</span>
            </div>
            <div className="flex items-start gap-2">
              <Crown className="w-4 h-4 mt-0.5 text-purple-300" />
              <span>Executive reporting capabilities</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}