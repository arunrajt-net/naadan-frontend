import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bell, CheckCircle, ChevronRight, Clock, Navigation, Package, RefreshCw, ShoppingBag, Truck, User, XCircle } from 'lucide-react';
import { ordersAPI } from "../api";

const STATUS_CONFIG = {
  "Pending Payment":               { label: "Pending Payment",          color: "bg-gray-100 text-gray-600 border-gray-200",         dot: "bg-gray-400",    step: 0 },
  PendingPayment:                  { label: "Pending Payment",          color: "bg-gray-100 text-gray-600 border-gray-200",         dot: "bg-gray-400",    step: 0 },
  "Waiting Farmer Confirmation":   { label: "Awaiting Confirmation",    color: "bg-amber-100 text-amber-800 border-amber-300",      dot: "bg-amber-500",   step: 1 },
  WaitingFarmerConfirmation:       { label: "Awaiting Confirmation",    color: "bg-amber-100 text-amber-800 border-amber-300",      dot: "bg-amber-500",   step: 1 },
  Confirmed:                       { label: "Accepted",                 color: "bg-green-100 text-green-800 border-green-300",      dot: "bg-green-600",   step: 2 },
  Accepted:                        { label: "Accepted",                 color: "bg-green-100 text-green-800 border-green-300",      dot: "bg-green-600",   step: 2 },
  Packed:                          { label: "Packed",                   color: "bg-yellow-100 text-yellow-800 border-yellow-250",  dot: "bg-yellow-500",  step: 3 },
  "Out For Delivery":              { label: "Out for Delivery",         color: "bg-blue-100 text-blue-800 border-blue-300",         dot: "bg-blue-500",    step: 4 },
  Shipped:                         { label: "Out for Delivery",         color: "bg-blue-100 text-blue-800 border-blue-300",         dot: "bg-blue-500",    step: 4 },
  "Waiting Customer Confirmation": { label: "Delivered (Awaiting Confirmation)", color: "bg-teal-100 text-teal-800 border-teal-300", dot: "bg-teal-500", step: 5 },
  Delivered:                       { label: "Delivered (Awaiting Confirmation)", color: "bg-teal-100 text-teal-800 border-teal-300", dot: "bg-teal-500", step: 5 },
  Completed:                       { label: "Completed",                color: "bg-emerald-100 text-emerald-800 border-emerald-300",dot: "bg-emerald-600", step: 6 },
  Rejected:                        { label: "Rejected",                 color: "bg-red-100 text-red-700 border-red-200",            dot: "bg-red-500",     step: -1 },
  Disputed:                        { label: "Disputed",                 color: "bg-red-100 text-red-700 border-red-250",            dot: "bg-red-500",     step: -2 },
  Pending:                         { label: "Awaiting Acceptance",      color: "bg-amber-100 text-amber-800 border-amber-300",      dot: "bg-amber-500",   step: 1 },
};

const TIMELINE_STEPS = [
  "Placed", "Waiting Farmer", "Confirmed", "Shipping", "Delivered"
];

