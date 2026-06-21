import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PickupHome from "@/pages/PickupHome";
import PickupOrder from "@/pages/PickupOrder";
import SorterOrders from "@/pages/SorterOrders";
import SorterOrderDetail from "@/pages/SorterOrderDetail";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminTransactions from "@/pages/AdminTransactions";
import AdminLocked from "@/pages/AdminLocked";
import AdminPricing from "@/pages/AdminPricing";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PickupHome />} />
        <Route path="/order/:id" element={<PickupOrder />} />
        <Route path="/sorter" element={<SorterOrders />} />
        <Route path="/sorter/order/:id" element={<SorterOrderDetail />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/transactions" element={<AdminTransactions />} />
        <Route path="/admin/locked" element={<AdminLocked />} />
        <Route path="/admin/pricing" element={<AdminPricing />} />
      </Routes>
    </Router>
  );
}
