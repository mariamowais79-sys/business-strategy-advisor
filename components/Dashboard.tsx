
import React, { useMemo, useState, useEffect } from 'react';
import { SalesRecord, AdvisoryOutput, RiskLevel, Language } from '../types';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { analyzeSalesData } from '../services/gemini';
import { TrendingUp, DollarSign, Target, ShieldAlert, Zap, Loader2 } from 'lucide-react';

interface DashboardProps {
  data: SalesRecord[];
  language: Language;
  highlightedMetric?: string;
}

const UI_TRANSLATIONS: Record<string, any> = {
  [Language.ENGLISH]: {
    rootCause: "Root Cause", recommendation: "Recommendation", expectedImpact: "Expected Impact",
    strategicAdvisory: "AI Strategic Advisory", risk: "Risk", loading: "Analyzing data...",
    revenue: "Total Revenue", profit: "Net Profit", outstanding: "Total Outstanding",
    discount: "Avg Discount", trendTitle: "Sales Trend vs Targets", mixTitle: "Product Mix",
    monthlyView: "Monthly View"
  },
  [Language.URDU]: {
    rootCause: "بنیادی وجہ", recommendation: "تجویز", expectedImpact: "متوقع اثر",
    strategicAdvisory: "مصنوعی ذہانت کی حکمت عملی", risk: "خطرہ", loading: "تجزیہ ہو رہا ہے...",
    revenue: "کل آمدنی", profit: "خالص منافع", outstanding: "کل واجب الادا",
    discount: "اوسط رعایت", trendTitle: "فروخت کا رجحان", mixTitle: "مصنوعات کا مرکب",
    monthlyView: "ماہانہ"
  },
  [Language.ARABIC]: {
    rootCause: "السبب الجذري", recommendation: "التوصية", expectedImpact: "الأثر المتوقع",
    strategicAdvisory: "الاستشارة الاستراتيجية", risk: "المخاطر", loading: "جاري التحليل...",
    revenue: "إجمالي الإيرادات", profit: "صافي الربح", outstanding: "إجمالي المبالغ المستحقة",
    discount: "متوسط الخصم", trendTitle: "اتجاه المبيعات", mixTitle: "مزيج المنتجات",
    monthlyView: "عرض شهري"
  },
  [Language.AUTO]: {
    rootCause: "Root Cause", recommendation: "Recommendation", expectedImpact: "Expected Impact",
    strategicAdvisory: "Dynamic AI Advisory", risk: "Risk", loading: "Detecting language & analyzing...",
    revenue: "Total Revenue", profit: "Net Profit", outstanding: "Outstanding",
    discount: "Discount Rate", trendTitle: "Performance Trends", mixTitle: "Product Revenue Distribution",
    monthlyView: "Live Data"
  }
};

