import React, { useState, useMemo } from 'react';
import { SalesRecord, Language, DashboardState } from './types';
import Dashboard from './components/Dashboard';
import VoiceAssistant from './components/VoiceAssistant';
import DataUploader from './components/DataUploader';
import HomeView from './components/HomeView';
import BusinessSolutions from './components/BusinessSolutions';
import { LayoutDashboard, FileBarChart, PieChart, Users, Globe, Home } from 'lucide-react';
import { BusinessSolution } from './types';

const MOCK_DATA: SalesRecord[] = Array.from({ length: 50 }, (_, i) => ({
  date: `2024-0${(i % 9) + 1}-15`,
  invoiceNo: `INV-${1000 + i}`,
  customerName: ['Acme Corp', 'Global Retail', 'Tech Solutions', 'Peak Systems'][i % 4],
  distributor: ['Distro A', 'Distro B', 'Distro C'][i % 3],
  product: ['Premium Widget', 'Standard Gear', 'Eco Valve', 'Smart Sensor'][i % 4],
  quantity: Math.floor(Math.random() * 100) + 10,
  revenue: Math.floor(Math.random() * 5000) + 1000,
  discount: Math.floor(Math.random() * 500),
  cost: Math.floor(Math.random() * 800) + 200,
  creditDays: [30, 60, 90][i % 3],
  outstandingAmount: Math.floor(Math.random() * 2000),
  region: ['North', 'South', 'East', 'West'][i % 4],
  salesRep: ['Alice', 'Bob', 'Charlie'][i % 3],
}));

const SIDEBAR_LABELS: Record<string, any> = {
  [Language.ENGLISH]: { home: "Home", dash: "Dashboard", reports: "Reports", dist: "Distributors", subtitle: "Sales Intelligence" },
  [Language.SPANISH]: { home: "Inicio", dash: "Tablero", reports: "Informes", dist: "Distribuidores", subtitle: "Inteligencia Comercial" },
  [Language.FRENCH]: { home: "Accueil", dash: "Tableau de bord", reports: "Rapports", dist: "Distributeurs", subtitle: "Intelligence Commerciale" },
  [Language.URDU]: { home: "ہوم", dash: "ڈیش بورڈ", reports: "رپورٹس", dist: "تقسیم کار", subtitle: "سیلز انٹیلی جنس" },
  [Language.ARABIC]: { home: "الرئيسية", dash: "لوحة القيادة", reports: "التقارير", dist: "الموزعون", subtitle: "ذكاء المبيعات" },
  [Language.HINDI]: { home: "होम", dash: "डैशबोर्ड", reports: "रिपोर्ट", dist: "वितरक", subtitle: "बिक्री इंटेलिजेंस" },
  [Language.AUTO]: { home: "Home", dash: "Dashboard", reports: "Reports", dist: "Distributors", subtitle: "Multilingual Advisor" },
};

const App: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesRecord[]>(MOCK_DATA);
  const [language, setLanguage] = useState<Language>(Language.AUTO);
  const [selectedSolution, setSelectedSolution] = useState<BusinessSolution | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    filter: {},
    highlightedMetric: undefined,
    activeTab: 'home'
  });

  const activeTab = dashboardState.activeTab;
  const setActiveTab = (tab: 'home' | 'dashboard' | 'reports' | 'distributors') => {
    setDashboardState(prev => ({ ...prev, activeTab: tab }));
  };

  const filteredData = useMemo(() => {
    return salesData.filter(r => {
      const { region, product, distributor, customer } = dashboardState.filter;
      if (region && r.region !== region) return false;
      if (product && r.product !== product) return false;
      if (distributor && r.distributor !== distributor) return false;
      if (customer && r.customerName !== customer) return false;
      return true;
    });
  }, [salesData, dashboardState.filter]);

  const labels = SIDEBAR_LABELS[language] || SIDEBAR_LABELS[Language.AUTO];
  const isRtl = language === Language.ARABIC || language === Language.URDU;

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${isRtl ? 'flex-row-reverse' : 'flex-row'} flex-col md:flex-row`}>
      {/* Sidebar - Hidden on Mobile */}
      <aside className={`hidden md:flex w-64 bg-white border-slate-200 flex-col ${isRtl ? 'border-l' : 'border-r'} ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6" />
            Business Strategy Advisor
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">{labels.subtitle}</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'home' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Home className="w-4 h-4" /> {labels.home}
          </button>
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <PieChart className="w-4 h-4" /> {labels.dash}
          </button>
          <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <FileBarChart className="w-4 h-4" /> {labels.reports}
          </button>
          <button onClick={() => setActiveTab('distributors')} className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${activeTab === 'distributors' ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Users className="w-4 h-4" /> {labels.dist}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-3 px-4 py-2 text-sm text-slate-600 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <Globe className="w-4 h-4" />
            <span className="truncate max-w-[100px]">{language}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-auto pb-20 md:pb-0" dir={isRtl ? 'rtl' : 'ltr'}>
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-base md:text-lg font-semibold text-slate-800 capitalize">
              {activeTab === 'home' ? labels.home : activeTab === 'dashboard' ? labels.dash : activeTab === 'reports' ? labels.reports : labels.dist}
            </h2>
            {Object.keys(dashboardState.filter).length > 0 && (
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                Filtered: {Object.values(dashboardState.filter).filter(Boolean).join(', ')}
                <button onClick={() => setDashboardState(prev => ({ ...prev, filter: {} }))} className="hover:text-indigo-900 ml-1">×</button>
              </span>
            )}
          </div>
          <div className={`flex items-center gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <DataUploader onDataLoaded={setSalesData} />
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">JD</div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {activeTab === 'home' ? (
            <HomeView 
              language={language} 
              onStartVoice={() => setIsVoiceActive(true)} 
              onSelectSolution={setSelectedSolution} 
            />
          ) : (
            <Dashboard 
              data={filteredData} 
              language={language} 
              highlightedMetric={dashboardState.highlightedMetric} 
            />
          )}
        </div>

        <VoiceAssistant 
          language={language} 
          dataContext={JSON.stringify(salesData.slice(0, 50))} 
          onUpdateDashboard={setDashboardState}
          externalActive={isVoiceActive}
          onExternalClose={() => setIsVoiceActive(false)}
        />

        <BusinessSolutions 
          isOpen={!!selectedSolution} 
          onClose={() => setSelectedSolution(null)} 
          solution={selectedSolution} 
        />

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 px-2 z-30">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">{labels.home}</span>
          </button>
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <PieChart className="w-5 h-5" />
            <span className="text-[10px] font-medium">{labels.dash}</span>
          </button>
          <div className="w-12" /> {/* Spacer for central Mic */}
          <button onClick={() => setActiveTab('reports')} className={`flex flex-col items-center gap-1 ${activeTab === 'reports' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <FileBarChart className="w-5 h-5" />
            <span className="text-[10px] font-medium">{labels.reports}</span>
          </button>
          <button onClick={() => setActiveTab('distributors')} className={`flex flex-col items-center gap-1 ${activeTab === 'distributors' ? 'text-indigo-600' : 'text-slate-400'}`}>
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">{labels.dist}</span>
          </button>
        </nav>
      </main>
    </div>
  );
};

export default App;