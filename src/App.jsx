// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';
import { processOfflineQueue, checkRealOnlineStatus } from './syncEngine';
import { printReceipt } from './printReceipt';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

/* ─────────────────────────────────────────────
   Responsive CSS injected via a <style> tag so
   we can use real media queries without Tailwind.
───────────────────────────────────────────── */
const appStyles = `
  /* ── App Shell ── */
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100dvh;
    width: 100%;
    overflow: hidden;
    background: #f0f2f5;
    font-family: 'Inter','Segoe UI', Arial, sans-serif;
  }

  /* ── Navbar ── */
  .navbar {
    background: #1a1a2e;
    color: #fff;
    padding: 0 20px;
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    gap: 12px;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  }
  .navbar-brand {
    font-size: 17px;
    font-weight: 700;
    white-space: nowrap;
    letter-spacing: 0.3px;
  }
  .navbar-tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .nav-btn {
    padding: 7px 14px;
    background: #2d2d44;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: background 0.18s;
    white-space: nowrap;
  }
  .nav-btn:hover  { background: #3d3d5e; }
  .nav-btn.active { background: #007bff; }
  .status-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .status-badge.online  { background: #28a745; color: #fff; }
  .status-badge.offline { background: #dc3545; color: #fff; }

  /* ── POS View ── */
  .pos-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }
  .pos-left {
    flex: 1;
    min-width: 0;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow: hidden;
  }
  .scan-panel {
    background: #fff;
    padding: 14px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    flex-shrink: 0;
  }
  .scan-form {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }
  .scan-input {
    flex: 1;
    padding: 11px 14px;
    font-size: 15px;
    border-radius: 6px;
    border: 2px solid #007bff;
    color: #000;
    background: #fff;
    outline: none;
    transition: border-color 0.2s;
  }
  .scan-input.error { border-color: #dc3545; }
  .scan-input:focus { border-color: #0056d6; box-shadow: 0 0 0 3px rgba(0,123,255,0.15); }
  .scan-btn {
    padding: 0 18px;
    background: #007bff;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.18s;
  }
  .scan-btn:hover { background: #0056d6; }
  .error-banner {
    margin-bottom: 8px;
    padding: 8px 12px;
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: fadeInDown 0.25s ease;
  }
  @keyframes fadeInDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .search-input {
    width: 100%;
    padding: 8px 12px;
    font-size: 14px;
    border-radius: 6px;
    border: 1px solid #ddd;
    color: #000;
    background: #fff;
    outline: none;
    transition: border-color 0.2s;
  }
  .search-input:focus { border-color: #007bff; }

  /* ── Product Grid ── */
  .product-grid {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
    gap: 12px;
    padding-bottom: 4px;
  }
  .product-card {
    background: #fff;
    padding: 13px;
    border-radius: 10px;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    border: 1.5px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: transform 0.15s, box-shadow 0.15s;
    min-height: 100px;
  }
  .product-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.1); }
  .product-card.low-stock { border-color: #dc3545; }
  .product-name { font-size: 14px; font-weight: 700; color: #1a1a2e; }
  .product-barcode { font-size: 11px; color: #888; margin-top: 3px; }
  .product-footer { margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
  .product-price { font-weight: 700; color: #28a745; font-size: 15px; }
  .stock-badge {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 4px;
    background: #e8e8e8;
    color: #444;
  }
  .stock-badge.low { background: #f8d7da; color: #721c24; }

  /* ── Cart Panel ── */
  .cart-panel {
    width: 360px;
    flex-shrink: 0;
    background: #fff;
    border-left: 1px solid #e0e0e0;
    display: flex;
    flex-direction: column;
    padding: 18px;
    overflow: hidden;
  }
  .cart-title { margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #1a1a2e; flex-shrink: 0; }
  .cart-items { flex: 1; overflow-y: auto; border-bottom: 1px solid #eee; margin-bottom: 14px; }
  .cart-empty { color: #aaa; text-align: center; margin-top: 48px; font-size: 14px; }
  .cart-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f5f5f5;
    color: #1a1a2e;
    gap: 8px;
  }
  .cart-item-info { flex: 1; min-width: 0; }
  .cart-item-name { font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cart-item-price { font-size: 11px; color: #888; margin-top: 2px; }
  .cart-price-edit { display: flex; align-items: center; gap: 3px; margin-top: 3px; font-size: 12px; color: #555; }
  .cart-price-input {
    width: 65px;
    padding: 2px 5px;
    font-size: 12px;
    font-weight: 700;
    color: #28a745;
    border: 1px solid #007bff;
    border-radius: 4px;
    background: #f0f7ff;
    outline: none;
  }
  .cart-price-input:focus { border-color: #0056b3; background: #fff; box-shadow: 0 0 0 2px rgba(0,123,255,0.2); }
  .edit-invoice-banner {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeeba;
    padding: 8px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .cancel-edit-btn {
    background: #dc3545;
    color: #fff;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    font-weight: 700;
  }
  .cancel-edit-btn:hover { background: #bd2130; }
  .qty-controls { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
  .qty-btn { width: 26px; height: 26px; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa; cursor: pointer; font-size: 15px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: background 0.15s; }
  .qty-btn:hover { background: #e2e6ea; }
  .qty-value { font-weight: 700; width: 22px; text-align: center; font-size: 13px; }
  .cart-item-total { width: 62px; text-align: right; font-weight: 700; font-size: 13px; flex-shrink: 0; }

  /* ── Checkout Panel ── */
  .checkout-section { display: flex; flex-direction: column; gap: 10px; flex-shrink: 0; }
  .total-row { display: flex; justify-content: space-between; font-size: 20px; font-weight: 700; color: #1a1a2e; }
  .payment-methods { display: flex; gap: 8px; }
  .payment-btn {
    flex: 1;
    padding: 9px;
    border: 2px solid #007bff;
    border-radius: 6px;
    background: #fff;
    color: #1a1a2e;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.18s;
  }
  .payment-btn.selected { background: #007bff; color: #fff; }
  .payment-btn:hover:not(.selected) { background: #f0f6ff; }
  .cash-section { display: flex; flex-direction: column; gap: 7px; }
  .paid-row { display: flex; gap: 8px; align-items: center; }
  .paid-label { font-size: 13px; width: 88px; color: #555; }
  .paid-input { flex: 1; padding: 8px 10px; font-size: 14px; border-radius: 6px; border: 1px solid #ddd; color: #000; background: #fff; }
  .change-row { display: flex; justify-content: space-between; font-size: 14px; color: #28a745; font-weight: 700; }
  .auto-print-label { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #555; cursor: pointer; }
  .checkout-btn {
    width: 100%;
    padding: 14px;
    background: #28a745;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.18s, transform 0.1s;
  }
  .checkout-btn:hover:not(:disabled) { background: #218838; transform: translateY(-1px); }
  .checkout-btn:disabled { background: #ccc; cursor: not-allowed; }

  /* ── POS Mobile Cart Toggle ── */
  .cart-toggle-btn {
    display: none;
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #007bff;
    color: #fff;
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    font-size: 22px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0,123,255,0.5);
    z-index: 200;
    align-items: center;
    justify-content: center;
  }

  /* ── Inventory View ── */
  .inventory-layout {
    display: flex;
    flex: 1;
    padding: 16px;
    gap: 16px;
    overflow: hidden;
  }
  .inv-form-panel {
    width: 320px;
    flex-shrink: 0;
    background: #fff;
    padding: 18px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    color: #1a1a2e;
    overflow-y: auto;
  }
  .inv-form-panel h3 { margin: 0 0 14px 0; font-size: 16px; }
  .inv-table-panel {
    flex: 1;
    min-width: 0;
    background: #fff;
    padding: 18px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    overflow-y: auto;
    color: #1a1a2e;
  }
  .inv-table-panel h3 { margin: 0 0 14px 0; font-size: 16px; }
  .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 10px; }
  .form-label { font-size: 12px; font-weight: 700; color: #555; }
  .form-input {
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid #ddd;
    color: #000;
    background: #fff;
    font-size: 14px;
    width: 100%;
    outline: none;
    transition: border-color 0.2s;
  }
  .form-input:focus { border-color: #007bff; }
  .form-row { display: flex; gap: 10px; }
  .form-row .form-group { flex: 1; }
  .save-btn {
    width: 100%;
    padding: 10px;
    background: #28a745;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    margin-top: 6px;
    transition: background 0.18s;
  }
  .save-btn:hover { background: #218838; }
  .table-responsive { overflow-x: auto; }
  .data-table { width: 100%; border-collapse: collapse; min-width: 480px; }
  .data-table th {
    padding: 10px 12px;
    background: #f8f9fa;
    border-bottom: 2px solid #dee2e6;
    font-size: 13px;
    text-align: left;
    color: #555;
    font-weight: 700;
    white-space: nowrap;
  }
  .data-table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
  .data-table tr:hover td { background: #f9f9f9; }
  .tbl-price { color: #28a745; font-weight: 700; }
  .action-btn {
    padding: 4px 9px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    margin-right: 4px;
    transition: opacity 0.15s;
  }
  .action-btn:hover { opacity: 0.82; }
  .btn-edit    { background: #ffc107; color: #333; }
  .btn-delete  { background: #dc3545; color: #fff; }
  .btn-barcode { background: #6f42c1; color: #fff; }

  /* ── Inventory Table Panel Header ── */
  .inv-table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
  }
  .inv-table-header h3 { margin: 0; font-size: 16px; }
  .inv-search-input {
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 6px;
    border: 1.5px solid #ddd;
    color: #000;
    background: #fff;
    outline: none;
    min-width: 220px;
    transition: border-color 0.2s;
  }
  .inv-search-input:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0,123,255,0.1); }

  /* ── Invoices View ── */
  .invoices-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 16px;
    gap: 16px;
    overflow-y: auto;
    color: #1a1a2e;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    flex-shrink: 0;
  }
  .stat-card {
    background: #fff;
    padding: 18px 20px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .stat-label { font-size: 11px; color: #888; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
  .stat-value { font-size: 26px; font-weight: 700; margin-top: 4px; }
  .stat-card.revenue  { border-left: 5px solid #28a745; }
  .stat-card.orders   { border-left: 5px solid #007bff; }
  .stat-card.refunded { border-left: 5px solid #dc3545; }
  .stat-card.revenue  .stat-value { color: #28a745; }
  .stat-card.orders   .stat-value { color: #007bff; }
  .stat-card.refunded .stat-value { color: #dc3545; }
  .chart-panel { background: #fff; padding: 18px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .chart-header h3 { margin: 0; font-size: 15px; }
  .timeframe-btns { display: flex; gap: 6px; }
  .tf-btn {
    padding: 5px 12px;
    border: 1.5px solid #007bff;
    border-radius: 5px;
    background: #fff;
    color: #007bff;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    text-transform: capitalize;
    transition: all 0.18s;
  }
  .tf-btn.active { background: #007bff; color: #fff; }
  .no-data { text-align: center; color: #bbb; padding: 80px 0; font-size: 14px; }
  .invoice-panel { background: #fff; padding: 18px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .invoice-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
  .invoice-header h3 { margin: 0; font-size: 15px; }
  .invoice-search { padding: 8px 12px; width: 240px; border-radius: 6px; border: 1px solid #ddd; font-size: 13px; color: #000; background: #fff; max-width: 100%; }
  .status-pill {
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
  }
  .status-pill.completed { background: #d4edda; color: #155724; }
  .status-pill.refunded  { background: #f8d7da; color: #721c24; }
  .btn-view   { background: #007bff; color: #fff; }
  .btn-refund { background: #dc3545; color: #fff; }

  /* ── Invoice Modal ── */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 16px;
  }
  .modal-box {
    background: #fff;
    padding: 24px;
    border-radius: 12px;
    width: 100%;
    max-width: 420px;
    max-height: 88vh;
    overflow-y: auto;
  }
  .modal-box h3 { margin: 0 0 4px 0; font-size: 17px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 10px; }
  .modal-date { font-size: 12px; color: #999; margin-bottom: 12px; }
  .modal-total { border-top: 2px solid #333; padding-top: 10px; font-size: 15px; font-weight: 700; display: flex; justify-content: space-between; }
  .modal-actions { display: flex; gap: 10px; margin-top: 18px; }
  .btn-reprint { flex: 1; padding: 10px; background: #28a745; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; }
  .btn-close   { flex: 1; padding: 10px; background: #6c757d; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; }

  /* ════════════════════════════════════════════
     RESPONSIVE BREAKPOINTS
  ════════════════════════════════════════════ */

  /* ── Tablet (≤ 900px) ── */
  @media (max-width: 900px) {
    .cart-panel { width: 300px; padding: 14px; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .product-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
  }

  /* ── Small Tablet / Large Phone (≤ 768px) ── */
  @media (max-width: 768px) {
    /* Navbar stacks brand + tabs */
    .navbar { height: auto; padding: 10px 14px; flex-wrap: wrap; gap: 8px; }
    .navbar-brand { font-size: 15px; }
    .nav-btn { font-size: 12px; padding: 6px 10px; }

    /* POS: product area full width, cart slides in as overlay */
    .pos-layout { flex-direction: column; }
    .pos-left { padding: 12px; }
    .cart-panel {
      width: 100%;
      border-left: none;
      border-top: 1px solid #e0e0e0;
      max-height: 50vh;
      padding: 12px;
    }
    .product-grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }

    /* Inventory: form goes on top */
    .inventory-layout { flex-direction: column; overflow-y: auto; }
    .inv-form-panel { width: 100%; }

    /* Stats: 2 columns then wrap */
    .stats-grid { grid-template-columns: repeat(2, 1fr); }

    /* Invoice search full width */
    .invoice-search { width: 100%; }
    .invoice-header { flex-direction: column; align-items: flex-start; }
  }

  /* ── Mobile (≤ 480px) ── */
  @media (max-width: 480px) {
    .navbar-tabs { width: 100%; justify-content: stretch; }
    .nav-btn { flex: 1; text-align: center; font-size: 11px; padding: 6px 6px; }
    .navbar-brand { width: 100%; }

    .scan-form { flex-direction: column; }
    .scan-btn { width: 100%; padding: 11px; }

    .cart-panel { max-height: 45vh; }
    .product-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
    .product-card { padding: 10px; min-height: 80px; }
    .product-name { font-size: 12px; }

    .stats-grid { grid-template-columns: 1fr; }
    .stat-value { font-size: 22px; }

    .chart-header { flex-direction: column; align-items: flex-start; }

    .modal-box { padding: 16px; }

    .total-row { font-size: 17px; }
    .checkout-btn { font-size: 14px; padding: 12px; }

    .pos-left { padding: 8px; gap: 10px; }
    .invoices-layout { padding: 10px; gap: 12px; }
  }
`;