function getStepIndex(status) {
  return STATUS_CONFIG[status]?.step ?? 0;
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "bg-gray-100 text-gray-600 border-gray-200", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border `}>
      <span className={`w-1.5 h-1.5 rounded-full `} />
      {cfg.label}
    </span>
  );
}

function OrderTimeline({ status }) {
  const currentStep = getStepIndex(status);
  const isRejected = status === "Rejected";
  return (
    <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-1">
      {TIMELINE_STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center shrink-0" style={{minWidth:44}}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 `}>
              {isRejected && i === 1 ? <XCircle size={12} /> :
               i <= currentStep && !isRejected ? <CheckCircle size={12} /> :
               <span className="text-[9px] font-black">{i + 1}</span>}
            </div>
            <span className={`	ext-[9px] font-bold mt-1 text-center leading-tight `} style={{maxWidth:44}}>
              {label}
            </span>
          </div>
          {i < TIMELINE_STEPS.length - 1 && (
            <div className={`h-0.5 flex-1 mb-4 `} style={{minWidth:12}} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function OrderCard({ order, onTrack, onConfirmDelivery, onCancelOrder }) {
  const [expanded, setExpanded] = useState(false);
  const isActive = !["Completed", "Rejected", "Delivered", "Waiting Customer Confirmation"].includes(order.status);
  const canConfirm = ["Shipped", "Delivered", "Out For Delivery", "Waiting Customer Confirmation"].includes(order.status);
  const canTrack = ["Shipped", "Confirmed", "WaitingFarmerConfirmation", "Out For Delivery", "Accepted", "Waiting Farmer Confirmation", "Packed"].includes(order.status);

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className={`g-white rounded-2xl border overflow-hidden shadow-sm `}>
      {isActive && order.status !== "PendingPayment" && (
        <div className="h-1 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400" />
      )}
      <div className="p-5">
        <div className="flex justify-between items-start gap-3 mb-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order #{order.id}</span>
              <StatusBadge status={order.status} />
            </div>
            <h3 className="font-black text-gray-900 text-lg leading-tight">{order.product_name}</h3>
            <p className="text-sm text-gray-500 font-semibold mt-0.5">
              from <span className="text-green-700 font-black">{order.farmer_name}</span>
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-black text-green-700">&#8377;{order.total_price}</p>
            <p className="text-[10px] text-gray-400 font-semibold">{order.quantity_ordered} unit(s)</p>
          </div>
        </div>

        <OrderTimeline status={order.status} />

        {order.status === "WaitingFarmerConfirmation" && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <Bell size={13} className="text-amber-500 mt-0.5 shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-amber-800">Payment sent! Farmer is checking GPay/PhonePe. Confirms when they verify payment.</p>
          </div>
        )}
        {order.status === "Confirmed" && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle size={13} className="text-green-600 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-green-800">Payment confirmed! Farmer is preparing your order for {order.delivery_type === "Pickup" ? "pickup" : "delivery"}.</p>
          </div>
        )}
        {order.status === "Shipped" && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
            <Truck size={13} className="text-blue-600 mt-0.5 shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-blue-800">Out for delivery! Click Track Live to see the map.</p>
          </div>
        )}
        {order.status === "Rejected" && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
            <XCircle size={13} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-red-800">Rejected by farmer. Contact them or place a new order.</p>
          </div>
        )}
        {order.status === "Completed" && (
          <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
            <CheckCircle size={13} className="text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-emerald-800">Order completed! Thank you for shopping on Naadan.</p>
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center gap-1 bg-transparent border-none cursor-pointer p-0">
          {expanded ? "Hide Details" : "View Details"}
          <ChevronRight size={12} className={`	ransition-transform `} />
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3">
                {[
                  { label: "Date", value: order.created_at ? new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-" },
                  { label: "Payment Method", value: order.payment_method || "UPI" },
                  { label: "Delivery", value: order.delivery_type || "Pickup" },
                  { label: "Payment Status", value: order.payment_status || "Unpaid", highlight: order.payment_status === "Verified" ? "text-green-700" : order.payment_status === "Paid" ? "text-amber-600" : "text-gray-600" },
                  order.upi_ref ? { label: "UPI Ref", value: order.upi_ref } : null,
                  order.farmer_phone ? { label: "Farmer Phone", value: order.farmer_phone } : null,
                ].filter(Boolean).map((row) => (
                  <div key={row.label}>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">{row.label}</span>
                    <span className={`	ext-xs font-bold `}>{row.value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-2 mt-4 flex-wrap">
          {["PendingPayment", "WaitingFarmerConfirmation"].includes(order.status) && onCancelOrder && (
            <button onClick={() => onCancelOrder(order.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-extrabold rounded-xl border border-red-200 cursor-pointer transition-colors shadow-sm">
              ❌ Cancel Order
            </button>
          )}
          {canTrack && (
            <button onClick={() => onTrack(order.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-extrabold rounded-xl border-none cursor-pointer transition-colors shadow-sm">
              <Navigation size={12} /> Track Live
            </button>
          )}
          {canConfirm && (
            <button onClick={() => onConfirmDelivery(order.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold rounded-xl border-none cursor-pointer transition-colors shadow-sm">
              <CheckCircle size={12} /> Confirm Received
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function NotifToast({ notif, onDismiss }) {
  const isError = notif.type === "error";
  return (
    <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
      className={`mb-3 p-4 rounded-2xl border flex items-start gap-3 shadow-md `}>
      <Bell size={15} className={`mt-0.5 shrink-0 `} />
      <div className="flex-1 min-w-0">
        <p className={`	ext-sm font-black `}>{notif.message}</p>
        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{notif.time.toLocaleTimeString()}</p>
      </div>
      <button onClick={() => onDismiss(notif.id)}
        className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer text-lg leading-none shrink-0 mt-0.5">&times;</button>
    </motion.div>
  );
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [statusCache, setStatusCache] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await ordersAPI.getBuyerOrders();
      const newOrders = Array.isArray(res.data) ? res.data : [];
      const newNotifs = [];
      newOrders.forEach(o => {
        const prev = statusCache[o.id];
        if (prev && prev !== o.status) {
          const cfg = STATUS_CONFIG[o.status];
          newNotifs.push({ id: `${Date.now()}-${o.id}`, message: `Order #${o.id} (${o.product_name}): ${cfg?.label || o.status}`, type: o.status === "Rejected" ? "error" : "success", time: new Date() });
        }
      });
      if (newNotifs.length) setNotifications(prev => [...newNotifs, ...prev].slice(0, 8));
      const cache = {};
      newOrders.forEach(o => { cache[o.id] = o.status; });
      setStatusCache(cache);
      setOrders(newOrders);
      setLastRefresh(new Date());
    } catch (err) { console.error("Failed to fetch orders:", err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [statusCache]);

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/auth"); return; }
    fetchOrders(false);
    const interval = setInterval(() => fetchOrders(true), 15000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleConfirmDelivery = async (orderId) => {
    if (!window.confirm("Confirm you have received this order?")) return;
    try { await ordersAPI.updateStatus(orderId, "Completed"); fetchOrders(true); }
    catch (err) { alert("Error: " + (err.response?.data?.msg || err.message)); }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      setRefreshing(true);
      await ordersAPI.updateStatus(orderId, "Cancelled");
      alert("Order cancelled successfully.");
      fetchOrders(true);
    } catch (err) {
      alert("Error: " + (err.response?.data?.msg || err.message));
    } finally {
      setRefreshing(false);
    }
  };

  const dismissNotif = (id) => setNotifications(prev => prev.filter(n => n.id !== id));

  const activeCount = orders.filter(o => !["Completed","Rejected"].includes(o.status)).length;
  const filteredOrders = orders.filter(o => {
    if (filter === "active") return !["Completed","Rejected"].includes(o.status);
    if (filter === "completed") return o.status === "Completed";
    if (filter === "rejected") return o.status === "Rejected";
    return true;
  });

  const FILTERS = [
    { key: "all",       label: "All",       count: orders.length },
    { key: "active",    label: "Active",    count: activeCount },
    { key: "completed", label: "Completed", count: orders.filter(o => o.status === "Completed").length },
    { key: "rejected",  label: "Rejected",  count: orders.filter(o => o.status === "Rejected").length },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 font-sans">
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Package size={20} className="text-green-700" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 leading-none">My Orders</h1>
              {activeCount > 0 && <span className="text-xs font-black text-green-700">{activeCount} active order{activeCount > 1 ? "s" : ""}</span>}
            </div>
          </div>
          <p className="text-gray-400 font-semibold text-xs mt-1">
            Auto-refreshes every 15s &bull; Last: {lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </p>
        </div>
        <button onClick={() => fetchOrders(true)} disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-sm rounded-xl cursor-pointer shadow-sm disabled:opacity-60">
          <RefreshCw size={14} className={`refreshing ? "animate-spin" : ""`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <AnimatePresence>
        {notifications.slice(0, 3).map(n => <NotifToast key={n.id} notif={n} onDismiss={dismissNotif} />)}
      </AnimatePresence>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTERS.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer shrink-0 `}>
            {tab.label}
            {tab.count > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] `}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="flex justify-between">
                <div className="space-y-2"><div className="h-3 w-20 bg-gray-100 rounded-full" /><div className="h-5 w-48 bg-gray-200 rounded-full" /><div className="h-3 w-32 bg-gray-100 rounded-full" /></div>
                <div className="h-8 w-16 bg-gray-100 rounded-xl" />
              </div>
              <div className="flex items-center gap-2">{[1,2,3,4,5].map(j => <div key={j} className="w-7 h-7 rounded-full bg-gray-100" />)}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredOrders.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag size={32} className="text-gray-300" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">{filter === "all" ? "No orders yet" : `No ${filter} orders`}</h3>
          <p className="text-gray-400 font-semibold text-sm mb-6">{filter === "all" ? "When you place an order it will appear here with real-time tracking." : "Switch to All to see all orders."}</p>
          {filter === "all" && (
            <button onClick={() => navigate("/buyer/search")}
              className="px-6 py-3 bg-green-700 hover:bg-green-800 text-white font-extrabold rounded-xl border-none cursor-pointer inline-flex items-center gap-2 shadow-md">
              <ShoppingBag size={16} /> Browse Products
            </button>
          )}
        </motion.div>
      )}

      {!loading && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <OrderCard key={order.id} order={order}
              onTrack={id => navigate(`/buyer/track/${id}`)}
              onConfirmDelivery={handleConfirmDelivery}
              onCancelOrder={handleCancelOrder} />
          ))}
        </div>
      )}
    </div>
  );
}
