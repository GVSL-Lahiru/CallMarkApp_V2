/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import localforage from 'localforage';
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
  Package,
  MoreHorizontal,
  Calendar,
  Folder,
  ArrowLeft,
  Edit2,
  LogOut,
  Undo2,
  Redo2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { Customer, MarkingStatus, STATUS_COLORS, CustomerGroup, LinkedGoogleSheet } from './types';
import { resolveDistrict, isValidDistrict } from './utils/locations';
import { translateToEnglish } from './utils/translate';
import { capitalizeText } from './utils/text';

const STORAGE_KEY = 'calling_marking_data';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<MarkingStatus | 'All' | 'Duplicate Customers'>('All');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('googleToken');
    const expiry = localStorage.getItem('googleTokenExpiry');
    if (stored && expiry && Date.now() < parseInt(expiry)) {
      return stored;
    }
    return null;
  });
  const [user, setUser] = useState<FirebaseUser | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const getGoogleToken = async () => {
    if (googleToken) {
      const expiry = localStorage.getItem('googleTokenExpiry');
      if (expiry && Date.now() < parseInt(expiry)) {
        return googleToken;
      }
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setGoogleToken(credential.accessToken);
        localStorage.setItem('googleToken', credential.accessToken);
        localStorage.setItem('googleTokenExpiry', (Date.now() + 50 * 60 * 1000).toString());
        return credential.accessToken;
      }
    } catch (error) {
      console.error("Google Sign-In failed", error);
      setAlertConfig({
        isOpen: true,
        title: 'Sign In Failed',
        message: 'Failed to sign in with Google.'
      });
    }
    return null;
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setGoogleToken(null);
      localStorage.removeItem('googleToken');
      localStorage.removeItem('googleTokenExpiry');
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  // Google Sheets Import States
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [sheetModalMode, setSheetModalMode] = useState<'import' | 'export'>('import');
  const [tabSelectionMode, setTabSelectionMode] = useState<'import' | 'export'>('import');
  const [showGoogleSheets, setShowGoogleSheets] = useState(false);
  const [linkedSheets, setLinkedSheets] = useState<LinkedGoogleSheet[]>(() => {
    const saved = localStorage.getItem('linked_google_sheets');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>([]);
  const [editingSheet, setEditingSheet] = useState<LinkedGoogleSheet | null>(null);
  const [showSheetForm, setShowSheetForm] = useState(false);
  const [sheetFormName, setSheetFormName] = useState('');
  const [sheetFormUrl, setSheetFormUrl] = useState('');
  const [isFetchingSheets, setIsFetchingSheets] = useState(false);
  const [showTabSelection, setShowTabSelection] = useState(false);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    address: '',
    city: '',
    district: '',
    phone1: '',
    phone2: '',
    quantity: '',
    size: '',
    extra: '',
  });
  const [fetchedWorkbooks, setFetchedWorkbooks] = useState<{
    id: string;
    name: string;
    wb: XLSX.WorkBook;
    availableTabs: string[];
    selectedTabs: string[];
  }[]>([]);

  useEffect(() => {
    localStorage.setItem('linked_google_sheets', JSON.stringify(linkedSheets));
  }, [linkedSheets]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Custom Modal States
  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
  }>({ isOpen: false, title: '', defaultValue: '', onConfirm: () => {} });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Load data from localForage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        let saved = await localforage.getItem<any>(STORAGE_KEY);
        
        // Migration from localStorage to localForage
        if (!saved) {
          const localSaved = localStorage.getItem(STORAGE_KEY);
          if (localSaved) {
            saved = JSON.parse(localSaved);
            await localforage.setItem(STORAGE_KEY, saved);
          }
        }

        if (saved) {
          const data = typeof saved === 'string' ? JSON.parse(saved) : saved;
          if (data.groups) {
            // Migration for note -> quantity
            const migratedGroups = data.groups.map((g: any) => ({
              ...g,
              customers: g.customers.map((c: any) => ({
                ...c,
                quantity: c.quantity !== undefined ? c.quantity : (c.note || ''),
                note: undefined
              }))
            }));
            setGroups(migratedGroups);
            setActiveGroupId(data.activeGroupId || null);
          } else {
            // Migration from old format
            const legacyCustomers = data.customers || data;
            if (Array.isArray(legacyCustomers) && legacyCustomers.length > 0) {
              const migratedLegacy = legacyCustomers.map((c: any) => ({
                ...c,
                quantity: c.quantity !== undefined ? c.quantity : (c.note || ''),
                note: undefined
              }));
              const legacyGroup: CustomerGroup = {
                id: crypto.randomUUID(),
                name: 'Imported List 1',
                createdAt: Date.now(),
                customers: migratedLegacy,
                lastMarkedId: data.lastMarkedId || null
              };
              setGroups([legacyGroup]);
              setActiveGroupId(legacyGroup.id);
            }
          }
        }
      } catch (e) {
        console.error('Failed to load saved data', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadData();
  }, []);

  // Auto-save to localForage
  useEffect(() => {
    if (isLoaded) {
      localforage.setItem(STORAGE_KEY, {
        groups,
        activeGroupId
      }).catch(e => console.error('Failed to save data', e));
    }
  }, [groups, activeGroupId, isLoaded]);

  const activeGroup = useMemo(() => groups.find(g => g.id === activeGroupId), [groups, activeGroupId]);
  const customers = activeGroup?.customers || [];
  const lastMarkedId = activeGroup?.lastMarkedId || null;

  const setCustomers = (updater: Customer[] | ((prev: Customer[]) => Customer[])) => {
    if (!activeGroupId) return;
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        const newCustomers = typeof updater === 'function' ? updater(g.customers) : updater;
        return { ...g, customers: newCustomers };
      }
      return g;
    }));
  };

  const setLastMarkedId = (id: string | null) => {
    if (!activeGroupId) return;
    setGroups(prev => prev.map(g => {
      if (g.id === activeGroupId) {
        return { ...g, lastMarkedId: id };
      }
      return g;
    }));
  };

  const createGroup = () => {
    setPromptConfig({
      isOpen: true,
      title: 'Enter a name for the new customer list group:',
      defaultValue: '',
      onConfirm: (name) => {
        if (!name?.trim()) return;
        
        const newGroup: CustomerGroup = {
          id: crypto.randomUUID(),
          name: name.trim(),
          createdAt: Date.now(),
          customers: [],
          lastMarkedId: null
        };
        
        setGroups(prev => [...prev, newGroup]);
        setActiveGroupId(newGroup.id);
      }
    });
  };

  const renameGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const group = groups.find(g => g.id === id);
    if (!group) return;
    
    setPromptConfig({
      isOpen: true,
      title: 'Enter new name:',
      defaultValue: group.name,
      onConfirm: (newName) => {
        if (!newName?.trim()) return;
        setGroups(prev => prev.map(g => g.id === id ? { ...g, name: newName.trim() } : g));
      }
    });
  };

  const deleteGroup = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Group',
      message: 'Are you sure you want to delete this group and all its customers?',
      onConfirm: () => {
        setGroups(prev => prev.filter(g => g.id !== id));
        if (activeGroupId === id) {
          setActiveGroupId(null);
        }
      }
    });
  };

  const processExcelData = async (data: any[][]) => {
    if (!data || data.length === 0) {
      return;
    }

    const headers = (data[0] || []).map(h => String(h || '').toLowerCase().trim());
    
    const getIndex = (keywords: string[], excludeIdx: number = -1) => {
      let idx = headers.findIndex((h, i) => i !== excludeIdx && keywords.includes(h));
      if (idx !== -1) return idx;
      idx = headers.findIndex((h, i) => i !== excludeIdx && keywords.some(kw => h.includes(kw)));
      return idx;
    };

    let nameIdx = getIndex(['name', 'customer name', 'full name', 'client', 'customer']);
    let addressIdx = getIndex(['address', 'street', 'location']);
    let cityIdx = getIndex(['city', 'town']);
    let districtIdx = getIndex(['district', 'state', 'region', 'province']);
    let phone1Idx = getIndex(['phone 1', 'phone1', 'mobile 1', 'mobile1', 'contact 1', 'number 1', 'phone', 'mobile', 'contact', 'number']);
    let phone2Idx = getIndex(['phone 2', 'phone2', 'mobile 2', 'mobile2', 'contact 2', 'number 2', 'alt phone', 'alternate', 'phone', 'mobile', 'contact', 'number'], phone1Idx);
    let quantityIdx = getIndex(['quantity', 'qty', 'amount', 'note', 'notes', 'remark', 'remarks', 'comment', 'comments']);
    let sizeIdx = getIndex(['size', 'item size', 'product size']);
    let extraIdx = getIndex(['extra', 'misc', 'other', 'additional']);

    const foundAny = [nameIdx, addressIdx, cityIdx, districtIdx, phone1Idx, phone2Idx, quantityIdx, sizeIdx, extraIdx].some(idx => idx !== -1);
    
    if (!foundAny) {
      nameIdx = 0; addressIdx = 1; cityIdx = 2; districtIdx = 3;
      phone1Idx = 4; phone2Idx = 5; quantityIdx = 6; sizeIdx = 7; extraIdx = 8;
    }

    const getValue = (row: any[], idx: number) => idx !== -1 ? String(row[idx] || '') : '';

    const formatPhoneNumber = (rawNumber: string) => {
      if (!rawNumber) return '';
      const cleanNumber = rawNumber.replace(/[^0-9]/g, '');
      if (cleanNumber.length < 9) return rawNumber.trim();
      return "0" + cleanNumber.slice(-9);
    };

    // Skip header row and map to Customer objects
    const processRows = async () => {
      const rows = data.slice(1);
      setImportTotal(prev => prev + rows.length);
      const newCustomers: Customer[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setImportProgress(prev => prev + 1);
        
        const rawP1 = getValue(row, phone1Idx);
        const rawP2 = getValue(row, phone2Idx);
        
        let finalP1 = formatPhoneNumber(rawP1);
        let finalP2 = formatPhoneNumber(rawP2);
        
        const p1Valid = rawP1.replace(/[^0-9]/g, '').length >= 9;
        const p2Valid = rawP2.replace(/[^0-9]/g, '').length >= 9;
        
        if (p1Valid && !p2Valid) {
          finalP2 = finalP1;
        } else if (p2Valid && !p1Valid) {
          finalP1 = finalP2;
        }

        let rawCity = getValue(row, cityIdx);
        let rawDistrict = getValue(row, districtIdx);
        let name = getValue(row, nameIdx);
        let address = getValue(row, addressIdx);
        let quantity = getValue(row, quantityIdx);
        let size = getValue(row, sizeIdx);
        let extra = getValue(row, extraIdx);

        if (navigator.onLine) {
          [name, address, rawCity, rawDistrict, quantity, size, extra] = await Promise.all([
            translateToEnglish(name),
            translateToEnglish(address),
            translateToEnglish(rawCity),
            translateToEnglish(rawDistrict),
            translateToEnglish(quantity),
            translateToEnglish(size),
            translateToEnglish(extra)
          ]);
        }
        
        if (rawDistrict && !isValidDistrict(rawDistrict)) {
          let resolved = await resolveDistrict(rawDistrict);
          if (!resolved && rawCity && rawCity.toLowerCase() !== rawDistrict.toLowerCase()) {
            resolved = await resolveDistrict(rawCity);
          }
          rawDistrict = resolved || '';
        } else if (!rawDistrict && rawCity) {
          rawDistrict = await resolveDistrict(rawCity) || '';
        }

        name = capitalizeText(name);
        address = capitalizeText(address);
        rawCity = capitalizeText(rawCity);
        rawDistrict = capitalizeText(rawDistrict);
        quantity = capitalizeText(quantity);
        size = capitalizeText(size);
        extra = capitalizeText(extra);

        if (name || finalP1) {
          newCustomers.push({
            id: crypto.randomUUID(),
            name,
            address,
            city: rawCity,
            district: rawDistrict,
            phone1: finalP1,
            phone2: finalP2,
            quantity,
            size,
            extra,
            status: 'None' as MarkingStatus,
            answeredPhone: 'None' as const,
            scheduleDate: ''
          });
        }
      }

      setCustomers(prev => [...prev, ...newCustomers]);
    };
    
    await processRows();
  };

  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  const [history, setHistory] = useState<{groups: CustomerGroup[], linkedSheets: LinkedGoogleSheet[]}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoRef = useRef(false);

  useEffect(() => {
    if (isLoaded) {
      if (isUndoRedoRef.current) {
         isUndoRedoRef.current = false;
         return;
      }
      setHistory(prevHistory => {
        let newHistory = [...prevHistory];
        setHistoryIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          newHistory = prevHistory.slice(0, nextIndex);
          newHistory.push({ groups, linkedSheets });
          if (newHistory.length > 30) {
            newHistory.shift();
            return 29;
          }
          return newHistory.length - 1;
        });
        return newHistory;
      });
    }
  }, [groups, linkedSheets, isLoaded]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setConfirmConfig({
        isOpen: true,
        title: 'Undo Confirmation',
        message: 'Are you sure you want to undo the last action?',
        onConfirm: () => {
          isUndoRedoRef.current = true;
          const prevIndex = historyIndex - 1;
          const prevState = history[prevIndex];
          setGroups(prevState.groups);
          setLinkedSheets(prevState.linkedSheets);
          setHistoryIndex(prevIndex);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setConfirmConfig({
        isOpen: true,
        title: 'Redo Confirmation',
        message: 'Are you sure you want to redo the last undone action?',
        onConfirm: () => {
          isUndoRedoRef.current = true;
          const nextIndex = historyIndex + 1;
          const nextState = history[nextIndex];
          setGroups(nextState.groups);
          setLinkedSheets(nextState.linkedSheets);
          setHistoryIndex(nextIndex);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      });
    }
  };

  const handleSaveCustomer = () => {
    if (!newCustomer.name || !newCustomer.phone1) {
      setAlertConfig({
        isOpen: true,
        title: 'Validation Error',
        message: 'Name and Phone 1 are required fields.'
      });
      return;
    }

    if (editingCustomerId) {
      setCustomers(prev => prev.map(c => c.id === editingCustomerId ? {
        ...c,
        name: newCustomer.name || '',
        address: newCustomer.address || '',
        city: newCustomer.city || '',
        district: newCustomer.district || '',
        phone1: newCustomer.phone1 || '',
        phone2: newCustomer.phone2 || '',
        quantity: newCustomer.quantity || '',
        size: newCustomer.size || '',
        extra: newCustomer.extra || '',
      } : c));
      setAlertConfig({
        isOpen: true,
        title: 'Success',
        message: 'Customer updated successfully!'
      });
    } else {
      const customer: Customer = {
        id: crypto.randomUUID(),
        name: newCustomer.name || '',
        address: newCustomer.address || '',
        city: newCustomer.city || '',
        district: newCustomer.district || '',
        phone1: newCustomer.phone1 || '',
        phone2: newCustomer.phone2 || '',
        quantity: newCustomer.quantity || '',
        size: newCustomer.size || '',
        extra: newCustomer.extra || '',
        status: 'None' as MarkingStatus,
        answeredPhone: 'None' as const,
        scheduleDate: ''
      };
  
      setCustomers(prev => [...prev, customer]);
      setAlertConfig({
        isOpen: true,
        title: 'Success',
        message: 'Custom customer created successfully!'
      });
    }

    setShowCreateCustomer(false);
    setEditingCustomerId(null);
    setNewCustomer({
      name: '',
      address: '',
      city: '',
      district: '',
      phone1: '',
      phone2: '',
      quantity: '',
      size: '',
      extra: '',
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setTabSelectionMode('import');
    setIsFetchingSheets(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        setFetchedWorkbooks([{
          id: 'local-file',
          name: file.name,
          wb,
          availableTabs: wb.SheetNames,
          selectedTabs: [wb.SheetNames[0]]
        }]);
        setShowImportOptions(false);
        setShowTabSelection(true);
      } catch (error) {
        console.error("Error reading local file", error);
        setAlertConfig({
          isOpen: true,
          title: 'Error',
          message: 'Failed to read the Excel file.'
        });
      } finally {
        setIsFetchingSheets(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleSaveSheet = () => {
    if (!sheetFormName.trim() || !sheetFormUrl.trim()) return;
    
    if (editingSheet) {
      setLinkedSheets(prev => prev.map(s => s.id === editingSheet.id ? { ...s, name: sheetFormName, url: sheetFormUrl } : s));
    } else {
      setLinkedSheets(prev => [...prev, {
        id: crypto.randomUUID(),
        name: sheetFormName,
        url: sheetFormUrl
      }]);
    }
    
    setShowSheetForm(false);
    setEditingSheet(null);
    setSheetFormName('');
    setSheetFormUrl('');
  };

  const handleDeleteSheet = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Unlink Sheet',
      message: 'Are you sure you want to unlink this Google Sheet?',
      onConfirm: () => {
        setLinkedSheets(prev => prev.filter(s => s.id !== id));
        setSelectedSheetIds(prev => prev.filter(sid => sid !== id));
      }
    });
  };

  const handleFetchSheetsForTabSelection = async (mode: 'import' | 'export') => {
    if (selectedSheetIds.length === 0) return;
    
    const token = await getGoogleToken();
    if (!token) {
      setIsFetchingSheets(false);
      return;
    }

    setIsFetchingSheets(true);
    setShowGoogleSheets(false);
    setShowImportOptions(false);
    setShowExportOptions(false);
    setTabSelectionMode(mode);

    const sheetsToImport = linkedSheets.filter(s => selectedSheetIds.includes(s.id));
    const workbooks: typeof fetchedWorkbooks = [];
    
    try {
      for (const sheet of sheetsToImport) {
        // Extract ID from Google Sheet URL
        const match = sheet.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) continue;
        
        const sheetId = match[1];
        const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
        
        const response = await fetch(exportUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) throw new Error('Failed to fetch sheet');
        
        const arrayBuffer = await response.arrayBuffer();
        const wb = XLSX.read(arrayBuffer, { type: 'array' });
        
        workbooks.push({
          id: sheet.id,
          name: sheet.name,
          wb,
          availableTabs: wb.SheetNames,
          selectedTabs: [wb.SheetNames[0]]
        });
      }
      
      if (workbooks.length > 0) {
        setFetchedWorkbooks(workbooks);
        setShowTabSelection(true);
      } else {
        setAlertConfig({
          isOpen: true,
          title: 'No Sheets Found',
          message: 'No valid sheets found to import/export.'
        });
      }
    } catch (error) {
      console.error('Error fetching Google Sheets:', error);
      setAlertConfig({
        isOpen: true,
        title: 'Fetch Failed',
        message: 'Failed to fetch from Google Sheets. Ensure you have access to these sheets.'
      });
      setShowGoogleSheets(true);
    } finally {
      setIsFetchingSheets(false);
    }
  };

  const handleConfirmImportTabSelection = async () => {
    setShowTabSelection(false);
    setIsImporting(true);
    setImportTotal(0);
    setImportProgress(0);
    
    try {
      for (const fwb of fetchedWorkbooks) {
        for (const tabName of fwb.selectedTabs) {
          const ws = fwb.wb.Sheets[tabName];
          if (!ws) continue;
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          await processExcelData(data);
        }
      }
    } catch (error) {
      console.error('Error processing sheets:', error);
      setAlertConfig({
        isOpen: true,
        title: 'Processing Error',
        message: 'An error occurred while processing the sheets.'
      });
    } finally {
      setIsImporting(false);
      setImportTotal(0);
      setImportProgress(0);
      setSelectedSheetIds([]);
      setFetchedWorkbooks([]);
    }
  };

  const handleConfirmExportTabSelection = async () => {
    const token = await getGoogleToken();
    if (!token) return;

    setShowTabSelection(false);
    setIsExporting(true);
    setExportTotal(customers.length);
    setExportProgress(0);

    try {
      const processedCustomers = [];

      for (let i = 0; i < customers.length; i++) {
        setExportProgress(i + 1);
        let c = { ...customers[i] };

        if (navigator.onLine) {
          [c.name, c.address, c.city, c.district, c.quantity, c.size, c.extra] = await Promise.all([
            translateToEnglish(c.name),
            translateToEnglish(c.address),
            translateToEnglish(c.city),
            translateToEnglish(c.district),
            translateToEnglish(c.quantity),
            translateToEnglish(c.size || ''),
            translateToEnglish(c.extra)
          ]);
        }
        
        if (c.district && !isValidDistrict(c.district)) {
          let resolved = await resolveDistrict(c.district);
          if (!resolved && c.city && c.city.toLowerCase() !== c.district.toLowerCase()) {
            resolved = await resolveDistrict(c.city);
          }
          c.district = resolved || '';
        } else if (!c.district && c.city) {
          c.district = await resolveDistrict(c.city) || '';
        }

        c.name = capitalizeText(c.name);
        c.address = capitalizeText(c.address);
        c.city = capitalizeText(c.city);
        c.district = capitalizeText(c.district);
        c.quantity = capitalizeText(c.quantity);
        c.size = capitalizeText(c.size || '');
        c.extra = capitalizeText(c.extra);

        processedCustomers.push(c);
      }

      setCustomers(processedCustomers);

      const headers = ['Name', 'Address', 'City', 'Phone 1', 'Phone 2', 'District', 'Schedule Date', 'Quantity', 'Size', 'Extra', 'Status'];
      const rows = processedCustomers.map((c) => {
        const extraValue = c.answeredPhone !== 'None' 
          ? (c.extra ? `${c.extra} | Answered: ${c.answeredPhone}` : `Answered: ${c.answeredPhone}`)
          : c.extra;
          
        let exportPhone1 = c.phone1;
        let exportPhone2 = c.phone2;
        
        if (c.answeredPhone === '2nd Number') {
          exportPhone1 = c.phone2;
          exportPhone2 = c.phone1;
        }
        
        return [c.name, c.address, c.city, exportPhone1, exportPhone2, c.district, c.scheduleDate, c.quantity, c.size || '', extraValue, c.status];
      });
      
      const values = [headers, ...rows];
      
      // Sanitize values to ensure no undefined/null values (which can cause INVALID_ARGUMENT)
      const sanitizedValues = values.map(row => 
        row.map(cell => (cell === undefined || cell === null) ? "" : String(cell))
      );

      for (const fwb of fetchedWorkbooks) {
        const sheetObj = linkedSheets.find(s => s.id === fwb.id);
        if (!sheetObj) continue;
        
        const match = sheetObj.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) continue;
        const sheetId = match[1];

        for (const tabName of fwb.selectedTabs) {
          // Google Sheets requires tab names with spaces to be wrapped in single quotes
          const safeRange = `'${tabName.replace(/'/g, "''")}'`;
          const encodedRange = encodeURIComponent(safeRange);

          // Clear existing data
          const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:clear`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Empty body is required for POST
          });

          if (!clearRes.ok) {
            const errText = await clearRes.text();
            console.error('Clear API Error:', errText);
            throw new Error(`Failed to clear tab ${tabName}: ${errText}`);
          }

          // Update with new data
          const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              range: safeRange,
              majorDimension: 'ROWS',
              values: sanitizedValues
            })
          });

          if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error('Update API Error:', errText);
            throw new Error(`Failed to update tab ${tabName}: ${errText}`);
          }

          // Fetch spreadsheet metadata to get the numerical sheetId for formatting
          const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (metaRes.ok) {
            const metaData = await metaRes.json();
            const tabMeta = metaData.sheets.find((s: any) => s.properties.title === tabName);
            const tabId = tabMeta?.properties?.sheetId;
            
            if (tabId !== undefined) {
              const requests: any[] = [];
              
              // Clear existing formatting
              requests.push({
                updateCells: {
                  range: { sheetId: tabId },
                  fields: 'userEnteredFormat.backgroundColor'
                }
              });
              
              // Apply new formatting based on status
              processedCustomers.forEach((c, index) => {
                if (c.status !== 'None') {
                  const hex = STATUS_COLORS[c.status].excel;
                  // Convert ARGB hex to RGB (0-1 range)
                  const r = parseInt(hex.substring(2, 4), 16) / 255;
                  const g = parseInt(hex.substring(4, 6), 16) / 255;
                  const b = parseInt(hex.substring(6, 8), 16) / 255;
                  
                  requests.push({
                    repeatCell: {
                      range: {
                        sheetId: tabId,
                        startRowIndex: index + 1, // +1 for header row
                        endRowIndex: index + 2,
                        startColumnIndex: 0,
                        endColumnIndex: 11 // 11 columns exported
                      },
                      cell: {
                        userEnteredFormat: {
                          backgroundColor: { red: r, green: g, blue: b }
                        }
                      },
                      fields: 'userEnteredFormat.backgroundColor'
                    }
                  });
                }
              });
              
              if (requests.length > 1) { // > 1 because we always have the clear formatting request
                const batchUpdateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ requests })
                });
                
                if (!batchUpdateRes.ok) {
                  console.error('Batch Update Formatting API Error:', await batchUpdateRes.text());
                }
              }
            }
          }
        }
      }
      
      setAlertConfig({
        isOpen: true,
        title: 'Export Successful',
        message: 'Successfully exported directly to Google Sheets!'
      });
    } catch (error: any) {
      console.error('Error exporting to Google Sheets:', error);
      setAlertConfig({
        isOpen: true,
        title: 'Export Failed',
        message: `An error occurred while exporting: ${error.message || 'Unknown error'}\n\nPlease ensure you have edit access and the Google Sheets API is enabled.`
      });
    } finally {
      setIsExporting(false);
      setExportTotal(0);
      setExportProgress(0);
      setSelectedSheetIds([]);
      setFetchedWorkbooks([]);
    }
  };

  const updateStatus = (id: string, status: MarkingStatus) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
    if (status !== 'None') {
      setLastMarkedId(id);
    }
  };

  const updateQuantity = (id: string, quantity: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, quantity } : c));
  };

  const updateSize = (id: string, size: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, size } : c));
  };

  const updateScheduleDate = (id: string, date: string) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, scheduleDate: date } : c));
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
    if (!activeGroupId) return;
    setCustomers([]);
    setShowDeleteConfirm(false);
  };

  const downloadExcel = async () => {
    if (customers.length === 0) return;

    setIsExporting(true);
    setExportTotal(customers.length);
    setExportProgress(0);

    const processedCustomers = [];

    for (let i = 0; i < customers.length; i++) {
      setExportProgress(i + 1);
      let c = { ...customers[i] };

      if (navigator.onLine) {
        [c.name, c.address, c.city, c.district, c.quantity, c.size, c.extra] = await Promise.all([
          translateToEnglish(c.name),
          translateToEnglish(c.address),
          translateToEnglish(c.city),
          translateToEnglish(c.district),
          translateToEnglish(c.quantity),
          translateToEnglish(c.size || ''),
          translateToEnglish(c.extra)
        ]);
      }
      
      if (c.district && !isValidDistrict(c.district)) {
        let resolved = await resolveDistrict(c.district);
        if (!resolved && c.city && c.city.toLowerCase() !== c.district.toLowerCase()) {
          resolved = await resolveDistrict(c.city);
        }
        c.district = resolved || '';
      } else if (!c.district && c.city) {
        c.district = await resolveDistrict(c.city) || '';
      }

      c.name = capitalizeText(c.name);
      c.address = capitalizeText(c.address);
      c.city = capitalizeText(c.city);
      c.district = capitalizeText(c.district);
      c.quantity = capitalizeText(c.quantity);
      c.size = capitalizeText(c.size || '');
      c.extra = capitalizeText(c.extra);

      processedCustomers.push(c);
    }

    // Update state so the user sees the translated values
    setCustomers(processedCustomers);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Customers');

    // Add headers
    const headers = ['Name', 'Address', 'City', 'Phone 1', 'Phone 2', 'District', 'Schedule Date', 'Quantity', 'Size', 'Extra', 'Status'];
    worksheet.addRow(headers);

    // Add data and styling
    processedCustomers.forEach((c) => {
      const extraValue = c.answeredPhone !== 'None' 
        ? (c.extra ? `${c.extra} | Answered: ${c.answeredPhone}` : `Answered: ${c.answeredPhone}`)
        : c.extra;
        
      let exportPhone1 = c.phone1;
      let exportPhone2 = c.phone2;
      
      if (c.answeredPhone === '2nd Number') {
        exportPhone1 = c.phone2;
        exportPhone2 = c.phone1;
      }
        
      const row = worksheet.addRow([
        c.name, c.address, c.city, exportPhone1, exportPhone2, c.district, c.scheduleDate || 'None', c.quantity, c.size || '', extraValue, c.status
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

    setIsExporting(false);
    setExportTotal(0);
    setExportProgress(0);
  };

  const duplicateCustomerIds = useMemo(() => {
    const duplicateIds = new Set<string>();
    const nameMap = new Map<string, Set<string>>();
    const phoneMap = new Map<string, Set<string>>();

    customers.forEach(c => {
      const nameKey = c.name.trim().toLowerCase();
      if (nameKey) {
        if (!nameMap.has(nameKey)) nameMap.set(nameKey, new Set());
        nameMap.get(nameKey)!.add(c.id);
      }
      
      const p1 = c.phone1.trim();
      if (p1) {
        if (!phoneMap.has(p1)) phoneMap.set(p1, new Set());
        phoneMap.get(p1)!.add(c.id);
      }
      
      const p2 = c.phone2.trim();
      if (p2) {
        if (!phoneMap.has(p2)) phoneMap.set(p2, new Set());
        phoneMap.get(p2)!.add(c.id);
      }
    });

    nameMap.forEach(ids => {
      if (ids.size > 1) ids.forEach(id => duplicateIds.add(id));
    });
    phoneMap.forEach(ids => {
      if (ids.size > 1) ids.forEach(id => duplicateIds.add(id));
    });

    return duplicateIds;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone1.includes(searchTerm) ||
        c.phone2.includes(searchTerm) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.district.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'All' ? true :
        filterStatus === 'Duplicate Customers' ? duplicateCustomerIds.has(c.id) :
        c.status === filterStatus;
      
      return matchesSearch && matchesFilter;
    });
  }, [customers, searchTerm, filterStatus, duplicateCustomerIds]);

  const progress = useMemo(() => {
    if (customers.length === 0) return 0;
    const marked = customers.filter(c => c.status !== 'None').length;
    return Math.round((marked / customers.length) * 100);
  }, [customers]);

  const scrollToLastMarked = () => {
    if (!lastMarkedId) return;

    const doScroll = () => {
      const element = document.getElementById(`customer-${lastMarkedId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-green-500', 'ring-opacity-50');
        setTimeout(() => {
          element.classList.remove('ring-4', 'ring-green-500', 'ring-opacity-50');
        }, 2000);
      }
    };

    const isFilteredOut = !filteredCustomers.some(c => c.id === lastMarkedId);
    if (isFilteredOut) {
      setFilterStatus('All');
      setSearchTerm('');
      setTimeout(doScroll, 100);
    } else {
      doScroll();
    }
  };

  const handleBackupData = async () => {
    try {
      const data = await localforage.getItem(STORAGE_KEY);
      if (!data) {
        setAlertConfig({
          isOpen: true,
          title: 'No Data',
          message: 'There is no data to backup.'
        });
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      saveAs(blob, `customer_data_backup_${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Backup failed', error);
      setAlertConfig({
        isOpen: true,
        title: 'Backup Failed',
        message: 'Failed to create backup file.'
      });
    }
  };

  const handleRestoreData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);
        
        if (data && data.groups) {
          setConfirmConfig({
            isOpen: true,
            title: 'Restore Data',
            message: 'This will overwrite your current data. Are you sure you want to proceed?',
            onConfirm: async () => {
              await localforage.setItem(STORAGE_KEY, data);
              setGroups(data.groups);
              setActiveGroupId(data.activeGroupId || null);
              setAlertConfig({
                isOpen: true,
                title: 'Restore Successful',
                message: 'Data has been successfully restored.'
              });
            }
          });
        } else {
          throw new Error('Invalid backup file format');
        }
      } catch (error) {
        console.error('Restore failed', error);
        setAlertConfig({
          isOpen: true,
          title: 'Restore Failed',
          message: 'Failed to restore data. The file might be corrupted or invalid.'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!activeGroupId) {
    return (
      <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col p-6">
        <div className="max-w-5xl mx-auto w-full">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Folder className="w-8 h-8 text-green-600" />
              Customer List Groups
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={handleBackupData}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-semibold transition-all shadow-sm text-sm"
                title="Backup Data to Device"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Backup</span>
              </button>
              <label className="flex items-center gap-2 px-3 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-semibold transition-all shadow-sm cursor-pointer text-sm" title="Restore Data from Device">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Restore</span>
                <input type="file" accept=".json" className="hidden" onChange={handleRestoreData} />
              </label>
              {!user ? (
                <>
                  <button 
                    onClick={getGoogleToken}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl font-semibold transition-all shadow-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Sign In
                  </button>
                  <button 
                    onClick={getGoogleToken}
                    className="sm:hidden flex items-center justify-center w-10 h-10 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl transition-all shadow-sm"
                    title="Sign In with Google"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-stone-200 shadow-sm">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-500">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-stone-900 leading-none">{user.displayName || 'User'}</span>
                      <span className="text-xs text-stone-500">{user.email}</span>
                    </div>
                    <button 
                      onClick={handleSignOut}
                      className="ml-2 p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="sm:hidden flex items-center">
                    <button 
                      onClick={handleSignOut}
                      className="p-2 bg-white border border-stone-200 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm"
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
              <button 
                onClick={createGroup}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl font-semibold transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Create Group</span>
                <span className="sm:hidden">Create</span>
              </button>
            </div>
          </div>
          
          {groups.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <Folder className="w-16 h-16 text-stone-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-stone-700 mb-2">No Groups Yet</h2>
              <p className="text-stone-500 mb-6 max-w-md mx-auto">Create a group to start importing and managing your customer lists.</p>
              <button 
                onClick={createGroup}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white hover:bg-green-700 rounded-xl font-semibold transition-all shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Create First Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {groups.map(group => (
                <div 
                  key={group.id}
                  onClick={() => setActiveGroupId(group.id)}
                  className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md hover:border-green-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                      <Folder className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1 transition-opacity">
                      <button 
                        onClick={(e) => renameGroup(group.id, e)}
                        className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Rename Group"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => deleteGroup(group.id, e)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Group"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-1 line-clamp-1">{group.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <span>{group.customers.length} customers</span>
                    <span>{new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Modals */}
        <AnimatePresence>
          {promptConfig.isOpen && (
            <CustomPromptModal 
              isOpen={promptConfig.isOpen}
              title={promptConfig.title}
              defaultValue={promptConfig.defaultValue}
              onConfirm={(val: string) => {
                setPromptConfig(prev => ({ ...prev, isOpen: false }));
                promptConfig.onConfirm(val);
              }}
              onCancel={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
            />
          )}
          {confirmConfig.isOpen && (
            <CustomConfirmModal 
              isOpen={confirmConfig.isOpen}
              title={confirmConfig.title}
              message={confirmConfig.message}
              onConfirm={() => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                confirmConfig.onConfirm();
              }}
              onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
          )}
          {alertConfig.isOpen && (
            <CustomAlertModal 
              isOpen={alertConfig.isOpen}
              title={alertConfig.title}
              message={alertConfig.message}
              onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveGroupId(null)}
                className="p-2 -ml-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                title="Back to Groups"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <PhoneCall className="w-6 h-6 text-green-600" />
                <span className="hidden sm:inline">{activeGroup?.name}</span>
              </h1>
            </div>
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

          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input 
                type="text"
                placeholder="Search by name, phone, or city..."
                className="w-full pl-10 pr-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center gap-3">
                <div className="relative flex-1 min-w-0 max-w-[60%] sm:max-w-xs">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <select 
                    className="w-full pl-10 pr-8 py-2 bg-stone-100 border-none rounded-xl text-sm appearance-none focus:ring-2 focus:ring-green-500 transition-all truncate"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                  >
                    <option value="All">All Status ({customers.length})</option>
                    <option value="Duplicate Customers">Duplicate ({duplicateCustomerIds.size})</option>
                    <option value="Answered">Answered ({customers.filter(c => c.status === 'Answered').length})</option>
                    <option value="Not Answered">Not Answered ({customers.filter(c => c.status === 'Not Answered').length})</option>
                    <option value="Not Answered 2">Not Answered 2 ({customers.filter(c => c.status === 'Not Answered 2').length})</option>
                    <option value="Canceled">Canceled ({customers.filter(c => c.status === 'Canceled').length})</option>
                    <option value="Whatsapp Photo">Wa. Photo ({customers.filter(c => c.status === 'Whatsapp Photo').length})</option>
                    <option value="Scheduled">Scheduled ({customers.filter(c => c.status === 'Scheduled').length})</option>
                    <option value="None">Unmarked ({customers.filter(c => c.status === 'None').length})</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Undo2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Undo</span>
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Redo2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Redo</span>
                  </button>
                </div>
              </div>
              
              <button 
                onClick={scrollToLastMarked}
                disabled={!lastMarkedId}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border mt-1 ${
                  lastMarkedId 
                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100' 
                    : 'bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Go to Last Marked
              </button>
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
            <button 
              onClick={() => setShowImportOptions(true)}
              className="mt-2 cursor-pointer bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-green-200 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Import Excel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer) => (
                <CustomerCard 
                  key={customer.id} 
                  customer={customer} 
                  onStatusChange={(status) => updateStatus(customer.id, status)} 
                  onQuantityChange={(quantity) => updateQuantity(customer.id, quantity)}
                  onSizeChange={(size) => updateSize(customer.id, size)}
                  onScheduleDateChange={(date) => updateScheduleDate(customer.id, date)}
                  onAnsweredPhoneChange={(type) => updateAnsweredPhone(customer.id, type)}
                  onDelete={() => deleteCustomer(customer.id)}
                  onEdit={() => {
                    setEditingCustomerId(customer.id);
                    setNewCustomer({
                      name: customer.name || '',
                      address: customer.address || '',
                      city: customer.city || '',
                      district: customer.district || '',
                      phone1: customer.phone1 || '',
                      phone2: customer.phone2 || '',
                      quantity: customer.quantity || '',
                      size: customer.size || '',
                      extra: customer.extra || '',
                    });
                    setShowCreateCustomer(true);
                  }}
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
            <button 
              onClick={() => setShowImportOptions(true)}
              className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-semibold transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Insert More</span>
            </button>
            
            <button 
              onClick={() => setShowExportOptions(true)}
              disabled={customers.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white rounded-xl font-semibold shadow-lg shadow-green-100 transition-all"
            >
              <Download className="w-5 h-5" />
              <span>Export Data</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Create Custom Customer Modal */}
      <AnimatePresence>
        {showCreateCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                {editingCustomerId ? 'Edit Customer' : 'Create Custom Customer'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">Name *</label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. John Doe"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">Phone 1 *</label>
                  <input
                    type="text"
                    value={newCustomer.phone1}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone1: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. 0771234567"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">Phone 2</label>
                  <input
                    type="text"
                    value={newCustomer.phone2}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, phone2: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. 0711234567"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">Address</label>
                  <input
                    type="text"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. 123 Main St"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">City</label>
                  <input
                    type="text"
                    value={newCustomer.city}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. Colombo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">District</label>
                  <input
                    type="text"
                    value={newCustomer.district}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. Colombo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">Quantity / Note</label>
                  <input
                    type="text"
                    value={newCustomer.quantity}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. 2 items"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-stone-600">Size</label>
                  <input
                    type="text"
                    value={newCustomer.size}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. M"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-semibold text-stone-600">Extra Details</label>
                  <input
                    type="text"
                    value={newCustomer.extra}
                    onChange={(e) => setNewCustomer(prev => ({ ...prev, extra: e.target.value }))}
                    className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="E.g. Call before delivery"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setShowCreateCustomer(false);
                    setEditingCustomerId(null);
                    setNewCustomer({
                      name: '',
                      address: '',
                      city: '',
                      district: '',
                      phone1: '',
                      phone2: '',
                      quantity: '',
                      size: '',
                      extra: '',
                    });
                  }}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCustomer}
                  className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-semibold transition-all shadow-md shadow-blue-200"
                >
                  {editingCustomerId ? 'Save Changes' : 'Create Customer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Options Modal */}
      <AnimatePresence>
        {showImportOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-stone-800 mb-4">Import Customers</h3>
              <div className="flex flex-col gap-3">
                <label className="cursor-pointer bg-stone-100 hover:bg-stone-200 text-stone-800 p-4 rounded-2xl font-semibold transition-all flex items-center gap-3">
                  <Folder className="w-5 h-5 text-stone-500" />
                  Upload From Device
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                </label>
                <button 
                  onClick={() => {
                    setShowImportOptions(false);
                    setSheetModalMode('import');
                    setShowGoogleSheets(true);
                  }}
                  className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-2xl font-semibold transition-all flex items-center gap-3 text-left"
                >
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  Upload From Google Sheet
                </button>
                <button 
                  onClick={() => {
                    setShowImportOptions(false);
                    setShowCreateCustomer(true);
                  }}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-2xl font-semibold transition-all flex items-center gap-3 text-left"
                >
                  <User className="w-5 h-5 text-blue-600" />
                  Create Custom Customer
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowImportOptions(false)}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Options Modal */}
      <AnimatePresence>
        {showExportOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-stone-800">Export Options</h3>
                <button onClick={() => setShowExportOptions(false)} className="p-2 text-stone-400 hover:bg-stone-100 rounded-full transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setShowExportOptions(false);
                    downloadExcel();
                  }}
                  className="bg-stone-50 hover:bg-stone-100 text-stone-700 p-4 rounded-2xl font-semibold transition-all flex items-center gap-3 text-left"
                >
                  <Download className="w-5 h-5 text-stone-600" />
                  Export to Device
                </button>
                
                <button 
                  onClick={() => {
                    setShowExportOptions(false);
                    setSheetModalMode('export');
                    setShowGoogleSheets(true);
                  }}
                  className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-2xl font-semibold transition-all flex items-center gap-3 text-left"
                >
                  <ImageIcon className="w-5 h-5 text-green-600" />
                  Export to Google Sheet
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setShowExportOptions(false)}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tab Selection Modal */}
      <AnimatePresence>
        {showTabSelection && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
            >
              <h3 className="text-xl font-bold text-stone-800 mb-4">
                {tabSelectionMode === 'import' ? 'Select Tabs to Import' : 'Select Tabs to Overwrite'}
              </h3>
              
              <div className="flex-1 overflow-y-auto min-h-[200px] custom-scrollbar pr-2">
                {fetchedWorkbooks.map(fwb => (
                  <div key={fwb.id} className="mb-6 last:mb-0">
                    <h4 className="font-bold text-stone-700 mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      {fwb.name}
                    </h4>
                    <div className="flex flex-col gap-2 pl-6">
                      {fwb.availableTabs.map(tab => (
                        <label key={tab} className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={fwb.selectedTabs.includes(tab)}
                            onChange={(e) => {
                              setFetchedWorkbooks(prev => prev.map(w => {
                                if (w.id === fwb.id) {
                                  const newSelected = e.target.checked 
                                    ? [...w.selectedTabs, tab]
                                    : w.selectedTabs.filter(t => t !== tab);
                                  return { ...w, selectedTabs: newSelected };
                                }
                                return w;
                              }));
                            }}
                            className="w-5 h-5 rounded border-stone-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-stone-600 group-hover:text-stone-900 transition-colors">{tab}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex justify-end gap-3">
                <button 
                  onClick={() => {
                    setShowTabSelection(false);
                    setFetchedWorkbooks([]);
                    if (fetchedWorkbooks.some(w => w.id !== 'local-file')) {
                      setShowGoogleSheets(true);
                    }
                  }}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold transition-all"
                >
                  Back
                </button>
                <button 
                  onClick={tabSelectionMode === 'import' ? handleConfirmImportTabSelection : handleConfirmExportTabSelection}
                  disabled={fetchedWorkbooks.every(w => w.selectedTabs.length === 0)}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white rounded-xl font-semibold shadow-lg shadow-green-100 transition-all"
                >
                  {tabSelectionMode === 'import' ? 'Confirm Import' : 'Confirm Export'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Sheets List Modal */}
      <AnimatePresence>
        {showGoogleSheets && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-stone-800">Linked Google Sheets</h3>
                <button 
                  onClick={() => {
                    setEditingSheet(null);
                    setSheetFormName('');
                    setSheetFormUrl('');
                    setShowSheetForm(true);
                  }}
                  className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Link New Sheet
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[200px] custom-scrollbar pr-2">
                {linkedSheets.length === 0 ? (
                  <div className="text-center py-10 text-stone-500">
                    <p>No Google Sheets linked yet.</p>
                    <p className="text-sm mt-1">Click "Link New Sheet" to add one.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {linkedSheets.map(sheet => (
                      <div key={sheet.id} className="border border-stone-200 rounded-2xl p-4 flex items-start gap-3">
                        <input 
                          type="checkbox" 
                          checked={selectedSheetIds.includes(sheet.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSheetIds(prev => [...prev, sheet.id]);
                            } else {
                              setSelectedSheetIds(prev => prev.filter(id => id !== sheet.id));
                            }
                          }}
                          className="mt-1 w-5 h-5 rounded border-stone-300 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-stone-800 truncate">{sheet.name}</h4>
                          <p className="text-xs text-stone-500 truncate mt-1">{sheet.url}</p>
                          <div className="flex gap-2 mt-3">
                            <button 
                              onClick={() => {
                                setEditingSheet(sheet);
                                setSheetFormName(sheet.name);
                                setSheetFormUrl(sheet.url);
                                setShowSheetForm(true);
                              }}
                              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Rename / Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteSheet(sheet.id)}
                              className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" /> Unlink
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex justify-between items-center">
                <button 
                  onClick={() => setShowGoogleSheets(false)}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold transition-all flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button 
                  onClick={() => handleFetchSheetsForTabSelection(sheetModalMode)}
                  disabled={selectedSheetIds.length === 0}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white rounded-xl font-semibold shadow-lg shadow-green-100 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> {sheetModalMode === 'import' ? 'Import Selected' : 'Export Selected'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Sheet Form Modal */}
      <AnimatePresence>
        {showSheetForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold text-stone-800 mb-4">
                {editingSheet ? 'Edit Google Sheet' : 'Link Google Sheet'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    value={sheetFormName}
                    onChange={(e) => setSheetFormName(e.target.value)}
                    placeholder="e.g., March Customers"
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Google Sheet Link</label>
                  <input 
                    type="url" 
                    value={sheetFormUrl}
                    onChange={(e) => setSheetFormUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-stone-500 mt-2">
                    Make sure the sheet sharing settings are set to <strong>"Anyone with the link can view"</strong>.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  onClick={() => setShowSheetForm(false)}
                  className="px-5 py-2.5 text-stone-600 hover:bg-stone-100 rounded-xl font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSheet}
                  disabled={!sheetFormName.trim() || !sheetFormUrl.trim()}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-stone-300 text-white rounded-xl font-semibold shadow-lg shadow-green-100 transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
              <h2 className="text-xl font-bold text-stone-900 mb-2">Delete All Customers?</h2>
              <p className="text-stone-500 mb-6">This action cannot be undone. All customer details and markings in this group will be permanently removed.</p>
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

      {/* Fetching Sheets Modal */}
      <AnimatePresence>
        {isFetchingSheets && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 border-4 border-stone-100 border-t-green-600 rounded-full animate-spin mb-6"></div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Reading Sheets...</h2>
              <p className="text-stone-500">Please wait while we fetch the available tabs.</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Progress Modal */}
      <AnimatePresence>
        {isImporting && importTotal > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-800">Importing Data</h3>
                  <p className="text-sm text-stone-500">Processing locations...</p>
                </div>
              </div>
              
              <div className="w-full bg-stone-100 rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, (importProgress / importTotal) * 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs font-bold text-stone-400">
                <span>{importProgress} / {importTotal}</span>
                <span>{Math.round((importProgress / importTotal) * 100)}%</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Export Progress Modal */}
      <AnimatePresence>
        {isExporting && exportTotal > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-800">Exporting Data</h3>
                  <p className="text-sm text-stone-500">Processing locations and translating...</p>
                </div>
              </div>
              
              <div className="w-full bg-stone-100 rounded-full h-3 mb-2 overflow-hidden">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${Math.max(5, (exportProgress / exportTotal) * 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-xs font-bold text-stone-400">
                <span>{exportProgress} / {exportTotal}</span>
                <span>{Math.round((exportProgress / exportTotal) * 100)}%</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Modals */}
      <AnimatePresence>
        {promptConfig.isOpen && (
          <CustomPromptModal 
            isOpen={promptConfig.isOpen}
            title={promptConfig.title}
            defaultValue={promptConfig.defaultValue}
            onConfirm={(val: string) => {
              setPromptConfig(prev => ({ ...prev, isOpen: false }));
              promptConfig.onConfirm(val);
            }}
            onCancel={() => setPromptConfig(prev => ({ ...prev, isOpen: false }))}
          />
        )}
        {confirmConfig.isOpen && (
          <CustomConfirmModal 
            isOpen={confirmConfig.isOpen}
            title={confirmConfig.title}
            message={confirmConfig.message}
            onConfirm={() => {
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              confirmConfig.onConfirm();
            }}
            onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
          />
        )}
        {alertConfig.isOpen && (
          <CustomAlertModal 
            isOpen={alertConfig.isOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            onConfirm={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

interface CustomerCardProps {
  customer: Customer;
  onStatusChange: (status: MarkingStatus) => void;
  onQuantityChange: (quantity: string) => void;
  onSizeChange: (size: string) => void;
  onScheduleDateChange: (date: string) => void;
  onAnsweredPhoneChange: (type: '1st Number' | '2nd Number') => void;
  onDelete: () => void;
  onEdit: () => void;
  key?: React.Key;
}

function CustomerCard({ customer, onStatusChange, onQuantityChange, onSizeChange, onScheduleDateChange, onAnsweredPhoneChange, onDelete, onEdit }: CustomerCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState(customer.scheduleDate || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const statusInfo = STATUS_COLORS[customer.status];

  const qtyOptions = [
    "1 item", "2 items", "3 items", "4 items", 
    "chain only", "pendant only", "Clover Necklace with Butterfly Necklace", "Clover Necklace with Bracelet", "Butterfly Neckles with Bracelet"
  ];

  const sizeOptions = [
    "Small", "Medium", "Large", "XL (Extra Large)", 
    "XXL / 2XL", "XXXL / 3XL", "XXXXL / 4XL", "5XL or more"
  ];

  return (
    <motion.div 
      id={`customer-${customer.id}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${customer.status !== 'None' ? `border-${statusInfo.bg.split('-')[1]}-200 shadow-sm` : 'border-stone-100'}`}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Status Badge */}
        {customer.status !== 'None' && (
          <div className="flex justify-start">
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.text}`}>
              {customer.status}
            </span>
          </div>
        )}

        {/* Header Info */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${customer.status !== 'None' ? statusInfo.bg : 'bg-stone-100'} ${customer.status !== 'None' ? statusInfo.text : 'text-stone-400'}`}>
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-stone-900 truncate">{customer.name || 'Unnamed Customer'}</h3>
              <div className="flex items-center gap-1 text-xs text-stone-500 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{customer.city}{customer.district ? `, ${customer.district}` : ''}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1.5 sm:p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Edit customer"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1.5 sm:p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              title="Delete customer"
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
          {(customer.quantity || customer.extra) && (
            <div className="flex items-start gap-2 pt-1 border-t border-stone-100">
              <Package className="w-4 h-4 mt-0.5 text-stone-400 flex-shrink-0" />
              <span className="italic text-stone-500">{customer.quantity || customer.extra}</span>
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
                {customer.quantity || "Select Quantity"}
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
                      <p className="text-xs text-stone-500">Update quantity for {customer.name || 'customer'}</p>
                    </div>
                    
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                      {qtyOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            onQuantityChange(opt);
                            setIsQtyModalOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 rounded-xl text-sm font-semibold text-stone-700 transition-all flex items-center justify-between"
                        >
                          {opt}
                          {customer.quantity === opt && <CheckCircle2 className="w-4 h-4 text-green-500" />}
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

          {/* Size Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsSizeModalOpen(true)}
              className="w-full flex items-center justify-between px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-3 h-3" />
                {customer.size || "Select Size"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            <AnimatePresence>
              {isSizeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden w-full max-w-xs p-2"
                  >
                    <div className="px-4 py-3 border-b border-stone-100 mb-1">
                      <h4 className="font-bold text-stone-900">Select Size</h4>
                      <p className="text-xs text-stone-500">Update size for {customer.name || 'customer'}</p>
                    </div>
                    
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                      {sizeOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => {
                            onSizeChange(opt);
                            setIsSizeModalOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-stone-50 rounded-xl text-sm font-semibold text-stone-700 transition-all flex items-center justify-between"
                        >
                          {opt}
                          {customer.size === opt && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={() => setIsSizeModalOpen(false)}
                      className="w-full mt-2 py-3 text-stone-500 text-sm font-bold hover:bg-stone-50 rounded-2xl transition-all"
                    >
                      Cancel
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Schedule Date Button */}
          <div className="relative">
            <button 
              onClick={() => {
                setTempDate(customer.scheduleDate || '');
                setIsDateModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all"
            >
              <span className="flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Schedule Date: {customer.scheduleDate ? new Date(customer.scheduleDate).toLocaleDateString() : 'None'}
              </span>
              <ChevronDown className="w-3 h-3" />
            </button>

            <AnimatePresence>
              {isDateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="bg-white border border-stone-200 rounded-3xl shadow-2xl overflow-hidden w-full max-w-xs p-4"
                  >
                    <div className="mb-4">
                      <h4 className="font-bold text-stone-900">Select Schedule Date</h4>
                      <p className="text-xs text-stone-500">For {customer.name || 'customer'}</p>
                    </div>
                    
                    <input 
                      type="date" 
                      value={tempDate}
                      onChange={(e) => setTempDate(e.target.value)}
                      className="w-full p-3 border border-stone-200 rounded-xl mb-4 focus:ring-2 focus:ring-green-500 outline-none text-stone-700"
                    />

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsDateModalOpen(false)}
                        className="flex-1 py-3 text-stone-500 text-sm font-bold hover:bg-stone-50 rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          onScheduleDateChange(tempDate);
                          setIsDateModalOpen(false);
                        }}
                        className="flex-1 py-3 bg-green-600 text-white text-sm font-bold hover:bg-green-700 rounded-xl transition-all"
                      >
                        Save
                      </button>
                    </div>
                    {customer.scheduleDate && (
                      <button 
                        onClick={() => {
                          onScheduleDateChange('');
                          setIsDateModalOpen(false);
                        }}
                        className="w-full mt-2 py-2 text-red-500 text-sm font-bold hover:bg-red-50 rounded-xl transition-all"
                      >
                        Clear Date
                      </button>
                    )}
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
            {customer.phone2 && customer.phone2 !== customer.phone1 && (
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
                    
                    <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
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

export function CustomPromptModal({ isOpen, title, defaultValue, onConfirm, onCancel }: any) {
  const [value, setValue] = useState(defaultValue);
  
  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200"
      >
        <h2 className="text-xl font-bold text-stone-900 mb-4">{title}</h2>
        <input 
          type="text" 
          value={value} 
          onChange={(e) => setValue(e.target.value)} 
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-transparent transition-all mb-6"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onConfirm(value);
            }
          }}
        />
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(value)}
            className="flex-1 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-all"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CustomConfirmModal({ isOpen, title, message, onConfirm, onCancel }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200"
      >
        <h2 className="text-xl font-bold text-stone-900 mb-2">{title}</h2>
        <p className="text-stone-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold shadow-lg shadow-red-100 transition-all"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function CustomAlertModal({ isOpen, title, message, onConfirm }: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-stone-200"
      >
        <h2 className="text-xl font-bold text-stone-900 mb-2">{title}</h2>
        <p className="text-stone-500 mb-6">{message}</p>
        <button 
          onClick={onConfirm}
          className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-all"
        >
          OK
        </button>
      </motion.div>
    </div>
  );
}
