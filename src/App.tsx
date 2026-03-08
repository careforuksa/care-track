/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  Calendar, 
  Plus, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  LayoutDashboard,
  ChevronRight,
  Search,
  Filter,
  FileText,
  Menu,
  X,
  Bell,
  AlertCircle,
  Clock,
  BarChart3,
  Download,
  Printer,
  TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { translations } from './translations';

type Company = {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  payment_period: 'weekly' | 'monthly' | 'custom';
  last_payment_date: string | null;
  next_payment_date: string | null;
  patient_count?: number;
};

type Package = {
  id: number;
  patient_id: number;
  patient_name: string;
  service_id: number;
  service_name: string;
  total_sessions: number;
  used_sessions: number;
  status: 'active' | 'completed';
  created_at: string;
};

type SessionLog = {
  id: number;
  package_id: number;
  session_date: string;
  notes: string;
};

type Patient = {
  id: number;
  name: string;
  company_id: number;
  company_name: string;
  status: string;
  created_at: string;
};

type Visit = {
  id: number;
  patient_id: number;
  patient_name: string;
  company_name: string;
  service_id: number;
  service_name: string;
  visit_date: string;
  amount: number;
  is_paid: number;
  notes: string;
};

type Service = {
  id: number;
  name: string;
};

type Stats = {
  total_patients: number;
  pending_amount: number;
  paid_amount: number;
};

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'companies' | 'visits' | 'packages' | 'alerts' | 'reports' | 'settings'>('dashboard');
  const [stats, setStats] = useState<Stats>({ total_patients: 0, pending_amount: 0, paid_amount: 0 });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Date Filter for Stats
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [companyStats, setCompanyStats] = useState<any[]>([]);
  const [dueCompanies, setDueCompanies] = useState<Company[]>([]);

  // Forms
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);

  // Edit States
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [selectedCompanyForReport, setSelectedCompanyForReport] = useState<Company | null>(null);
  
  // Visits Filters
  const [visitSearch, setVisitSearch] = useState('');
  const [visitCompanyFilter, setVisitCompanyFilter] = useState<string>('all');
  const [visitStatusFilter, setVisitStatusFilter] = useState<string>('all');
  const [visitServiceFilter, setVisitServiceFilter] = useState<string>('all');
  const [visitStartDate, setVisitStartDate] = useState('');
  const [visitEndDate, setVisitEndDate] = useState('');
  const [showVisitFilters, setShowVisitFilters] = useState(false);

  useEffect(() => {
    fetchData();
    if (activeTab === 'companies') fetchCompanyStats();
  }, [activeTab, startDate, endDate]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = companies.filter(company => {
      // If user specified a next payment date, use it
      if (company.next_payment_date) {
        const nextDate = new Date(company.next_payment_date);
        nextDate.setHours(0, 0, 0, 0);
        return today >= nextDate;
      }

      // Fallback to period logic
      if (!company.last_payment_date) return true;
      const lastPaid = new Date(company.last_payment_date);
      const diffTime = Math.abs(today.getTime() - lastPaid.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (company.payment_period === 'weekly') {
        return diffDays >= 7;
      } else if (company.payment_period === 'monthly') {
        return diffDays >= 30;
      }
      return false;
    });
    setDueCompanies(due);
  }, [companies]);

  const fetchCompanyStats = async () => {
    try {
      const res = await fetch(`/api/stats/companies?start_date=${startDate}&end_date=${endDate}`);
      setCompanyStats(await res.json());
    } catch (error) {
      console.error("Error fetching company stats:", error);
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, patientsRes, companiesRes, visitsRes, servicesRes, packagesRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/patients'),
        fetch('/api/companies'),
        fetch('/api/visits'),
        fetch('/api/services'),
        fetch('/api/packages')
      ]);
      
      setStats(await statsRes.json());
      setPatients(await patientsRes.json());
      setCompanies(await companiesRes.json());
      setVisits(await visitsRes.json());
      setServices(await servicesRes.json());
      setPackages(await packagesRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleTogglePaid = async (visitId: number, currentStatus: number) => {
    try {
      await fetch(`/api/visits/${visitId}/pay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paid: !currentStatus })
      });
      fetchData();
    } catch (error) {
      console.error("Error updating payment status:", error);
    }
  };

  const handleMarkCompanyPaid = async (company: Company) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      await fetch(`/api/companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...company,
          last_payment_date: today
        })
      });
      fetchData();
    } catch (error) {
      console.error("Error marking company as paid:", error);
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id 
          ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
          : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {activeTab === id && <motion.div layoutId="active" className={lang === 'ar' ? "mr-auto" : "ml-auto"}><ChevronRight size={16} className={lang === 'ar' ? "rotate-180" : ""} /></motion.div>}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans" dir={lang === 'ar' ? "rtl" : "ltr"}>
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white">
            <LayoutDashboard size={20} />
          </div>
          <h1 className="font-bold text-lg">{t.appName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="p-2 text-xs font-bold bg-slate-100 rounded-lg"
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-0 h-screen bg-white border-l border-slate-200 transition-all duration-300 z-40
          ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-0 lg:w-20 -translate-x-full lg:translate-x-0 overflow-hidden'}
        `}>
          <div className="p-6 flex items-center gap-3 border-b border-slate-100 mb-6">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <LayoutDashboard size={24} />
            </div>
            {isSidebarOpen && <h1 className="font-bold text-xl tracking-tight">{t.appName}</h1>}
          </div>

          <nav className="px-4 space-y-2">
            <SidebarItem id="dashboard" icon={LayoutDashboard} label={t.dashboard} />
            <SidebarItem id="patients" icon={Users} label={t.patients} />
            <SidebarItem id="companies" icon={Building2} label={t.companies} />
            <SidebarItem id="visits" icon={Calendar} label={t.visits} />
            <SidebarItem id="packages" icon={FileText} label={t.packages} />
            <SidebarItem id="reports" icon={BarChart3} label={t.reports} />
            <div className="relative">
              <SidebarItem id="alerts" icon={Bell} label={t.alerts} />
              {dueCompanies.length > 0 && (
                <span className={`absolute ${lang === 'ar' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white`}>
                  {dueCompanies.length}
                </span>
              )}
            </div>
            <SidebarItem id="settings" icon={Filter} label={t.settings} />
          </nav>

          <div className="absolute bottom-8 px-6 w-full">
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="w-full mb-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              {lang === 'ar' ? 'Switch to English' : 'التحويل للعربية'}
            </button>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">{t.currentUser}</p>
              <p className="text-sm font-semibold">{t.careProvider}</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {activeTab === 'dashboard' && t.overview}
                {activeTab === 'patients' && t.patientManagement}
                {activeTab === 'companies' && t.referralCompanies}
                {activeTab === 'visits' && t.visitsBilling}
                {activeTab === 'packages' && t.treatmentPackages}
                {activeTab === 'reports' && t.financialReports}
                {activeTab === 'alerts' && t.paymentAlerts}
                {activeTab === 'settings' && t.systemSettings}
              </h2>
              <p className="text-slate-500 mt-1">
                {new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div className="flex gap-3">
              {activeTab === 'patients' && (
                <button 
                  onClick={() => setShowAddPatient(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-100"
                >
                  <Plus size={18} />
                  <span>{t.newPatient}</span>
                </button>
              )}
              {activeTab === 'visits' && (
                <button 
                  onClick={() => setShowAddVisit(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-100"
                >
                  <Plus size={18} />
                  <span>{t.newVisit}</span>
                </button>
              )}
              {activeTab === 'companies' && (
                <button 
                  onClick={() => setShowAddCompany(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-100"
                >
                  <Plus size={18} />
                  <span>{t.newCompany}</span>
                </button>
              )}
            </div>
          </header>

          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard 
                  label={t.totalPatients} 
                  value={stats.total_patients} 
                  icon={Users} 
                  color="blue" 
                />
                <StatCard 
                  label={t.pendingAmount} 
                  value={`${stats.pending_amount?.toLocaleString() || 0} ${t.sar}`} 
                  icon={DollarSign} 
                  color="amber" 
                />
                <StatCard 
                  label={t.collectedAmount} 
                  value={`${stats.paid_amount?.toLocaleString() || 0} ${t.sar}`} 
                  icon={CheckCircle2} 
                  color="emerald" 
                />
              </div>

              {/* Recent Visits Table */}
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="font-bold text-lg">{t.recentVisits}</h3>
                  <button onClick={() => setActiveTab('visits')} className="text-emerald-600 text-sm font-medium hover:underline">{t.viewAll}</button>
                </div>
                <div className="overflow-x-auto">
                  <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                    <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">{t.patient}</th>
                        <th className="px-6 py-4 font-semibold">{t.service}</th>
                        <th className="px-6 py-4 font-semibold">{t.company}</th>
                        <th className="px-6 py-4 font-semibold">{t.date}</th>
                        <th className="px-6 py-4 font-semibold">{t.amount}</th>
                        <th className="px-6 py-4 font-semibold">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visits.slice(0, 5).map((visit) => (
                        <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 font-medium">{visit.patient_name}</td>
                          <td className="px-6 py-4 text-emerald-600 font-medium">{visit.service_name}</td>
                          <td className="px-6 py-4 text-slate-600">{visit.company_name || t.direct}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{new Date(visit.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                          <td className="px-6 py-4 font-mono font-semibold">{visit.amount} {t.sar}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              visit.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {visit.is_paid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {visit.is_paid ? t.paid : t.pending}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {patients.map((patient) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={patient.id} 
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                      <Users size={24} />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      patient.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {patient.status === 'active' ? t.active : t.inactive}
                    </span>
                  </div>
          <h4 className="text-lg font-bold mb-1">{patient.name}</h4>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-4">
            <Building2 size={14} />
            <span>{patient.company_name || t.direct}</span>
          </div>
          <div className="pt-4 border-t border-slate-50 flex justify-between items-center text-xs text-slate-400">
            <span>{t.joinedIn}: {new Date(patient.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
            <button 
              onClick={() => setEditingPatient(patient)}
              className="text-emerald-600 font-bold hover:underline"
            >
              {t.edit}
            </button>
          </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'visits' && (
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-4">
                  <div className="relative w-full lg:w-96">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="بحث باسم المريض أو الشركة..." 
                      value={visitSearch}
                      onChange={(e) => setVisitSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    <button 
                      onClick={() => setShowVisitFilters(!showVisitFilters)}
                      className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-xl transition-all font-bold ${
                        showVisitFilters ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Filter size={18} />
                      <span>تصفية متقدمة</span>
                    </button>
                    <button 
                      onClick={() => {
                        const filtered = visits.filter(v => {
                          const matchesSearch = v.patient_name.toLowerCase().includes(visitSearch.toLowerCase()) || 
                                              (v.company_name || '').toLowerCase().includes(visitSearch.toLowerCase());
                          const matchesCompany = visitCompanyFilter === 'all' || 
                                              (visitCompanyFilter === 'direct' && !v.company_id) ||
                                              v.company_id?.toString() === visitCompanyFilter;
                          const matchesStatus = visitStatusFilter === 'all' || 
                                              (visitStatusFilter === 'paid' && v.is_paid) || 
                                              (visitStatusFilter === 'unpaid' && !v.is_paid);
                          const matchesService = visitServiceFilter === 'all' || v.service_id?.toString() === visitServiceFilter;
                          
                          const vDate = new Date(v.visit_date);
                          const matchesStart = !visitStartDate || vDate >= new Date(visitStartDate);
                          const matchesEnd = !visitEndDate || vDate <= new Date(visitEndDate);
                          
                          return matchesSearch && matchesCompany && matchesStatus && matchesService && matchesStart && matchesEnd;
                        });

                        const data = filtered.map(v => ({
                          'المريض': v.patient_name,
                          'الخدمة': v.service_name,
                          'الشركة': v.company_name || 'مباشر',
                          'التاريخ': new Date(v.visit_date).toLocaleDateString('ar-SA'),
                          'المبلغ': v.amount,
                          'الحالة': v.is_paid ? 'تم الدفع' : 'معلق'
                        }));
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "الزيارات");
                        XLSX.writeFile(wb, `تقرير_الزيارات_${new Date().toLocaleDateString()}.xlsx`);
                      }}
                      className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors font-bold"
                    >
                      <Download size={18} />
                      <span>تصدير للمحاسب</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showVisitFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-slate-50 border-b border-slate-100"
                    >
                      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">من تاريخ</label>
                          <input 
                            type="date" 
                            value={visitStartDate}
                            onChange={(e) => setVisitStartDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">إلى تاريخ</label>
                          <input 
                            type="date" 
                            value={visitEndDate}
                            onChange={(e) => setVisitEndDate(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">الشركة</label>
                          <select 
                            value={visitCompanyFilter}
                            onChange={(e) => setVisitCompanyFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="all">كل الشركات</option>
                            <option value="direct">مباشر (بدون شركة)</option>
                            {companies.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">الحالة</label>
                          <select 
                            value={visitStatusFilter}
                            onChange={(e) => setVisitStatusFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="all">كل الحالات</option>
                            <option value="paid">تم الدفع</option>
                            <option value="unpaid">معلق</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">نوع الخدمة</label>
                          <select 
                            value={visitServiceFilter}
                            onChange={(e) => setVisitServiceFilter(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20"
                          >
                            <option value="all">كل الخدمات</option>
                            {services.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                          <button 
                            onClick={() => {
                              setVisitSearch('');
                              setVisitCompanyFilter('all');
                              setVisitStatusFilter('all');
                              setVisitServiceFilter('all');
                              setVisitStartDate('');
                              setVisitEndDate('');
                            }}
                            className="text-sm font-bold text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            إعادة تعيين الفلاتر
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 font-semibold">المريض</th>
                        <th className="px-6 py-4 font-semibold">الخدمة</th>
                        <th className="px-6 py-4 font-semibold">الشركة</th>
                        <th className="px-6 py-4 font-semibold">التاريخ</th>
                        <th className="px-6 py-4 font-semibold">المبلغ</th>
                        <th className="px-6 py-4 font-semibold">الحالة</th>
                        <th className="px-6 py-4 font-semibold">إجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visits.filter(v => {
                        const matchesSearch = v.patient_name.toLowerCase().includes(visitSearch.toLowerCase()) || 
                                            (v.company_name || '').toLowerCase().includes(visitSearch.toLowerCase());
                        const matchesCompany = visitCompanyFilter === 'all' || 
                                            (visitCompanyFilter === 'direct' && !v.company_id) ||
                                            v.company_id?.toString() === visitCompanyFilter;
                        const matchesStatus = visitStatusFilter === 'all' || 
                                            (visitStatusFilter === 'paid' && v.is_paid) || 
                                            (visitStatusFilter === 'unpaid' && !v.is_paid);
                        
                        const vDate = new Date(v.visit_date);
                        const matchesStart = !visitStartDate || vDate >= new Date(visitStartDate);
                        const matchesEnd = !visitEndDate || vDate <= new Date(visitEndDate);
                        const matchesService = visitServiceFilter === 'all' || v.service_id?.toString() === visitServiceFilter;
                        
                        return matchesSearch && matchesCompany && matchesStatus && matchesService && matchesStart && matchesEnd;
                      }).map((visit) => (
                      <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium">{visit.patient_name}</td>
                        <td className="px-6 py-4 text-emerald-600 font-medium">{visit.service_name}</td>
                        <td className="px-6 py-4 text-slate-600">{visit.company_name || 'مباشر'}</td>
                        <td className="px-6 py-4 text-slate-500 text-sm">{new Date(visit.visit_date).toLocaleDateString('ar-SA')}</td>
                        <td className="px-6 py-4 font-mono font-semibold">{visit.amount} ر.س</td>
                        <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">{visit.notes || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            visit.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {visit.is_paid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {visit.is_paid ? 'تم الدفع' : 'معلق'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleTogglePaid(visit.id, visit.is_paid)}
                              className={`text-xs font-bold px-3 py-1 rounded-lg transition-colors ${
                                visit.is_paid ? 'text-slate-400 hover:text-amber-600' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {visit.is_paid ? 'تراجع' : 'تأكيد'}
                            </button>
                            <button 
                              onClick={() => setEditingVisit(visit)}
                              className="text-xs font-bold text-slate-400 hover:text-emerald-600"
                            >
                              تعديل
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

          {activeTab === 'companies' && (
            <div className="space-y-6">
              {/* Date Filter for Companies */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">من تاريخ</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-slate-700 mb-1">إلى تاريخ</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold">
                  إحصائيات الفترة المحددة
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company) => {
                  const stats = companyStats.find(s => s.company_name === company.name);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={company.id} 
                      className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative group"
                    >
                      <button 
                        onClick={() => setEditingCompany(company)}
                        className="absolute left-4 top-4 p-2 text-slate-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        تعديل
                      </button>
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                        <Building2 size={24} />
                      </div>
                      <h4 className="text-lg font-bold mb-1">{company.name}</h4>
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">عدد المرضى:</span>
                          <span className="font-bold text-emerald-600">{stats?.patient_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">عدد الزيارات:</span>
                          <span className="font-bold">{stats?.visit_count || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t border-slate-50 pt-2">
                          <span className="text-slate-500">إجمالي المبالغ:</span>
                          <span className="font-bold">{stats?.total_amount || 0} ر.س</span>
                        </div>
                      </div>

                      {/* Patient List for this company */}
                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <div className="flex gap-2 mb-4">
                          <button 
                            onClick={() => setSelectedCompanyForReport(company)}
                            className="flex-1 bg-emerald-50 text-emerald-700 font-bold py-2 rounded-xl hover:bg-emerald-100 transition-colors text-sm"
                          >
                            عرض التقرير
                          </button>
                          <button 
                            onClick={() => setEditingCompany(company)}
                            className="px-4 bg-slate-50 text-slate-600 font-bold py-2 rounded-xl hover:bg-slate-100 transition-colors text-sm"
                          >
                            تعديل
                          </button>
                        </div>
                        
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Users size={14} />
                          قائمة المرضى
                        </h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                          {patients.filter(p => p.company_id === company.id).length > 0 ? (
                            patients.filter(p => p.company_id === company.id).map(patient => (
                              <div key={patient.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                                <span className="font-medium text-slate-700">{patient.name}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                  patient.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {patient.status === 'active' ? 'نشط' : 'غير نشط'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic text-center py-2">لا يوجد مرضى مضافين</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
          {activeTab === 'reports' && (
            <ReportsPage 
              startDate={startDate} 
              endDate={endDate} 
              setStartDate={setStartDate} 
              setEndDate={setEndDate} 
              companies={companies}
              lang={lang}
            />
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-lg">إدارة أنواع الخدمات</h3>
                  <p className="text-slate-500 text-sm">أضف أو احذف أنواع الخدمات المتاحة في النظام</p>
                </div>
                <div className="p-6 space-y-6">
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const name = (form.elements.namedItem('serviceName') as HTMLInputElement).value;
                      await fetch('/api/services', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name })
                      });
                      form.reset();
                      fetchData();
                    }}
                    className="flex gap-2"
                  >
                    <input 
                      name="serviceName"
                      required
                      placeholder="اسم الخدمة الجديدة (مثلاً: زيارة أخصائي مختبر)"
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500"
                    />
                    <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                      إضافة
                    </button>
                  </form>

                  <div className="space-y-2">
                    {services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-medium">{service.name}</span>
                        <button 
                          onClick={async () => {
                            if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
                              await fetch(`/api/services/${service.id}`, { method: 'DELETE' });
                              fetchData();
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'packages' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">برامج العلاج (الجلسات)</h3>
                  <p className="text-slate-500">تتبع عدد الجلسات المتبقية لكل مريض</p>
                </div>
                <button 
                  onClick={() => setShowAddPackage(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus size={20} />
                  برنامج جديد
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={pkg.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedPackage(pkg)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                        <FileText size={24} />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        pkg.used_sessions >= pkg.total_sessions ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {pkg.used_sessions >= pkg.total_sessions ? 'مكتمل' : 'نشط'}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold mb-1">{pkg.patient_name}</h4>
                    <p className="text-sm text-slate-500 mb-4">{pkg.service_name}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <span>التقدم</span>
                        <span>{Math.round((pkg.used_sessions / pkg.total_sessions) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${(pkg.used_sessions / pkg.total_sessions) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-slate-500">الجلسات:</span>
                        <span className="font-bold text-slate-700">{pkg.used_sessions} / {pkg.total_sessions}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {packages.length === 0 && (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                  <p className="text-slate-400 italic">لا توجد برامج علاجية مسجلة حالياً</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">تنبيهات الدفع المستحق</h3>
                  <p className="text-slate-500">الشركات التي تجاوزت فترة الدفع المحددة لها</p>
                </div>
                <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold">
                  <AlertCircle size={20} />
                  <span>{dueCompanies.length} شركات مستحقة</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dueCompanies.map((company) => {
                  const lastPaid = company.last_payment_date ? new Date(company.last_payment_date).toLocaleDateString('ar-SA') : 'لم يتم الدفع مسبقاً';
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={company.id}
                      className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                          <Clock size={24} />
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          company.payment_period === 'weekly' ? 'bg-blue-100 text-blue-700' : 
                          company.payment_period === 'monthly' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {company.payment_period === 'weekly' ? (lang === 'ar' ? 'دورة أسبوعية' : 'Weekly') : 
                           company.payment_period === 'monthly' ? (lang === 'ar' ? 'دورة شهرية' : 'Monthly') : (lang === 'ar' ? 'تاريخ مخصص' : 'Custom')}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold mb-1">{company.name}</h4>
                      <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                        <Calendar size={14} />
                        {t.lastPayment}: {lastPaid}
                      </p>
                      {company.next_payment_date && (
                        <p className="text-sm text-amber-600 font-bold mb-4 flex items-center gap-1">
                          <AlertCircle size={14} />
                          {t.dueDate}: {new Date(company.next_payment_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      )}
                      
                      <div className="space-y-3">
                        <button 
                          onClick={() => handleMarkCompanyPaid(company)}
                          className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={18} />
                          {t.confirmPayment}
                        </button>
                        <button 
                          onClick={() => setSelectedCompanyForReport(company)}
                          className="w-full bg-slate-50 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          {t.viewDetailsInvoices}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {dueCompanies.length === 0 && (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                  <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-4">
                    <CheckCircle2 size={40} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-800">{t.noDuePayments}</h4>
                  <p className="text-slate-500">{t.allCommitted}</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddPatient && (
          <Modal title={t.newPatient} onClose={() => setShowAddPatient(false)}>
            <AddPatientForm 
              companies={companies} 
              onSuccess={() => { setShowAddPatient(false); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {editingPatient && (
          <Modal title={t.edit} onClose={() => setEditingPatient(null)}>
            <AddPatientForm 
              companies={companies} 
              initialData={editingPatient}
              onSuccess={() => { setEditingPatient(null); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {showAddVisit && (
          <Modal title={t.newVisit} onClose={() => setShowAddVisit(false)}>
            <AddVisitForm 
              patients={patients} 
              services={services}
              onSuccess={() => { setShowAddVisit(false); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {editingVisit && (
          <Modal title={t.edit} onClose={() => setEditingVisit(null)}>
            <AddVisitForm 
              patients={patients} 
              services={services}
              initialData={editingVisit}
              onSuccess={() => { setEditingVisit(null); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {showAddCompany && (
          <Modal title={t.newCompany} onClose={() => setShowAddCompany(false)}>
            <AddCompanyForm 
              onSuccess={() => { setShowAddCompany(false); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {editingCompany && (
          <Modal title={t.edit} onClose={() => setEditingCompany(null)}>
            <AddCompanyForm 
              initialData={editingCompany}
              onSuccess={() => { setEditingCompany(null); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {showAddPackage && (
          <Modal title={t.newPackage} onClose={() => setShowAddPackage(false)}>
            <AddPackageForm 
              patients={patients} 
              services={services}
              onSuccess={() => { setShowAddPackage(false); fetchData(); }} 
              lang={lang}
            />
          </Modal>
        )}
        {selectedPackage && (
          <Modal title={t.viewFullDetails} onClose={() => setSelectedPackage(null)}>
            <PackageDetails 
              pkg={selectedPackage}
              onUpdate={() => fetchData()} 
              lang={lang}
            />
          </Modal>
        )}
        {selectedCompanyForReport && (
          <Modal 
            title={`${t.performanceReport}: ${selectedCompanyForReport.name}`} 
            onClose={() => setSelectedCompanyForReport(null)}
            maxWidth="max-w-xl"
          >
            <CompanyReport 
              company={selectedCompanyForReport} 
              onMarkPaid={() => {
                handleMarkCompanyPaid(selectedCompanyForReport);
                setSelectedCompanyForReport(null);
              }}
              lang={lang}
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: any, icon: any, color: 'emerald' | 'amber' | 'blue' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600 shadow-emerald-100',
    amber: 'bg-amber-50 text-amber-600 shadow-amber-100',
    blue: 'bg-blue-50 text-blue-600 shadow-blue-100'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-slate-500 text-sm font-medium">{label}</p>
        <p className="text-2xl font-bold tracking-tight mt-1">{value}</p>
      </div>
    </div>
  );
}

function CompanyReport({ company, onMarkPaid, lang }: { company: Company, onMarkPaid: () => void, lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanyVisits = async () => {
      try {
        const res = await fetch(`/api/visits?company_id=${company.id}`);
        setVisits(await res.json());
      } catch (error) {
        console.error("Error fetching company visits:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyVisits();
  }, [company.id]);

  const unpaidVisits = visits.filter(v => !v.is_paid);
  const totalUnpaid = unpaidVisits.reduce((sum, v) => sum + v.amount, 0);

  if (loading) return <div className="p-8 text-center text-slate-500">{lang === 'ar' ? 'جاري تحميل التقرير...' : 'Loading report...'}</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-800 text-lg">{company.name}</h4>
          <p className="text-sm text-slate-500">{company.contact_person} - {company.phone}</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-bold text-slate-400 uppercase mb-1">{t.pendingAmount}</div>
          <div className="text-2xl font-black text-rose-600">{totalUnpaid.toLocaleString()} {t.sar}</div>
        </div>
      </div>

      <div className="space-y-3">
        <h5 className="font-bold text-slate-700 flex items-center gap-2">
          <FileText size={18} className="text-emerald-600" />
          {t.viewDetailsInvoices} ({unpaidVisits.length})
        </h5>
        
        <div className="max-h-80 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl">
          <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'} text-sm`}>
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-600">{t.patient}</th>
                <th className="px-4 py-3 font-bold text-slate-600">{t.date}</th>
                <th className="px-4 py-3 font-bold text-slate-600">{t.amount}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {unpaidVisits.map(visit => (
                <tr key={visit.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium">{visit.patient_name}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(visit.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{visit.amount} {t.sar}</td>
                </tr>
              ))}
              {unpaidVisits.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">{t.noDuePayments}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3 pt-4 print:hidden">
        <button 
          onClick={onMarkPaid}
          disabled={unpaidVisits.length === 0}
          className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
        >
          <CheckCircle2 size={20} />
          {t.confirmPayment}
        </button>
        <button 
          onClick={() => window.print()}
          className="px-6 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-2"
        >
          <Printer size={20} />
          {t.printReport}
        </button>
      </div>
    </div>
  );
}
function ReportsPage({ startDate, endDate, setStartDate, setEndDate, companies, lang }: { 
  startDate: string, 
  endDate: string, 
  setStartDate: (v: string) => void, 
  setEndDate: (v: string) => void,
  companies: Company[],
  lang: 'ar' | 'en'
}) {
  const t = translations[lang];
  const [stats, setStats] = useState<any[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [viewType, setViewType] = useState<'summary' | 'detailed'>('summary');

  const fetchStats = async () => {
    setLoading(true);
    try {
      let url = `/api/stats/companies?start_date=${startDate}&end_date=${endDate}`;
      if (selectedCompany !== 'all') {
        url += `&company_id=${selectedCompany}`;
      }
      const res = await fetch(url);
      setStats(await res.json());

      // Also fetch detailed visits for the detailed view
      let visitsUrl = `/api/visits?start_date=${startDate}&end_date=${endDate}`;
      if (selectedCompany !== 'all') {
        visitsUrl += `&company_id=${selectedCompany}`;
      }
      const vRes = await fetch(visitsUrl);
      setVisits(await vRes.json());
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate, selectedCompany]);

  const exportToExcel = () => {
    const data = viewType === 'summary' ? stats.map(s => ({
      [t.company]: s.company_name,
      [t.totalPatients]: s.patient_count,
      [t.totalVisits]: s.visit_count,
      [`${t.totalAmounts} (${t.sar})`]: s.total_amount || 0
    })) : visits.map(v => ({
      [t.patient]: v.patient_name,
      [t.service]: v.service_name,
      [t.company]: v.company_name || t.direct,
      [t.date]: new Date(v.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US'),
      [t.amount]: v.amount,
      [t.status]: v.is_paid ? t.paid : t.pending
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.reports);
    XLSX.writeFile(wb, `${t.reports}_${selectedCompany === 'all' ? t.allCompanies : t.company}_${startDate}_${t.toDate}_${endDate}.xlsx`);
  };

  const totalAmount = stats.reduce((sum, s) => sum + (s.total_amount || 0), 0);
  const totalVisits = stats.reduce((sum, s) => sum + (s.visit_count || 0), 0);
  const totalPatients = stats.reduce((sum, s) => sum + (s.patient_count || 0), 0);

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 print:hidden">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setViewType('summary')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewType === 'summary' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.summaryView}
            </button>
            <button 
              onClick={() => setViewType('detailed')}
              className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewType === 'detailed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.detailedView}
            </button>
          </div>
          <div className="flex gap-2 w-full lg:w-auto">
            <button 
              onClick={exportToExcel}
              className="flex-1 lg:flex-none bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Download size={18} />
              {t.exportExcel}
            </button>
            <button 
              onClick={() => window.print()}
              className="flex-1 lg:flex-none bg-slate-100 text-slate-600 px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
            >
              <Printer size={18} />
              {t.printReport}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.targetCompany}</label>
            <select 
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            >
              <option value="all">{t.allCompanies}</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.fromDate}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.toDate}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={Users} label={t.totalPatients} value={totalPatients} color="blue" />
        <StatCard icon={TrendingUp} label={t.totalVisits} value={totalVisits} color="amber" />
        <StatCard icon={DollarSign} label={t.totalAmounts} value={`${totalAmount.toLocaleString()} ${t.sar}`} color="emerald" />
      </div>

      {viewType === 'detailed' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">{t.performanceAnalysis}</h3>
            <span className="text-sm text-slate-400">{t.period}: {startDate} {t.toDate} {endDate}</span>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead className="bg-slate-50 text-slate-500 text-sm uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t.patient}</th>
                  <th className="px-6 py-4 font-semibold">{t.service}</th>
                  <th className="px-6 py-4 font-semibold">{t.company}</th>
                  <th className="px-6 py-4 font-semibold">{t.date}</th>
                  <th className="px-6 py-4 font-semibold">{t.amount}</th>
                  <th className="px-6 py-4 font-semibold">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visits.map((v, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-700">{v.patient_name}</td>
                    <td className="px-6 py-4 text-emerald-600">{v.service_name}</td>
                    <td className="px-6 py-4 text-slate-600">{v.company_name || t.direct}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(v.visit_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</td>
                    <td className="px-6 py-4 font-bold text-slate-700">{v.amount?.toLocaleString() || 0} {t.sar}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        v.is_paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {v.is_paid ? t.paid : t.pending}
                      </span>
                    </td>
                  </tr>
                ))}
                {visits.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">{t.noData}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {viewType === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
              <BarChart3 className="text-emerald-500" size={20} />
              {selectedCompany === 'all' ? t.revenueDistribution : t.performanceAnalysis}
            </h4>
            <div className="space-y-6">
              {selectedCompany === 'all' ? (
                stats.slice(0, 5).map((s, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-600">{s.company_name}</span>
                      <span className="text-slate-400">{((s.total_amount / (totalAmount || 1)) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(s.total_amount / (totalAmount || 1)) * 100}%` }}
                        className="bg-emerald-500 h-full"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-4xl font-black text-emerald-600 mb-2">100%</div>
                  <p className="text-slate-500 text-sm">{t.performanceReport}</p>
                  <div className="w-full max-w-xs bg-slate-100 h-4 rounded-full mt-6 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-full" />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <TrendingUp size={40} className="text-emerald-600" />
            </div>
            <div>
              <h4 className="font-bold text-xl text-slate-800">{t.performanceReport}</h4>
              <p className="text-slate-500 text-sm max-w-xs">{t.growthMessage}</p>
            </div>
            <button 
              onClick={() => setViewType('detailed')}
              className="text-emerald-600 font-bold hover:underline"
            >
              {t.viewFullDetails}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function Modal({ title, children, onClose, maxWidth = "max-w-md" }: { title: string, children: React.ReactNode, onClose: () => void, maxWidth?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} relative z-10 overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-xl">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function AddPatientForm({ companies, onSuccess, initialData, lang }: { companies: Company[], onSuccess: () => void, initialData?: Patient, lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [name, setName] = useState(initialData?.name || '');
  const [companyId, setCompanyId] = useState(initialData?.company_id?.toString() || '');
  const [status, setStatus] = useState(initialData?.status || 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = initialData ? `/api/patients/${initialData.id}` : '/api/patients';
    const method = initialData ? 'PUT' : 'POST';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, company_id: companyId || null, status })
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.patientName}</label>
        <input 
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          placeholder={lang === 'ar' ? "أدخل اسم المريض بالكامل" : "Enter full patient name"}
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.company}</label>
        <select 
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        >
          <option value="">{t.direct}</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {initialData && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t.status}</label>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          >
            <option value="active">{lang === 'ar' ? 'نشط' : 'Active'}</option>
            <option value="inactive">{lang === 'ar' ? 'غير نشط' : 'Inactive'}</option>
          </select>
        </div>
      )}
      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
        {initialData ? t.update : t.save}
      </button>
    </form>
  );
}

function AddVisitForm({ patients, services, onSuccess, initialData, lang }: { patients: Patient[], services: Service[], onSuccess: () => void, initialData?: Visit, lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [patientId, setPatientId] = useState(initialData?.patient_id?.toString() || '');
  const [serviceId, setServiceId] = useState(initialData?.service_id?.toString() || '');
  const [date, setDate] = useState(initialData?.visit_date || new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isPaid, setIsPaid] = useState(initialData?.is_paid === 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = initialData ? `/api/visits/${initialData.id}` : '/api/visits';
    const method = initialData ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        patient_id: patientId, 
        service_id: serviceId,
        visit_date: date, 
        amount: parseFloat(amount), 
        notes,
        is_paid: isPaid
      })
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.patient}</label>
        <select 
          required
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        >
          <option value="">{lang === 'ar' ? 'اختر المريض' : 'Select Patient'}</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.company_name || t.direct})</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.service}</label>
        <select 
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        >
          <option value="">{lang === 'ar' ? 'اختر نوع الخدمة' : 'Select Service Type'}</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.date}</label>
        <input 
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.amount} ({t.sar})</label>
        <input 
          type="number"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          placeholder="0.00"
        />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.notes}</label>
        <textarea 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none h-24 resize-none"
          placeholder={lang === 'ar' ? "أي ملاحظات إضافية عن الجلسة..." : "Any additional notes about the session..."}
        />
      </div>
      {initialData && (
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isPaid" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="w-4 h-4 text-emerald-600" />
          <label htmlFor="isPaid" className="text-sm font-bold text-slate-700">{t.paid}</label>
        </div>
      )}
      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
        {initialData ? t.update : t.save}
      </button>
    </form>
  );
}

function AddCompanyForm({ onSuccess, initialData, lang }: { onSuccess: () => void, initialData?: Company, lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [name, setName] = useState(initialData?.name || '');
  const [contact, setContact] = useState(initialData?.contact_person || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [period, setPeriod] = useState(initialData?.payment_period || 'monthly');
  const [nextDate, setNextDate] = useState(initialData?.next_payment_date || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = initialData ? `/api/companies/${initialData.id}` : '/api/companies';
    const method = initialData ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        contact_person: contact, 
        phone, 
        payment_period: period,
        last_payment_date: initialData?.last_payment_date,
        next_payment_date: nextDate || null
      })
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.companyName}</label>
        <input 
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          placeholder={lang === 'ar' ? "أدخل اسم الشركة" : "Enter company name"}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{lang === 'ar' ? 'اسم المسؤول' : 'Contact Person'}</label>
          <input 
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            placeholder={lang === 'ar' ? "اسم الشخص للتواصل" : "Contact person name"}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{lang === 'ar' ? 'رقم الهاتف' : 'Phone'}</label>
          <input 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            placeholder="05xxxxxxxx"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{lang === 'ar' ? 'دورة الدفع' : 'Payment Period'}</label>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'weekly' | 'monthly' | 'custom')}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          >
            <option value="weekly">{lang === 'ar' ? 'أسبوعي' : 'Weekly'}</option>
            <option value="monthly">{lang === 'ar' ? 'شهري' : 'Monthly'}</option>
            <option value="custom">{lang === 'ar' ? 'تاريخ مخصص' : 'Custom'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{lang === 'ar' ? 'تاريخ التنبيه القادم' : 'Next Alert Date'}</label>
          <input 
            type="date"
            value={nextDate}
            onChange={(e) => setNextDate(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>
      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
        {initialData ? t.update : t.save}
      </button>
    </form>
  );
}

function AddPackageForm({ patients, services, onSuccess, lang }: { patients: Patient[], services: Service[], onSuccess: () => void, lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [patientId, setPatientId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [totalSessions, setTotalSessions] = useState('24');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        patient_id: patientId, 
        service_id: serviceId, 
        total_sessions: parseInt(totalSessions) 
      })
    });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.patient}</label>
        <select 
          required
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        >
          <option value="">{lang === 'ar' ? 'اختر المريض' : 'Select Patient'}</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t.service}</label>
        <select 
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        >
          <option value="">{lang === 'ar' ? 'اختر الخدمة' : 'Select Service'}</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{lang === 'ar' ? 'إجمالي عدد الجلسات' : 'Total Sessions'}</label>
        <input 
          type="number"
          required
          value={totalSessions}
          onChange={(e) => setTotalSessions(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
        />
      </div>
      <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors">
        {t.newPackage}
      </button>
    </form>
  );
}

function PackageDetails({ pkg, onUpdate, lang }: { pkg: Package, onUpdate: () => void, lang: 'ar' | 'en' }) {
  const t = translations[lang];
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [pkg.id]);

  const fetchLogs = async () => {
    const res = await fetch(`/api/packages/${pkg.id}/logs`);
    setLogs(await res.json());
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/packages/${pkg.id}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_date: sessionDate, notes })
    });
    setNotes('');
    setShowLogForm(false);
    fetchLogs();
    onUpdate();
  };

  const handleDeleteLog = async (id: number) => {
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this log?')) {
      await fetch(`/api/logs/${id}`, { method: 'DELETE' });
      fetchLogs();
      onUpdate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <h4 className="font-bold text-slate-800">{pkg.service_name}</h4>
          <p className="text-sm text-slate-500">{pkg.patient_name}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-emerald-600">{pkg.used_sessions} / {pkg.total_sessions}</div>
          <div className="text-[10px] text-slate-400 uppercase font-bold">{lang === 'ar' ? 'الجلسات المكتملة' : 'Completed Sessions'}</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="font-bold text-slate-700">{lang === 'ar' ? 'سجل الجلسات' : 'Session Logs'}</h5>
          <button 
            onClick={() => setShowLogForm(!showLogForm)}
            className="text-emerald-600 text-sm font-bold flex items-center gap-1"
          >
            {showLogForm ? (lang === 'ar' ? 'إلغاء' : 'Cancel') : <><Plus size={14} /> {lang === 'ar' ? 'تسجيل جلسة جديدة' : 'Log New Session'}</>}
          </button>
        </div>

        {showLogForm && (
          <motion.form 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleAddLog} 
            className="bg-white p-4 rounded-2xl border-2 border-emerald-100 space-y-3 shadow-sm"
          >
            <input 
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
            <textarea 
              placeholder={lang === 'ar' ? "ملاحظات الجلسة..." : "Session notes..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none h-20 resize-none"
            />
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2 rounded-xl">
              {t.save}
            </button>
          </motion.form>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
          {logs.map((log, index) => (
            <div key={log.id} className="flex items-start justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 font-bold text-xs">
                  {logs.length - index}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-700">{new Date(log.session_date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}</div>
                  {log.notes && <p className="text-xs text-slate-500 mt-1">{log.notes}</p>}
                </div>
              </div>
              <button onClick={() => handleDeleteLog(log.id)} className="text-slate-300 hover:text-rose-500">
                <X size={14} />
              </button>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4 italic">
              {lang === 'ar' ? 'لا توجد جلسات مسجلة بعد' : 'No sessions logged yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
