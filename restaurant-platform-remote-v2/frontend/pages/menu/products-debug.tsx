// Debug version of the products page to bypass auth issues
import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function MenuProductsDebugPage() {
  const [authState, setAuthState] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Check auth state
    const token = localStorage.getItem('auth-token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setAuthState({ token, user });

        // Load data
        loadData(token);
      } catch (e) {
        setError('Invalid auth data in localStorage');
        setLoading(false);
      }
    } else {
      setError('No auth data found. Please login first.');
      setLoading(false);
    }
  }, []);

  const loadData = async (token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Load categories
      const categoriesRes = await fetch(`${API_URL}/api/v1/menu/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.categories || []);
      } else {
        throw new Error(`Categories API failed: ${categoriesRes.status}`);
      }

      // Load products
      const productsRes = await fetch(`${API_URL}/api/v1/menu/products/paginated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ page: 1, limit: 50 })
      });

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      } else {
        throw new Error(`Products API failed: ${productsRes.status}`);
      }

      setLoading(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoading(false);
    }
  };

  const performLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailOrUsername: 'admin@test.com',
          password: 'password123'
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth-token', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        setAuthState({ token: data.accessToken, user: data.user });
        await loadData(data.accessToken);
      } else {
        const errorData = await response.json();
        setError(`Login failed: ${errorData.message}`);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button
            onClick={performLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Auto Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Menu Products Debug - Restaurant Management</title>
      </Head>

      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900">Menu Products Debug</h1>
            <p className="text-sm text-gray-600">
              User: {authState?.user?.email} | Role: {authState?.user?.role}
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Categories Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold mb-4">Categories ({categories.length})</h2>
                <div className="space-y-2">
                  <div className="p-2 bg-blue-50 text-blue-700 rounded">
                    All Products ({products.length})
                  </div>
                  {categories.map((category) => (
                    <div key={category.id} className="p-2 hover:bg-gray-50 rounded cursor-pointer">
                      <div className="font-medium">
                        {category.name?.en || 'No name'}
                      </div>
                      {category.name?.ar && (
                        <div className="text-sm text-gray-500" dir="rtl">
                          {category.name.ar}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Order: {category.displayNumber} | Active: {category.isActive ? '✅' : '❌'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Products Grid */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold mb-4">Products ({products.length})</h2>

                {products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products found
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="aspect-w-16 aspect-h-10 mb-3">
                          <div className="bg-gray-100 rounded flex items-center justify-center text-gray-500">
                            No Image
                          </div>
                        </div>

                        <h3 className="font-medium text-gray-900 mb-1">
                          {product.name?.en || 'No name'}
                        </h3>

                        {product.name?.ar && (
                          <p className="text-sm text-gray-600 mb-2" dir="rtl">
                            {product.name.ar}
                          </p>
                        )}

                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-green-600">
                            ${product.basePrice}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            product.status === 1
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {product.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-gray-500">
                          Category: {product.category?.name?.en || 'Unknown'}
                        </div>

                        {product.tags && product.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {product.tags.map((tag: string) => (
                              <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}