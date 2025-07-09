'use client';

import { ChevronRight, Home, Users, User } from 'lucide-react';
import { Team, TeamMember } from '@/types';

interface BreadcrumbItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}

interface BreadcrumbNavigationProps {
  selectedTeam: Team | null;
  selectedUser: TeamMember | null;
  onNavigateToTeamSelection: () => void;
  onNavigateToMemberSelection: () => void;
}

export default function BreadcrumbNavigation({
  selectedTeam,
  selectedUser,
  onNavigateToTeamSelection,
  onNavigateToMemberSelection
}: BreadcrumbNavigationProps) {
  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Team Selection',
      icon: <Home className="w-4 h-4" />,
      onClick: onNavigateToTeamSelection,
      isActive: !selectedTeam
    }
  ];

  if (selectedTeam) {
    breadcrumbs.push({
      label: selectedTeam.name,
      icon: <Users className="w-4 h-4" />,
      onClick: selectedUser ? onNavigateToMemberSelection : undefined,
      isActive: selectedTeam && !selectedUser
    });
  }

  if (selectedUser) {
    breadcrumbs.push({
      label: selectedUser.name,
      icon: <User className="w-4 h-4" />,
      isActive: true
    });
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 mb-4">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
          )}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
              breadcrumb.isActive
                ? 'bg-blue-100 text-blue-700 font-medium'
                : breadcrumb.onClick
                ? 'hover:bg-gray-100 cursor-pointer text-gray-600'
                : 'text-gray-500'
            }`}
            onClick={breadcrumb.onClick}
          >
            {breadcrumb.icon}
            <span className="truncate max-w-[150px] sm:max-w-none">
              {breadcrumb.label}
            </span>
          </div>
        </div>
      ))}
    </nav>
  );
}