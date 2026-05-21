import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

import Layout from './components/layout/Layout';

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
import UserList from './pages/users/UserList';
import UserForm from './pages/users/UserForm';
import PublicProductDetail from './pages/public/PublicProductDetail';

import { isAuthenticated, hasMenuAccess, getDefaultAppRoute } from './utils/auth';

const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

const MenuRoute = ({ children, menuKey }) => {
  if (!hasMenuAccess(menuKey)) {
    return <Navigate to={getDefaultAppRoute()} replace />;
  }
  return children;
};

MenuRoute.propTypes = {
  children: PropTypes.node.isRequired,
  menuKey: PropTypes.string.isRequired,
};

const AppIndexRedirect = () => <Navigate to={getDefaultAppRoute()} replace />;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Login />} />

          <Route path="/public/product/:id" element={<PublicProductDetail />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AppIndexRedirect />} />

            <Route
              path="products"
              element={
                <MenuRoute menuKey="products">
                  <ProductList />
                </MenuRoute>
              }
            />
            <Route
              path="products/new"
              element={
                <MenuRoute menuKey="products">
                  <ProductForm />
                </MenuRoute>
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <MenuRoute menuKey="products">
                  <ProductForm />
                </MenuRoute>
              }
            />

            <Route
              path="folders"
              element={
                <MenuRoute menuKey="folders">
                  <FolderList />
                </MenuRoute>
              }
            />
            <Route
              path="folders/new"
              element={
                <MenuRoute menuKey="folders">
                  <FolderForm />
                </MenuRoute>
              }
            />
            <Route
              path="folders/:id/edit"
              element={
                <MenuRoute menuKey="folders">
                  <FolderForm />
                </MenuRoute>
              }
            />

            <Route
              path="buyers"
              element={
                <MenuRoute menuKey="buyers">
                  <BuyerList />
                </MenuRoute>
              }
            />
            <Route
              path="buyers/new"
              element={
                <MenuRoute menuKey="buyers">
                  <BuyerForm />
                </MenuRoute>
              }
            />
            <Route
              path="buyers/:id/edit"
              element={
                <MenuRoute menuKey="buyers">
                  <BuyerForm />
                </MenuRoute>
              }
            />

            <Route
              path="orders"
              element={
                <MenuRoute menuKey="orders">
                  <OrderList />
                </MenuRoute>
              }
            />
            <Route
              path="orders/new"
              element={
                <MenuRoute menuKey="orders">
                  <OrderForm />
                </MenuRoute>
              }
            />
            <Route
              path="orders/:id/edit"
              element={
                <MenuRoute menuKey="orders">
                  <OrderForm />
                </MenuRoute>
              }
            />

            <Route
              path="reports"
              element={
                <MenuRoute menuKey="reports">
                  <ReportList />
                </MenuRoute>
              }
            />
            <Route
              path="reports/:id"
              element={
                <MenuRoute menuKey="reports">
                  <ReportDetail />
                </MenuRoute>
              }
            />

            <Route
              path="users"
              element={
                <MenuRoute menuKey="users">
                  <UserList />
                </MenuRoute>
              }
            />
            <Route
              path="users/new"
              element={
                <MenuRoute menuKey="users">
                  <UserForm />
                </MenuRoute>
              }
            />
            <Route
              path="users/:id/edit"
              element={
                <MenuRoute menuKey="users">
                  <UserForm />
                </MenuRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
