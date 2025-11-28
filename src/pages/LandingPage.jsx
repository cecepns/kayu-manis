import React from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingCart, FileText, ArrowRight, CircleCheck as CheckCircle, Users, TrendingUp, Shield } from 'lucide-react';

const LandingPage = () => {
  const features = [
    {
      icon: Package,
      title: "Product Management",
      description: "Complete CRUD operations for furniture products with image upload and detailed specifications.",
      color: "text-primary-600 bg-primary-100"
    },
    {
      icon: ShoppingCart,
      title: "Order Management", 
      description: "Create and manage orders with automatic calculations for CBM, weight, and pricing.",
      color: "text-secondary-600 bg-secondary-100"
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description: "Generate detailed packing lists and invoices with professional formatting.",
      color: "text-purple-600 bg-purple-100"
    }
  ];

  const benefits = [
    "Real-time calculation of CBM and weights",
    "Professional invoice generation",
    "Image management for products",
    "Export capabilities for reports",
    "Responsive design for all devices",
    "Easy-to-use interface"
  ];

  const stats = [
    { number: "1000+", label: "Products Managed", icon: Package },
    { number: "500+", label: "Orders Processed", icon: ShoppingCart },
    { number: "99.9%", label: "Uptime Guarantee", icon: TrendingUp },
    { number: "24/7", label: "Support Available", icon: Shield }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b" data-aos="fade-down">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">FurnitureOrder</span>
            </div>
            <Link 
              to="/app/products" 
              className="btn-primary"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div data-aos="fade-right">
                <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Manage Furniture 
                  <span className="text-primary-600"> Orders</span> 
                  <br />with Ease
                </h1>
                <p className="text-xl text-gray-600 mt-6 leading-relaxed">
                  Streamline your furniture business with our comprehensive order management system. 
                  Handle products, orders, and generate professional reports all in one place.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4" data-aos="fade-right" data-aos-delay="200">
                <Link to="/app/products" className="btn-primary text-lg px-8 py-4">
                  Start Managing
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button className="btn-secondary text-lg px-8 py-4">
                  Watch Demo
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-8" data-aos="fade-right" data-aos-delay="300">
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary-100 text-primary-600 mb-2`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative" data-aos="fade-left">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                <img 
                  src="https://images.pexels.com/photos/1866149/pexels-photo-1866149.jpeg?auto=compress&cs=tinysrgb&w=600" 
                  alt="Furniture Management Dashboard"
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Modern Sofa Set</span>
                    <span className="text-primary-600 font-bold">$1,299</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>W: 180cm</div>
                    <div>D: 85cm</div>
                    <div>H: 78cm</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">In Stock - Ready to Ship</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16" data-aos="fade-up">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Your Business
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive solution provides all the tools you need to efficiently manage 
              furniture products, process orders, and generate professional reports.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="text-center group hover:transform hover:scale-105 transition-all duration-300"
                data-aos="fade-up" 
                data-aos-delay={index * 100}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${feature.color} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Why Choose Our Platform?
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Built specifically for furniture businesses, our platform offers specialized 
                features that understand your industry's unique requirements.
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8">
                <Link to="/app/products" className="btn-primary text-lg px-8 py-4">
                  Get Started Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            
            <div className="relative" data-aos="fade-left">
              <img 
                src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=800" 
                alt="Furniture Workshop"
                className="w-full h-96 object-cover rounded-2xl shadow-xl"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8" data-aos="fade-up">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join hundreds of furniture businesses already using our platform to streamline their operations.
          </p>
          <Link to="/app/products" className="bg-white text-primary-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold text-lg transition-colors duration-200 inline-flex items-center gap-2">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Package className="h-6 w-6 text-primary-400" />
              <span className="text-lg font-bold">FurnitureOrder</span>
            </div>
            <div className="text-gray-400">
              © 2025 FurnitureOrder. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;