export default function App() {
  const products = useLiveQuery(() => db.products?.toArray() || []);
  const salesQueue = useLiveQuery(() => db.salesQueue?.toArray() || []);

  const [activeTab, setActiveTab] = useState('pos');

  // POS States
  const [cart, setCart] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [autoPrint, setAutoPrint] = useState(true);

  // Inventory States
  const [invSearchQuery, setInvSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', barcode: '', category: 'General', unit: 'pcs', stock: '' });

  // Invoice & Analytics States
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [timeframe, setTimeframe] = useState('daily');

  // Barcode error state
  const [barcodeError, setBarcodeError] = useState('');
  const barcodeRef = useRef(null);
  const barcodeErrorTimeoutRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'pos' && barcodeRef.current) {
      barcodeRef.current.focus();
    }
  }, [activeTab]);

  useEffect(() => {
    const verifyConnection = async () => {
      try {
        const status = await checkRealOnlineStatus();
        setIsOnline(status);
        if (status) processOfflineQueue();
      } catch (err) {
        setIsOnline(false);
      }
    };
    verifyConnection();
    const handleOnline = () => verifyConnection();
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── SEQUENTIAL INVOICE GENERATOR ──
  const generateNextInvoiceNo = async () => {
    const lastSale = await db.salesQueue.orderBy('id').last();
    const nextNumber = lastSale ? (lastSale.id || 0) + 1 : 1;
    return `INV-${String(nextNumber).padStart(6, '0')}`;
  };

  // ── POS FUNCTIONS ──
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const matchedProduct = products?.find((p) => p && p.barcode && String(p.barcode) === barcodeInput.trim());
    if (matchedProduct) {
      addToCart(matchedProduct);
      setBarcodeInput('');
    } else {
      setBarcodeInput('');
      setBarcodeError(`Barcode "${barcodeInput}" not found!`);
      if (barcodeErrorTimeoutRef.current) clearTimeout(barcodeErrorTimeoutRef.current);
      barcodeErrorTimeoutRef.current = setTimeout(() => setBarcodeError(''), 3000);
      if (barcodeRef.current) barcodeRef.current.focus();
    }
  };

  const addToCart = (product) => {
    if (!product || !product.id) return;
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const updateQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== productId));
    } else {
      setCart((prev) => prev.map((item) => (item.id === productId ? { ...item, qty: newQty } : item)));
    }
  };

  const updateItemPrice = (productId, newPrice) => {
    const val = parseFloat(newPrice);
    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, price: isNaN(val) ? '' : val } : item))
    );
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + ((parseFloat(item.price) || 0) * (item.qty || 0)), 0);
  const calculateChange = () => {
    const paid = parseFloat(amountPaid) || 0;
    const total = calculateTotal();
    return paid >= total ? paid - total : 0;
  };

  const handleCheckout = async () => {
    const total = calculateTotal();
    const paidNum = parseFloat(amountPaid) || total;
    if (cart.length === 0) return;
    if (paymentMethod === 'Cash' && paidNum < total) { alert('Amount paid is less than total!'); return; }

    if (editingInvoice) {
      // Revert stock for original items in editing invoice
      if (editingInvoice.items && Array.isArray(editingInvoice.items)) {
        for (const item of editingInvoice.items) {
          const dbProduct = await db.products.get(item.id);
          if (dbProduct) await db.products.update(item.id, { stock: (dbProduct.stock || 0) + (item.qty || 0) });
        }
      }

      const updatedSale = {
        ...editingInvoice,
        items: cart.map((i) => ({ ...i, price: parseFloat(i.price) || 0 })),
        total,
        amountPaid: paidNum,
        change: calculateChange(),
        paymentMethod,
        updatedAt: new Date().toISOString()
      };

      if (editingInvoice.id) {
        await db.salesQueue.update(editingInvoice.id, updatedSale);
      } else {
        await db.salesQueue.where('receiptNo').equals(editingInvoice.receiptNo).modify(updatedSale);
      }

      // Deduct stock for new items
      for (const item of cart) {
        const dbProduct = await db.products.get(item.id);
        if (dbProduct) await db.products.update(item.id, { stock: Math.max(0, (dbProduct.stock || 0) - item.qty) });
      }

      if (autoPrint) printReceipt(updatedSale);
      setEditingInvoice(null);
      setCart([]);
      setAmountPaid('');
      if (barcodeRef.current) barcodeRef.current.focus();
      processOfflineQueue();
      alert(`Invoice #${editingInvoice.receiptNo} updated successfully!`);
    } else {
      const receiptNo = await generateNextInvoiceNo();
      const newSale = {
        receiptNo,
        items: cart.map((i) => ({ ...i, price: parseFloat(i.price) || 0 })),
        total,
        amountPaid: paidNum,
        change: calculateChange(),
        paymentMethod,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      await db.salesQueue.add(newSale);
      for (const item of cart) {
        const dbProduct = await db.products.get(item.id);
        if (dbProduct) await db.products.update(item.id, { stock: Math.max(0, (dbProduct.stock || 0) - item.qty) });
      }
      if (autoPrint) printReceipt(newSale);
      setCart([]);
      setAmountPaid('');
      if (barcodeRef.current) barcodeRef.current.focus();
      processOfflineQueue();
    }
  };

  const handleEditInvoice = (sale) => {
    if (!sale) return;
    setEditingInvoice(sale);
    setCart(sale.items ? sale.items.map((i) => ({ ...i })) : []);
    setPaymentMethod(sale.paymentMethod || 'Cash');
    setAmountPaid(sale.amountPaid ? String(sale.amountPaid) : '');
    setActiveTab('pos');
  };

  const cancelInvoiceEdit = () => {
    setEditingInvoice(null);
    setCart([]);
    setAmountPaid('');
  };

  // ── INVENTORY FUNCTIONS ──
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    const { name, price, barcode, category, unit, stock } = productForm;
    if (!name || !price || !barcode) return alert('Fill in all fields.');
    const productData = { name: String(name), price: parseFloat(price) || 0, barcode: String(barcode).trim(), category: category || 'General', unit: unit || 'pcs', stock: parseInt(stock, 10) || 0 };
    if (editingId) { await db.products.update(editingId, productData); } else { await db.products.add(productData); }
    resetProductForm();
  };

  const handleEditClick = (product) => {
    if (!product) return;
    setEditingId(product.id);
    setProductForm({ name: product.name || '', price: product.price || '', barcode: product.barcode || '', category: product.category || 'General', unit: product.unit || 'pcs', stock: product.stock ?? '' });
  };

  const handleDeleteClick = async (id, name) => {
    if (window.confirm(`Delete "${name || 'Product'}"?`)) await db.products.delete(id);
  };

  const resetProductForm = () => {
    setEditingId(null);
    setProductForm({ name: '', price: '', barcode: '', category: 'General', unit: 'pcs', stock: '' });
  };

  // ── BARCODE STICKER PRINT ──
  const printBarcodeSticker = (product) => {
    if (!product || !product.barcode) return;
    const win = window.open('', '_blank', 'width=420,height=320');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Sticker – ${product.name || 'Product'}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .sticker {
      border: 1.5px dashed #ccc;
      border-radius: 8px;
      padding: 16px 20px;
      text-align: center;
      width: 320px;
      background: #fff;
    }
    .product-name { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; word-break: break-word; }
    .barcode-svg { width: 100%; height: auto; }
    .barcode-number { font-size: 12px; color: #555; margin-top: 4px; letter-spacing: 1.5px; font-family: monospace; }
    .product-price { font-size: 18px; font-weight: 700; color: #28a745; margin-top: 6px; }
    @media print {
      body { background: #fff; }
      .sticker { border-color: #999; }
    }
  </style>
</head>
<body>
  <div class="sticker">
    <div class="product-name">${product.name || 'Product'}</div>
    <svg id="barcode" class="barcode-svg"></svg>
    <div class="barcode-number">${product.barcode}</div>
    <div class="product-price">Rs ${(product.price || 0).toFixed(2)}</div>
  </div>
  <script>
    window.onload = function() {
      try {
        JsBarcode('#barcode', '${String(product.barcode).replace(/'/g, "\\'").replace(/\\/g, '\\\\')}', {
          format: 'CODE128',
          width: 2,
          height: 60,
          displayValue: false,
          margin: 4
        });
      } catch(e) {
        document.getElementById('barcode').outerHTML = '<p style="color:red;font-size:12px;">Barcode render error: ' + e.message + '</p>';
      }
      setTimeout(function() { window.print(); }, 600);
    };
  <\/script>
</body>
</html>`);
    win.document.close();
  };

  // ── RETURNS & REFUNDS ──
  const handleReturnInvoice = async (sale) => {
    if (!sale) return;
    if (sale.status === 'refunded') return alert('This invoice is already refunded.');
    if (window.confirm(`Refund Invoice #${sale.receiptNo}? Items will be restored to stock.`)) {
      if (sale.items && Array.isArray(sale.items)) {
        for (const item of sale.items) {
          const dbProduct = await db.products.get(item.id);
          if (dbProduct) await db.products.update(item.id, { stock: (dbProduct.stock || 0) + (item.qty || 0) });
        }
      }
      await db.salesQueue.where('receiptNo').equals(sale.receiptNo).modify({ status: 'refunded' });
      alert(`Invoice #${sale.receiptNo} marked as REFUNDED.`);
      setSelectedInvoice(null);
    }
  };

  // ── ANALYTICS DATA ──
  const getAnalyticsData = () => {
    if (!salesQueue || salesQueue.length === 0) return [];
    const completedSales = salesQueue.filter((s) => s && s.status === 'completed');
    const aggregated = {};
    completedSales.forEach((sale) => {
      if (!sale.timestamp) return;
      const date = new Date(sale.timestamp);
      let key = '';
      if (timeframe === 'daily') key = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      else if (timeframe === 'monthly') key = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      else key = date.toLocaleDateString([], { year: 'numeric', month: 'short' });
      aggregated[key] = (aggregated[key] || 0) + (sale.total || 0);
    });
    return Object.keys(aggregated).map((label) => ({ label, Sales: aggregated[label] }));
  };

  // ── SAFE FILTERS ──
  const filteredProducts = products?.filter((p) => {
    if (!p) return false;
    const nameStr = p.name ? String(p.name).toLowerCase() : '';
    const barcodeStr = p.barcode ? String(p.barcode) : '';
    const searchStr = searchQuery ? String(searchQuery).toLowerCase() : '';
    return nameStr.includes(searchStr) || barcodeStr.includes(searchStr);
  });

  const filteredInvProducts = products?.filter((p) => {
    if (!p) return false;
    const nameStr = p.name ? String(p.name).toLowerCase() : '';
    const barcodeStr = p.barcode ? String(p.barcode) : '';
    const searchStr = invSearchQuery ? String(invSearchQuery).toLowerCase() : '';
    return nameStr.includes(searchStr) || barcodeStr.includes(searchStr);
  });

  const filteredInvoices = salesQueue?.filter((s) => {
    if (!s) return false;
    const receiptStr = s.receiptNo ? String(s.receiptNo).toLowerCase() : '';
    const searchStr = invoiceSearch ? String(invoiceSearch).toLowerCase() : '';
    return receiptStr.includes(searchStr);
  });

  const totalRevenue = salesQueue?.filter((s) => s && s.status === 'completed').reduce((sum, s) => sum + (s.total || 0), 0) || 0;
  const totalOrders = salesQueue?.filter((s) => s && s.status === 'completed').length || 0;
  const totalRefunded = salesQueue?.filter((s) => s && s.status === 'refunded').reduce((sum, s) => sum + (s.total || 0), 0) || 0;
  const chartData = getAnalyticsData();

  return (
    <>
      {/* Inject responsive CSS */}
      <style>{appStyles}</style>

      <div className="app-shell">

        {/* ── NAVBAR ── */}
        <nav className="navbar">
          <div className="navbar-brand">🛒 Grocery POS</div>
          <div className="navbar-tabs">
            <button className={`nav-btn ${activeTab === 'pos' ? 'active' : ''}`} onClick={() => setActiveTab('pos')}>Cashier (POS)</button>
            <button className={`nav-btn ${activeTab === 'inventory' ? 'active' : ''}`} onClick={() => setActiveTab('inventory')}>Manage Products</button>
            <button className={`nav-btn ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>Invoices & Reports</button>
          </div>
          <span className={`status-badge ${isOnline ? 'online' : 'offline'}`}>{isOnline ? '● Online' : '● Offline'}</span>
        </nav>

        {/* ══════════════ POS VIEW ══════════════ */}
        {activeTab === 'pos' && (
          <div className="pos-layout">

            {/* Left: Scan + Product Grid */}
            <div className="pos-left">
              <div className="scan-panel">
                <form className="scan-form" onSubmit={handleBarcodeSubmit}>
                  <input
                    ref={barcodeRef}
                    type="text"
                    placeholder="Scan Barcode here..."
                    value={barcodeInput}
                    onChange={(e) => { setBarcodeInput(e.target.value); if (barcodeError) setBarcodeError(''); }}
                    className={`scan-input${barcodeError ? ' error' : ''}`}
                  />
                  <button type="submit" className="scan-btn">Scan / Add</button>
                </form>
                {barcodeError && (
                  <div className="error-banner">
                    <span>⚠️</span> {barcodeError}
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Search products by name or barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="product-grid">
                {filteredProducts?.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`product-card${(p.stock || 0) <= 5 ? ' low-stock' : ''}`}
                  >
                    <div>
                      <div className="product-name">{p.name || 'Unnamed'}</div>
                      <div className="product-barcode">{p.barcode || 'N/A'}</div>
                    </div>
                    <div className="product-footer">
                      <span className="product-price">Rs {(p.price || 0).toFixed(2)}</span>
                      <span className={`stock-badge${(p.stock || 0) <= 5 ? ' low' : ''}`}>Stock: {p.stock ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Cart Panel */}
            <div className="cart-panel">
              {editingInvoice && (
                <div className="edit-invoice-banner">
                  <span>✏️ Editing Invoice #{editingInvoice.receiptNo}</span>
                  <button className="cancel-edit-btn" onClick={cancelInvoiceEdit}>Cancel Edit</button>
                </div>
              )}
              <h2 className="cart-title">{editingInvoice ? 'Edit Order' : 'Current Order'}</h2>
              <div className="cart-items">
                {cart.length === 0 ? (
                  <p className="cart-empty">No items yet.<br />Scan a barcode to start.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.name || 'Item'}</div>
                        <div className="cart-price-edit">
                          <span>Price: Rs </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price ?? ''}
                            onChange={(e) => updateItemPrice(item.id, e.target.value)}
                            className="cart-price-input"
                          />
                          <span>/ {item.unit || 'pcs'}</span>
                        </div>
                      </div>
                      <div className="qty-controls">
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.qty - 1)}>−</button>
                        <span className="qty-value">{item.qty}</span>
                        <button className="qty-btn" onClick={() => updateQuantity(item.id, item.qty + 1)}>+</button>
                      </div>
                      <div className="cart-item-total">Rs {(((parseFloat(item.price) || 0)) * item.qty).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="checkout-section">
                <div className="total-row">
                  <span>Total:</span>
                  <span>Rs {calculateTotal().toFixed(2)}</span>
                </div>

                <div className="payment-methods">
                  {['Cash', 'Card'].map((method) => (
                    <button
                      key={method}
                      className={`payment-btn${paymentMethod === method ? ' selected' : ''}`}
                      onClick={() => setPaymentMethod(method)}
                    >{method}</button>
                  ))}
                </div>

                {paymentMethod === 'Cash' && (
                  <div className="cash-section">
                    <div className="paid-row">
                      <label className="paid-label">Paid Amount:</label>
                      <input
                        type="number"
                        placeholder={calculateTotal().toFixed(2)}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        className="paid-input"
                      />
                    </div>
                    <div className="change-row">
                      <span>Change:</span>
                      <span>Rs {calculateChange().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <label className="auto-print-label">
                  <input type="checkbox" checked={autoPrint} onChange={(e) => setAutoPrint(e.target.checked)} />
                  Print Receipt automatically
                </label>

                <button
                  className="checkout-btn"
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                >
                  {editingInvoice ? `Update Invoice (Rs ${calculateTotal().toFixed(2)})` : `Complete Sale (Rs ${calculateTotal().toFixed(2)})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ INVENTORY VIEW ══════════════ */}
        {activeTab === 'inventory' && (
          <div className="inventory-layout">

            {/* Form Panel */}
            <div className="inv-form-panel">
              <h3>{editingId ? '✏️ Edit Product' : '➕ Add New Product'}</h3>
              <form onSubmit={handleSaveProduct}>
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input className="form-input" type="text" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Barcode</label>
                  <input className="form-input" type="text" value={productForm.barcode} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price (Rs)</label>
                    <input className="form-input" type="number" step="0.01" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock Qty</label>
                    <input className="form-input" type="number" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="save-btn">{editingId ? 'Update' : 'Save'} Product</button>
                {editingId && (
                  <button type="button" className="save-btn" style={{ background: '#6c757d', marginTop: 6 }} onClick={resetProductForm}>Cancel Edit</button>
                )}
              </form>
            </div>

            {/* Table Panel */}
            <div className="inv-table-panel">
              <div className="inv-table-header">
                <h3>All Products ({filteredInvProducts?.length || 0} / {products?.length || 0})</h3>
                <input
                  type="text"
                  placeholder="🔍 Search by name or barcode..."
                  value={invSearchQuery}
                  onChange={(e) => setInvSearchQuery(e.target.value)}
                  className="inv-search-input"
                />
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Barcode</th>
                      <th>Product Name</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvProducts?.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', color: '#aaa', padding: '28px 0' }}>
                          No products match your search.
                        </td>
                      </tr>
                    ) : (
                      filteredInvProducts?.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontFamily: 'monospace' }}>{p.barcode || 'N/A'}</td>
                          <td style={{ fontWeight: 600 }}>{p.name || 'Unnamed'}</td>
                          <td className="tbl-price">Rs {(p.price || 0).toFixed(2)}</td>
                          <td>{p.stock ?? 0}</td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button className="action-btn btn-edit" onClick={() => handleEditClick(p)}>Edit</button>
                            <button className="action-btn btn-delete" onClick={() => handleDeleteClick(p.id, p.name)}>Delete</button>
                            <button className="action-btn btn-barcode" onClick={() => printBarcodeSticker(p)}>🏷️️ Sticker</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ INVOICES & REPORTS VIEW ══════════════ */}
        {activeTab === 'invoices' && (
          <div className="invoices-layout">

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card revenue">
                <div className="stat-label">Total Revenue</div>
                <div className="stat-value">Rs {totalRevenue.toFixed(2)}</div>
              </div>
              <div className="stat-card orders">
                <div className="stat-label">Completed Orders</div>
                <div className="stat-value">{totalOrders}</div>
              </div>
              <div className="stat-card refunded">
                <div className="stat-label">Refunded Amount</div>
                <div className="stat-value">Rs {totalRefunded.toFixed(2)}</div>
              </div>
            </div>

            {/* Chart */}
            <div className="chart-panel">
              <div className="chart-header">
                <h3>Sales Trend Analytics</h3>
                <div className="timeframe-btns">
                  {['daily', 'monthly', 'yearly'].map((tf) => (
                    <button key={tf} className={`tf-btn${timeframe === tf ? ' active' : ''}`} onClick={() => setTimeframe(tf)}>{tf}</button>
                  ))}
                </div>
              </div>
              <div style={{ width: '100%', height: 230 }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`Rs ${Number(value).toFixed(2)}`, 'Sales']} />
                      <Bar dataKey="Sales" fill="#007bff" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="no-data">No sales data recorded yet.</p>
                )}
              </div>
            </div>

            {/* Invoice History */}
            <div className="invoice-panel">
              <div className="invoice-header">
                <h3>Invoice History</h3>
                <input
                  type="text"
                  placeholder="Search Invoice No..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="invoice-search"
                />
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice No</th>
                      <th>Date & Time</th>
                      <th>Payment</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices?.map((s) => (
                      <tr key={s.id || s.receiptNo}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>#{s.receiptNo || 'N/A'}</td>
                        <td>{s.timestamp ? new Date(s.timestamp).toLocaleString() : 'N/A'}</td>
                        <td>{s.paymentMethod || 'Cash'}</td>
                        <td className={s.status === 'refunded' ? '' : 'tbl-price'} style={s.status === 'refunded' ? { color: '#dc3545', fontWeight: 700 } : {}}>
                          Rs {(s.total || 0).toFixed(2)}
                        </td>
                        <td>
                          <span className={`status-pill ${s.status === 'refunded' ? 'refunded' : 'completed'}`}>
                            {(s.status || 'completed').toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button className="action-btn btn-view" onClick={() => setSelectedInvoice(s)}>View / Print</button>
                          <button className="action-btn btn-edit" onClick={() => handleEditInvoice(s)}>Edit Invoice</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ── Invoice Modal ── */}
        {selectedInvoice && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedInvoice(null)}>
            <div className="modal-box">
              <h3>Invoice #{selectedInvoice.receiptNo}</h3>
              <p className="modal-date">Date: {selectedInvoice.timestamp ? new Date(selectedInvoice.timestamp).toLocaleString() : 'N/A'}</p>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items && selectedInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.name || 'Item'}</td>
                        <td style={{ textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right' }}>Rs {((item.price || 0) * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="modal-total">
                <span>Total Paid:</span>
                <span>Rs {(selectedInvoice.total || 0).toFixed(2)}</span>
              </div>
              <div className="modal-actions">
                <button className="btn-reprint" onClick={() => printReceipt(selectedInvoice)}>🖨️ Reprint</button>
                <button className="btn-close" onClick={() => setSelectedInvoice(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}