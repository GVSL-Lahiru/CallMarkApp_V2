/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Image as ImageIcon, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Plus, 
  Upload,
  ChevronDown,
  PhoneCall,
  User,
  MapPin,
  StickyNote,
  MoreHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, MarkingStatus, STATUS_COLORS } from './types';

const STORAGE_KEY = 'calling_marking_data';

export default function App() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<MarkingStatus | 'All'>('All');
  const [isImporting, setIsImporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setCustomers(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved data', e);
      }
    }
  }, []);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      // Skip header row and map to Customer objects
      const newCustomers: Customer[] = data.slice(1).map((row) => ({
        id: crypto.randomUUID(),
        name: String(row[0] || ''),
        address: String(row[1] || ''),
        city: String(row[2] || ''),
        district: String(row[3] || ''),
        phone1: String(row[4] || ''),
        phone2: String(row[5] || ''),
        note: String(row[6] || ''),
        extra: String(row[7] || ''),
        status: 'None' as MarkingStatus,
        answeredPhone: 'None' as const
      })).filter(c => c.name || c.phone1);

      setCustomers(prev => [...prev, ...newCustomers]);
      setIsImporting(false);
    };
    reader.readAsBinaryString(file);
  };

  const updateStatus = (id: string, status: MarkingStatus) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const updateNote = (id: string, note: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, note } : c));
  };

  const updateAnsweredPhone = (id: string, type: '1st Number' | '2nd Number') => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== id) return c;
      let newValue: '1st Number' | '2nd Number' = type;
      if (type === '1st Number' && c.answeredPhone === '2nd Number') {
        newValue = '2nd Number';
      } else if (type === '2nd Number') {
        newValue = '2nd Number';
      }
      return { ...c, answeredPhone: newValue };
    }));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const deleteData = () => {
    setCustomers([]);
    localStorage.removeItem(STORAGE_KEY);
    setShowDeleteConfirm(false);
  };

  const downloadExcel = async () => {
    if (customers.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Customers');

    // Add headers
    const headers = ['Name', 'Address', 'City', 'District', 'Phone 1', 'Phone 2', 'Note', 'Extra', 'Status'];
    worksheet.addRow(headers);

    // Add data and styling
    customers.forEach((c) => {
      const extraValue = c.answeredPhone !== 'None' 
        ? (c.extra ? `${c.extra} | Answered: ${c.answeredPhone}` : `Answered: ${c.answeredPhone}`)
        : c.extra;
        
      const row = worksheet.addRow([
        c.name, c.address, c.city, c.district, c.phone1, c.phone2, c.note, extraValue, c.status
      ]);

      if (c.status !== 'None') {
        const color = STATUS_COLORS[c.status].excel;
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: color }
          };
        });
      }
    });

    // Auto-size columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Calling_Marking_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone1.includes(searchTerm) ||
        c.phone2.includes(searchTerm) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'All' || c.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [customers, searchTerm, filterStatus]);

  const progress = useMemo(() => {
    if (customers.length === 0) return 0;
    const marked = customers.filter(c => c.status !== 'None').length;
    return Math.round((marked / customers.length) * 100);
  }, [customers]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <img 
                src="https://storage.googleapis.com/static-content-prod/file-7501755131338166272.png" 
                alt="CallMark Logo" 
                className="w-8 h-8 rounded-lg object-cover"
                referrerPolicy="no-referrer"
              />
              Calling & Marking
            </h1>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <span>{customers.filter(c => c.status !== 'None').length} / {customers.length} Marked</span>
              <div className="w-32 h-2 bg-stone-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-green-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <span className="w-8 text-right">{progress}%</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input 
                type="text"
                placeholder="Search by name, phone, or city..."
                className="w-full pl-10 pr-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <select 
                  className="pl-10 pr-8 py-2 bg-stone-100 border-none rounded-xl text-sm appearance-none focus:ring-2 focus:ring-green-500 transition-all"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <option value="All">All Status ({customers.length})</option>
                  <option value="Answered">Answered ({customers.filter(c => c.status === 'Answered').length})</option>
                  <option value="Not Answered">Not Answered ({customers.filter(c => c.status === 'Not Answered').length})</option>
                  <option value="Not Answered 2">Not Answered 2 ({customers.filter(c => c.status === 'Not Answered 2').length})</option>
                  <option value="Canceled">Canceled ({customers.filter(c => c.status === 'Canceled').length})</option>
                  <option value="Whatsapp Photo">Whatsapp Photo ({customers.filter(c => c.status === 'Whatsapp Photo').length})</option>
                  <option value="Scheduled">Scheduled ({customers.filter(c => c.status === 'Scheduled').length})</option>
                  <option value="None">Unmarked ({customers.filter(c => c.status === 'None').length})</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 overflow-y-auto">
        {customers.length === 0 ? (
          <div className="h-[60vh] flex flex-col items-center justify-center text-stone-400 gap-4">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center">
              <Upload className="w-10 h-10" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-stone-600">No customers loaded</p>
              <p className="text-sm">Import an Excel sheet to get started</p>
            </div>
            <label className="mt-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-green-200 transition-all flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Import Excel
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer) => (
                <CustomerCard 
                  key={customer.id} 
                  customer={customer} 
                  onStatusChange={(status) => updateStatus(customer.id, status)} 
                  onNoteChange={(note) => updateNote(customer.id, note)}
                  onAnsweredPhoneChange={(type) => updateAnsweredPhone(customer.id, type)}
                  onDelete={() => deleteCustomer(customer.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-200 p-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-semibold transition-all"
          >
            <Trash2 className="w-5 h-5" />
            <span className="hidden sm:inline">Delete All</span>
          </button>
          
          <div className="flex gap-3">
            <label className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-all">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Insert More</span>
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
            </label>
            
            <button 
              onClick={downloadExcel}
              disabled={customers.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white rounded-xl font-semibold shadow-lg shadow-green-100 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Download Excel</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Delete All Data?</h2>
              <p className="text-stone-500 mb-6">This action cannot be undone. All customer details and markings will be permanently removed.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteData}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-100 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CustomerCardProps {
  customer: Customer;
  onStatusChange: (status: MarkingStatus) => void;
  onNoteChange: (note: string) => void;
  onAnsweredPhoneChange: (type: '1st Number' | '2nd Number') => void;
  onDelete: () => void;
  key?: React.Key;
}

function CustomerCard({ customer, onStatusChange, onNoteChange, onAnsweredPhoneChange, onDelete }: CustomerCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusInfo = STATUS_COLORS[customer.status];

  const qtyOptions = [
    "1 item", "2 items", "3 items", "4 items", 
    "chain only", "pendant only", "chain with bracelet"
  ];

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${customer.status !== 'None' ? `border-${statusInfo.bg.split('-')[1]}-200 shadow-sm` : 'border-stone-100'}`}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header Info */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${customer.status !== 'None' ? statusInfo.bg : 'bg-stone-100'} ${customer.status !== 'None' ? statusInfo.text : 'text-stone-400'}`}>
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900">{customer.name || 'Unnamed Customer'}</h3>
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <MapPin className="w-3 h-3" />
                <span>{customer.city}{customer.district ? `, ${customer.district}` : ''}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {customer.status !== 'None' && (
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.text}`}>
                {customer.status}
              </span>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200"
              >
                <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">Delete Customer?</h2>
                <p className="text-stone-500 mb-6">Are you sure you want to remove {customer.name || 'this customer'}? This cannot be undone.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      onDelete();
                      setShowDeleteConfirm(false);
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-100 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Details */}
        <div className="grid grid-cols-1 gap-2 text-sm text-stone-600 bg-stone-50/50 p-3 rounded-xl">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-stone-400 flex-shrink-0" />
            <span className="line-clamp-2">{customer.address || 'No address provided'}</span>
          </div>
          {(customer.note || customer.extra) && (
            <div className="flex items-start gap-2 pt-1 border-t border-stone-100">
              <StickyNote className="w-4 h-4 mt-0.5 text-stone-400 flex-shrink-0" />
              <span className="italic text-stone-500">{customer.note || customer.extra}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 mt-1">
          {/* Quantity Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsQtyModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3 h-3" />
                {customer.note || "Select Quantity"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            <AnimatePresence>
              {isQtyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden w-full max-w-xs p-2"
                  >
                    <div className="px-4 py-3 border-b border-stone-100 mb-1">
                      <h4 className="font-bold text-stone-900">Select Quantity</h4>
                      <p className="text-xs text-stone-500">Update note for {customer.name || 'customer'}</p>
                    </div>
                    
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                      {qtyOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            onNoteChange(opt);
                            setIsQtyModalOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 rounded-xl text-sm font-semibold text-stone-700 transition-all flex items-center justify-between"
                        >
                          {opt}
                          {customer.note === opt && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setIsQtyModalOpen(false)}
                      className="w-full mt-2 py-3 text-stone-500 text-sm font-bold hover:bg-stone-50 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Answered Phone Status */}
          <div className="flex items-center justify-between px-4 py-2 bg-stone-50 border border-stone-100 rounded-xl text-[10px] font-bold uppercase tracking-wider">
            <span className="text-stone-400">Phone number answered:</span>
            <span className={customer.answeredPhone !== 'None' ? 'text-green-600' : 'text-stone-300'}>
              {customer.answeredPhone}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {customer.phone1 && (
              <a 
                href={`tel:${customer.phone1}`}
                onClick={() => onAnsweredPhoneChange('1st Number')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-bold transition-all border border-green-100"
              >
                <Phone className="w-4 h-4" />
                {customer.phone1}
              </a>
            )}
            {customer.phone2 && (
              <a 
                href={`tel:${customer.phone2}`}
                onClick={() => onAnsweredPhoneChange('2nd Number')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-bold transition-all border border-green-100"
              >
                <Phone className="w-4 h-4" />
                {customer.phone2}
              </a>
            )}
          </div>
          
          <div className="relative w-full">
            <button 
              onClick={() => setIsModalOpen(true)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all border ${customer.status !== 'None' ? `${statusInfo.bg} ${statusInfo.text} border-transparent` : 'bg-stone-900 text-white border-stone-900 hover:bg-stone-800'}`}
            >
              {customer.status === 'None' ? 'Mark Status' : customer.status}
              <ChevronDown className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden w-full max-w-xs p-2"
                  >
                    <div className="px-4 py-3 border-b border-stone-100 mb-1">
                      <h4 className="font-bold text-stone-900">Select Status</h4>
                      <p className="text-xs text-stone-500">Mark result for {customer.name || 'this customer'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <StatusOption 
                        label="Answered" 
                        color="bg-green-500" 
                        icon={<CheckCircle2 className="w-4 h-4" />} 
                        onClick={() => { onStatusChange('Answered'); setIsModalOpen(false); }} 
                      />
                      <StatusOption 
                        label="Not Answered" 
                        color="bg-yellow-400" 
                        icon={<Clock className="w-4 h-4" />} 
                        onClick={() => { onStatusChange('Not Answered'); setIsModalOpen(false); }} 
                      />
                      <StatusOption 
                        label="Not Answered 2" 
                        color="bg-orange-500" 
                        icon={<Clock className="w-4 h-4" />} 
                        onClick={() => { onStatusChange('Not Answered 2'); setIsModalOpen(false); }} 
                      />
                      <StatusOption 
                        label="Canceled" 
                        color="bg-red-500" 
                        icon={<XCircle className="w-4 h-4" />} 
                        onClick={() => { onStatusChange('Canceled'); setIsModalOpen(false); }} 
                      />
                      <StatusOption 
                        label="Whatsapp Photo" 
                        color="bg-blue-500" 
                        icon={<ImageIcon className="w-4 h-4" />} 
                        onClick={() => { onStatusChange('Whatsapp Photo'); setIsModalOpen(false); }} 
                      />
                      <StatusOption 
                        label="Scheduled" 
                        color="bg-sky-300" 
                        icon={<Clock className="w-4 h-4" />} 
                        onClick={() => { onStatusChange('Scheduled'); setIsModalOpen(false); }} 
                      />
                      <div className="border-t border-stone-100 mt-1 pt-1">
                        <StatusOption 
                          label="Reset Status" 
                          color="bg-stone-100" 
                          icon={<MoreHorizontal className="w-4 h-4" />} 
                          onClick={() => { onStatusChange('None'); setIsModalOpen(false); }} 
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="w-full mt-2 py-3 text-stone-500 text-sm font-bold hover:bg-stone-50 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatusOption({ label, color, icon, onClick }: { label: string, color: string, icon: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-50 rounded-xl transition-all text-sm font-semibold text-stone-700"
    >
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${color} text-white`}>
        {icon}
      </div>
      {label}
    </button>
  );
}