const Dashboard: React.FC<DashboardProps> = ({ data, language, highlightedMetric }) => {
  const [advisory, setAdvisory] = useState<AdvisoryOutput[]>([]);
  const [loading, setLoading] = useState(false);

  const t = UI_TRANSLATIONS[language] || UI_TRANSLATIONS[Language.AUTO];
  const isRtl = language === Language.ARABIC || language === Language.URDU;

  const stats = useMemo(() => {
    const revenue = data.reduce((acc, curr) => acc + curr.revenue, 0);
    const profit = data.reduce((acc, curr) => acc + (curr.revenue - curr.cost - curr.discount), 0);
    const outstanding = data.reduce((acc, curr) => acc + curr.outstandingAmount, 0);
    const discountRate = (data.reduce((acc, curr) => acc + curr.discount, 0) / (revenue || 1)) * 100;

    const products = data.reduce((acc: any, curr) => {
      acc[curr.product] = (acc[curr.product] || 0) + curr.revenue;
      return acc;
    }, {});

    const trend = data.slice(-12).map((r) => ({
      name: r.date,
      revenue: r.revenue,
      target: r.revenue * 1.1,
    }));

    return {
      revenue, profit, outstanding, discountRate,
      topProducts: Object.entries(products).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5),
      trend
    };
  }, [data]);

  useEffect(() => {
    const fetchAdvisory = async () => {
      if (data.length === 0) return;
      setLoading(true);
      const prompt = `Provide prioritized strategy for the current segment. Language: ${language}.`;
      const result = await analyzeSalesData(data, prompt, language);
      setAdvisory(result);
      setLoading(false);
    };
    fetchAdvisory();
  }, [data, language]);

  const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'];

  return (
    <div className={`space-y-6 md:space-y-8 pb-20 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard 
          title={t.revenue} value={`$${stats.revenue.toLocaleString()}`} 
          icon={<TrendingUp className="w-4 h-4 md:w-5 md:h-5" />} color="text-emerald-600" bg="bg-emerald-50"
          isHighlighted={highlightedMetric === 'revenue'}
        />
        <StatCard 
          title={t.profit} value={`$${stats.profit.toLocaleString()}`} 
          icon={<DollarSign className="w-4 h-4 md:w-5 md:h-5" />} color="text-indigo-600" bg="bg-indigo-50"
          isHighlighted={highlightedMetric === 'profit'}
        />
        <StatCard 
          title={t.outstanding} value={`$${stats.outstanding.toLocaleString()}`} 
          icon={<ShieldAlert className="w-4 h-4 md:w-5 md:h-5" />} color="text-rose-600" bg="bg-rose-50"
          isHighlighted={highlightedMetric === 'outstanding'}
        />
        <StatCard 
          title={t.discount} value={`${stats.discountRate.toFixed(1)}%`} 
          icon={<Zap className="w-4 h-4 md:w-5 md:h-5" />} color="text-amber-600" bg="bg-amber-50"
          isHighlighted={highlightedMetric === 'discount'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className={`flex items-center justify-between mb-4 md:mb-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <h3 className="font-bold text-sm md:text-base text-slate-800">{t.trendTitle}</h3>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">{t.monthlyView}</span>
          </div>
          <div className="h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} reversed={isRtl} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} orientation={isRtl ? 'right' : 'left'} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={3} />
                <Line type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6">{t.mixTitle}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.topProducts} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {stats.topProducts.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {stats.topProducts.map((p, i) => (
              <div key={p.name} className={`flex items-center justify-between text-sm ${isRtl ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <div className="w-2 h-2 rounded-full" style={{backgroundColor: COLORS[i]}} />
                  <span className="text-slate-600 truncate max-w-[120px]">{p.name}</span>
                </div>
                <span className="font-semibold text-slate-800">${p.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <Zap className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xl font-bold text-slate-800">{t.strategicAdvisory}</h3>
          {loading && <div className={`flex items-center gap-2 text-slate-400 text-xs animate-pulse ${isRtl ? 'mr-2' : 'ml-2'}`}><Loader2 className="w-3 h-3 animate-spin" /> {t.loading}</div>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {advisory.length > 0 ? advisory.map((item, idx) => (
            <AdvisoryCard key={idx} item={item} labels={t} isRtl={isRtl} />
          )) : Array.from({length: 3}).map((_, i) => <div key={i} className="h-64 rounded-2xl bg-slate-100 animate-pulse" />)}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; bg: string; isHighlighted?: boolean }> = ({ title, value, icon, color, bg, isHighlighted }) => (
  <div className={`p-4 md:p-6 rounded-2xl shadow-sm border transition-all duration-500 flex items-start gap-3 md:gap-4 ${isHighlighted ? 'ring-4 ring-indigo-500 ring-opacity-50 border-indigo-500 scale-105 bg-indigo-50 shadow-indigo-100' : 'bg-white border-slate-100'}`}>
    <div className={`p-2 md:p-3 rounded-xl ${bg} ${color}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] md:text-sm font-medium text-slate-400 truncate">{title}</p>
      <h4 className="text-lg md:text-2xl font-bold text-slate-800 mt-0.5 md:mt-1 truncate">{value}</h4>
    </div>
  </div>
);

const AdvisoryCard: React.FC<{ item: AdvisoryOutput; labels: any; isRtl: boolean }> = ({ item, labels, isRtl }) => {
  const riskColors = {
    [RiskLevel.LOW]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    [RiskLevel.MEDIUM]: 'bg-amber-50 text-amber-700 border-amber-100',
    [RiskLevel.HIGH]: 'bg-rose-50 text-rose-700 border-rose-100',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full hover:shadow-md transition-shadow">
      <div className={`flex justify-between items-start mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide ${riskColors[item.riskLevel]}`}>{item.riskLevel} {labels.risk}</span>
      </div>
      <h4 className="font-bold text-slate-800 text-lg mb-2 leading-tight">{item.keyInsight}</h4>
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-tighter mb-1">{labels.rootCause}</p>
        <p className="text-sm text-slate-600">{item.rootCause}</p>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-50 space-y-3">
        <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0"><Target className="w-3.5 h-3.5" /></div>
          <div><p className="text-xs font-bold text-slate-800">{labels.recommendation}</p><p className="text-xs text-slate-500">{item.recommendedAction}</p></div>
        </div>
        <div className={`flex items-start gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 shrink-0"><TrendingUp className="w-3.5 h-3.5" /></div>
          <div><p className="text-xs font-bold text-slate-800">{labels.expectedImpact}</p><p className="text-xs text-slate-500">{item.expectedImpact}</p></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
