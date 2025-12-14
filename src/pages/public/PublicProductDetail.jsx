import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { productsAPI } from '../../utils/apiProducts';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const PublicProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData = await productsAPI.getProduct(id);
        setProduct(productData);
      } catch (err) {
        console.error('Error loading product:', err);
        setError('Product not found');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner text="Loading product..." />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600">{error || 'The product you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Product Image */}
          <div className="w-full h-64 md:h-96 bg-gray-100 flex items-center justify-center p-8">
            {product.picture_url ? (
              <img
                src={`https://api-inventory.isavralabel.com/kayu-manis-properti${product.picture_url}`}
                alt={product.description || product.km_code}
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                <Package className="w-24 h-24 text-gray-400" />
              </div>
            )}
          </div>

          {/* Product Information */}
          <div className="p-6 md:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.description || product.km_code}
              </h1>
              <p className="text-lg text-gray-600 font-mono">
                Code: {product.km_code}
              </p>
              {product.client_code && (
                <p className="text-sm text-gray-500 mt-1">
                  Client Code: {product.client_code}
                </p>
              )}
            </div>

            {/* Size Information */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Size Specifications</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Width</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {product.size_width || '-'} <span className="text-lg font-normal text-gray-600">cm</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Depth</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {product.size_depth || '-'} <span className="text-lg font-normal text-gray-600">cm</span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-1">Height</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {product.size_height || '-'} <span className="text-lg font-normal text-gray-600">cm</span>
                  </div>
                </div>
              </div>
              {product.size_width && product.size_depth && product.size_height && (
                <div className="mt-4 text-center text-gray-600">
                  <span className="text-lg">
                    Dimensions: {product.size_width} × {product.size_depth} × {product.size_height} cm
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProductDetail;

