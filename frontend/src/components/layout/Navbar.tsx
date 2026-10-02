import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  BrainCircuit, 
  Layers, 
  Sliders, 
  Cpu, 
  Database, 
  Bell, 
  Globe,
  Radio
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
  alertCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  alertCount,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Live Monitoring', icon: Activity },
    { id: 'ai-analysis', label: 'AI Explainability', icon: BrainCircuit },
    { id: 'sensor-fusion', label: 'Sensor Fusion', icon: Layers },
    { id: 'simulation', label: 'Simulation Studio', icon: Sliders },
    { id: 'hardware', label: 'ESP32 Gateway', icon: Cpu },
    { id: 'training', label: 'Model Studio', icon: Database },
    { id: 'alerts', label: 'Alerts', icon: Bell, badge: alertCount },
    { id: 'landing', label: 'Overview', icon: Globe },
  ];

  return (
    <nav className="border-b border-industrial-800 bg-industrial-950/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-6 h-6 text-industrial-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-wider text-white font-mono">FlowSentinel</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono font-semibold border border-cyan-500/30">AI v2.0</span>
              </div>
              <p className="text-[10px] text-slate-400 tracking-tight hidden sm:block">Industrial Blockage Early Warning</p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                    isActive
                      ? 'bg-industrial-850 text-cyan-400 border border-cyan-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-industrial-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-industrial-900 border border-industrial-800 text-xs">
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span className="font-mono text-slate-300">
                {isConnected ? 'LIVE WS' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="lg:hidden flex overflow-x-auto pb-2 pt-1 gap-1 border-t border-industrial-800/50 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs whitespace-nowrap font-medium transition-all ${
                  isActive
                    ? 'bg-industrial-850 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
