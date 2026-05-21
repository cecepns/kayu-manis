import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import PropTypes from "prop-types";
import Logo from "../../assets/logo.jpeg";
import { getAllowedMenuItems } from "../../utils/auth";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const menuItems = getAllowedMenuItems();

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-4 sm:p-6 h-full overflow-y-auto">
          <div className="flex items-center justify-center pb-4">
            <img src={Logo} alt="Logo" className="w-24 h-auto" />
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                  isActive(item.path)
                    ? "bg-primary-50 text-primary-700 border-r-2 border-primary-600"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive(item.path)
                      ? "text-primary-600"
                      : "text-gray-400 group-hover:text-gray-600"
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {item.description}
                  </div>
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
};

Sidebar.propTypes = {
  isOpen: PropTypes.bool,
  onClose: PropTypes.func,
};

Sidebar.defaultProps = {
  isOpen: false,
  onClose: () => {},
};

export default Sidebar;
