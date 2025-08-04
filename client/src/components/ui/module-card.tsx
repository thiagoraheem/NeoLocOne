import React from 'react';
import { Module } from '@shared/schema';
import { ExternalLink } from 'lucide-react';

interface ModuleCardProps {
  module: Module;
  onClick?: (module: Module) => void;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(module);
    } else {
      // Default behavior: open module in new tab
      window.open(`http://${module.endpoint}`, '_blank');
    }
  };

  return (
    <div 
      className="module-card group"
      onClick={handleClick}
      data-testid={`module-card-${module.name}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${module.color}`}>
          <i className={`${module.icon} text-xl`}></i>
        </div>
        <div className="flex items-center space-x-2">
          {module.isActive ? (
            <span className="bg-neoloc-secondary text-white text-xs px-2 py-1 rounded-full font-medium" data-testid={`status-${module.name}`}>
              Active
            </span>
          ) : (
            <span className="bg-gray-400 text-white text-xs px-2 py-1 rounded-full font-medium" data-testid={`status-${module.name}`}>
              Inactive
            </span>
          )}
          <ExternalLink className="text-gray-400 text-sm" />
        </div>
      </div>
      
      <h4 className="font-semibold text-neoloc-text mb-2" data-testid={`title-${module.name}`}>
        {module.displayName}
      </h4>
      
      <p className="text-gray-600 text-sm mb-4 line-clamp-2" data-testid={`description-${module.name}`}>
        {module.description}
      </p>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500" data-testid={`port-${module.name}`}>
          Port: {module.port}
        </span>
        <span className="text-neoloc-primary font-medium group-hover:underline">
          Open Module →
        </span>
      </div>
    </div>
  );
};
