import { Folder, Package, Users, ShoppingCart, FileText, UserCog } from 'lucide-react';

export const MENU_ITEMS = [
  {
    key: 'folders',
    path: '/app/folders',
    icon: Folder,
    label: 'Folders',
    description: 'Organize products',
  },
  {
    key: 'products',
    path: '/app/products',
    icon: Package,
    label: 'Products',
    description: 'Manage furniture catalog',
  },
  {
    key: 'buyers',
    path: '/app/buyers',
    icon: Users,
    label: 'Buyers',
    description: 'Manage buyer information',
  },
  {
    key: 'orders',
    path: '/app/orders',
    icon: ShoppingCart,
    label: 'Orders',
    description: 'Process customer orders',
  },
  {
    key: 'reports',
    path: '/app/reports',
    icon: FileText,
    label: 'Reports',
    description: 'View order reports',
  },
  {
    key: 'users',
    path: '/app/users',
    icon: UserCog,
    label: 'Users',
    description: 'Manage users & access',
  },
];

export const MENU_PERMISSION_OPTIONS = MENU_ITEMS.map(({ key, label, description }) => ({
  key,
  label,
  description,
}));
