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

import { isAuthenticated, hasMenuAccess, isMenuEditor, getDefaultAppRoute } from './utils/auth';

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

const EditorRoute = ({ children, menuKey }) => {
  if (!hasMenuAccess(menuKey)) {
    return <Navigate to={getDefaultAppRoute()} replace />;
  }
  if (!isMenuEditor(menuKey)) {
    return <Navigate to={`/app/${menuKey}`} replace />;
  }
  return children;
};

EditorRoute.propTypes = {
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
                <EditorRoute menuKey="products">
                  <ProductForm />
                </EditorRoute>
              }
            />
            <Route
              path="products/:id/edit"
              element={
                <EditorRoute menuKey="products">
                  <ProductForm />
                </EditorRoute>
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
                <EditorRoute menuKey="folders">
                  <FolderForm />
                </EditorRoute>
              }
            />
            <Route
              path="folders/:id/edit"
              element={
                <EditorRoute menuKey="folders">
                  <FolderForm />
                </EditorRoute>
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
                <EditorRoute menuKey="buyers">
                  <BuyerForm />
                </EditorRoute>
              }
            />
            <Route
              path="buyers/:id/edit"
              element={
                <EditorRoute menuKey="buyers">
                  <BuyerForm />
                </EditorRoute>
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
                <EditorRoute menuKey="orders">
                  <OrderForm />
                </EditorRoute>
              }
            />
            <Route
              path="orders/:id/edit"
              element={
                <EditorRoute menuKey="orders">
                  <OrderForm />
                </EditorRoute>
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
                <EditorRoute menuKey="users">
                  <UserForm />
                </EditorRoute>
              }
            />
            <Route
              path="users/:id/edit"
              element={
                <EditorRoute menuKey="users">
                  <UserForm />
                </EditorRoute>
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
