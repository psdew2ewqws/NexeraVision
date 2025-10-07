import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useAuth } from '../../src/contexts/AuthContext';
import ProtectedRoute from '../../src/components/shared/ProtectedRoute';
import { ArrowLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Branch {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: any;
}

interface Product {
  id: string;
  name: any;
  image?: string;
  pricing: any;
  category?: Category;
}

const CHANNELS = [
  { value: 'careem', label: 'Careem' },
  { value: 'talabat', label: 'Talabat' },
  { value: 'callcenter', label: 'Call Center' },
  { value: 'mobile', label: 'Mobile App' },
  { value: 'online', label: 'Online Ordering' },
];

export default function CreateMenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    branchIds: [] as string[],
    channels: [] as string[],
    productIds: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    fetchBranches();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter((product) => {
        const name = typeof product.name === 'object' ? product.name.en : product.name;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchTerm, products]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('http://localhost:3001/branches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3001/menu/products/paginated?page=1&limit=100', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
        setFilteredProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || formData.branchIds.length === 0 || formData.channels.length === 0 || formData.productIds.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/menus', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create menu');

      toast.success('Menu created successfully');
      router.push('/menu');
    } catch (error) {
      console.error('Error creating menu:', error);
      toast.error('Failed to create menu');
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (branchId: string) => {
    setFormData({
      ...formData,
      branchIds: formData.branchIds.includes(branchId)
        ? formData.branchIds.filter(id => id !== branchId)
        : [...formData.branchIds, branchId],
    });
  };

  const toggleChannel = (channel: string) => {
    setFormData({
      ...formData,
      channels: formData.channels.includes(channel)
        ? formData.channels.filter(c => c !== channel)
        : [...formData.channels, channel],
    });
  };

  const toggleProduct = (productId: string) => {
    setFormData({
      ...formData,
      productIds: formData.productIds.includes(productId)
        ? formData.productIds.filter(id => id !== productId)
        : [...formData.productIds, productId],
    });
  };

  return (
    <ProtectedRoute>
      <Head>
        <title>Create Menu | Restaurant Platform</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Create Menu</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Menu Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Menu Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Menu Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter menu name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter menu description"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Branches */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Select Branches *</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {branches.map((branch) => (
                  <label
                    key={branch.id}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.branchIds.includes(branch.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.branchIds.includes(branch.id)}
                      onChange={() => toggleBranch(branch.id)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">{branch.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Select Channels *</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CHANNELS.map((channel) => (
                  <label
                    key={channel.value}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.channels.includes(channel.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.channels.includes(channel.value)}
                      onChange={() => toggleChannel(channel.value)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm">{channel.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Products */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Select Products *</h2>

              <div className="mb-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Search products..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => {
                  const name = typeof product.name === 'object' ? product.name.en : product.name;
                  const isSelected = formData.productIds.includes(product.id);

                  return (
                    <div
                      key={product.id}
                      onClick={() => toggleProduct(product.id)}
                      className={`relative border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500'
                          : 'border-gray-300 hover:border-blue-300'
                      }`}
                    >
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={name}
                          className="w-full h-32 object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-200 rounded-t-lg flex items-center justify-center">
                          <span className="text-gray-400 text-sm">No image</span>
                        </div>
                      )}
                      <div className="p-2">
                        <h4 className="text-sm font-medium truncate">{name}</h4>
                        <p className="text-xs text-gray-500">
                          {product.pricing?.default || 0} JOD
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-sm text-gray-600 mt-4">
                {formData.productIds.length} product(s) selected
              </p>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Menu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
