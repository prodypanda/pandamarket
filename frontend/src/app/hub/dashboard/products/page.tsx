import { Plus, Search, Filter, MoreVertical, Edit, Trash2 } from 'lucide-react';

export default function ProductsPage() {
  const products = [
    { id: 1, name: 'Premium Wireless Headphones', price: 'TND 149', status: 'Published', stock: 24, sales: 12 },
    { id: 2, name: 'Ergonomic Office Chair', price: 'TND 399', status: 'Published', stock: 5, sales: 8 },
    { id: 3, name: 'Smart Fitness Watch', price: 'TND 199', status: 'Pending', stock: 0, sales: 0 },
    { id: 4, name: 'Mechanical Keyboard', price: 'TND 249', status: 'Published', stock: 12, sales: 34 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your product catalog and inventory.</p>
        </div>
        <button className="flex items-center px-4 py-2 bg-[#16C784] text-white font-medium rounded-lg shadow-md hover:bg-[#14b876] hover:shadow-lg transform hover:-translate-y-0.5 transition-all">
          <Plus className="w-5 h-5 mr-2" />
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search products..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#16C784] focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <button className="flex items-center px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <th className="px-6 py-4 font-semibold">Product Name</th>
                <th className="px-6 py-4 font-semibold">Price</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Inventory</th>
                <th className="px-6 py-4 font-semibold">Sales</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg"></div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-[#16C784] transition-colors">{product.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.price}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      product.status === 'Published' 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className={product.stock < 10 ? 'text-red-600 font-medium' : ''}>
                      {product.stock} in stock
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{product.sales}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="p-2 text-gray-400 hover:text-[#16C784] hover:bg-[#16C784]/5 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <span className="text-sm text-gray-500">Showing 1 to 4 of 4 products</span>
          <div className="flex space-x-2">
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-600 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
