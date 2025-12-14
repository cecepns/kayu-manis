import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

// Components
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import ProductList from './pages/products/ProductList';
import ProductForm from './pages/products/ProductForm';
import FolderList from './pages/folders/FolderList';
import FolderForm from './pages/folders/FolderForm';
import BuyerList from './pages/buyers/BuyerList';
import BuyerForm from './pages/buyers/BuyerForm';
import OrderList from './pages/orders/OrderList';
import OrderForm from './pages/orders/OrderForm';
import ReportList from './pages/reports/ReportList';
import ReportDetail from './pages/reports/ReportDetail';
import PublicProductDetail from './pages/public/PublicProductDetail';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/" replace />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Login Page */}
          <Route path="/" element={<Login />} />
          
          {/* Public Routes */}
          <Route path="/public/product/:id" element={<PublicProductDetail />} />
          
          {/* Main App Routes - Protected */}
          <Route 
            path="/app" 
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Products */}
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            
            {/* Folders */}
            <Route path="folders" element={<FolderList />} />
            <Route path="folders/new" element={<FolderForm />} />
            <Route path="folders/:id/edit" element={<FolderForm />} />
            
            {/* Buyers */}
            <Route path="buyers" element={<BuyerList />} />
            <Route path="buyers/new" element={<BuyerForm />} />
            <Route path="buyers/:id/edit" element={<BuyerForm />} />
            
            {/* Orders */}
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/new" element={<OrderForm />} />
            <Route path="orders/:id/edit" element={<OrderForm />} />
            
            {/* Reports */}
            <Route path="reports" element={<ReportList />} />
            <Route path="reports/:id" element={<ReportDetail />} />
          </Route>

          {/* Redirect any unknown routes to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;