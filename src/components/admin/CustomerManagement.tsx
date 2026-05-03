import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Mail, Phone, Calendar, DollarSign, Tag, Eye, FileEdit as Edit, Trash2, X, Download, RefreshCw } from 'lucide-react';
import { getContactsByShop } from '../../services/crmService';
import { CRMContact } from '../../types';
import { format } from 'date-fns';

interface CustomerManagementProps {
  selectedShopId?: string;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ selectedShopId }) => {
  const [customers, setCustomers] = useState<CRMContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState<string | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'web' | 'telegram'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CRMContact | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!selectedShopId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getContactsByShop(selectedShopId);
        setCustomers(data);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [selectedShopId]);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.phone?.includes(searchTerm) ||
                         customer.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = filterTag === 'all' || customer.tags.includes(filterTag);
    const source = customer.telegramId ? 'telegram' : 'web';
    const matchesSource = activeTab === 'all' || source === activeTab;
    return matchesSearch && matchesTag && matchesSource;
  });

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'VIP': return 'bg-yellow-100 text-yellow-800';
      case 'Wholesale': return 'bg-blue-100 text-blue-800';
      case 'Regular': return 'bg-green-100 text-green-800';
      case 'New': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRefresh = async () => {
    if (!selectedShopId) return;
    try {
      setRefreshing(true);
      const data = await getContactsByShop(selectedShopId);
      setCustomers(data);
    } catch (err) {
      console.error('Error refreshing customers:', err);
      alert('Failed to refresh customer data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Username', 'Email', 'Phone', 'Total Orders', 'Total Spent', 'Last Order', 'Tags', 'Source'];
    const csvData = filteredCustomers.map(customer => [
      customer.name || 'Unknown',
      customer.username || '',
      customer.email || '',
      customer.phone || '',
      customer.totalOrders,
      customer.totalSpent.toFixed(2),
      customer.lastOrderDate ? format(customer.lastOrderDate, 'yyyy-MM-dd') : '',
      customer.tags.join('; '),
      customer.telegramId ? 'Telegram' : 'Web'
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-3">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-telegram-secondary-bg rounded w-1/4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-telegram-secondary-bg rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedShopId) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-telegram-hint" />
        <h3 className="mt-2 text-sm font-medium text-telegram-text">No Shop Selected</h3>
        <p className="mt-1 text-sm text-telegram-hint">
          Please select a shop to view its customers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-telegram-text">Customer Management</h3>
          <p className="text-xs text-telegram-hint">View and manage your customers</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-2 bg-telegram-button text-telegram-button-text rounded-lg text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredCustomers.length === 0}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Total Customers</p>
              <p className="text-lg font-bold text-telegram-text">{customers.length}</p>
            </div>
            <Users className="h-6 w-6 text-telegram-button" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Web Customers</p>
              <p className="text-lg font-bold text-telegram-button">
                {customers.filter(c => !c.telegramId).length}
              </p>
            </div>
            <Users className="h-6 w-6 text-telegram-button" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">Telegram</p>
              <p className="text-lg font-bold text-green-600">
                {customers.filter(c => c.telegramId).length}
              </p>
            </div>
            <Users className="h-6 w-6 text-green-500" />
          </div>
        </div>
        <div className="bg-telegram-secondary-bg rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-telegram-hint">VIP</p>
              <p className="text-lg font-bold text-yellow-600">
                {customers.filter(c => c.tags.includes('VIP')).length}
              </p>
            </div>
            <Tag className="h-6 w-6 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Customer Source Tabs */}
      <div className="bg-telegram-secondary-bg rounded-lg">
        <div className="border-b border-telegram-hint/20">
          <nav className="flex space-x-4 px-3 overflow-x-auto" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-telegram-button text-telegram-button'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              All ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                activeTab === 'web'
                  ? 'border-telegram-button text-telegram-button'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              Web ({customers.filter(c => !c.telegramId).length})
            </button>
            <button
              onClick={() => setActiveTab('telegram')}
              className={`py-3 px-2 border-b-2 font-medium text-xs transition-colors whitespace-nowrap ${
                activeTab === 'telegram'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-telegram-hint hover:text-telegram-text'
              }`}
            >
              Telegram ({customers.filter(c => c.telegramId).length})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-telegram-secondary-bg rounded-lg p-3">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-telegram-hint" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text text-sm focus:ring-2 focus:ring-telegram-button focus:border-transparent"
            />
          </div>

          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="px-3 py-2 bg-telegram-bg border border-telegram-hint/20 rounded-lg text-telegram-text text-sm focus:ring-2 focus:ring-telegram-button focus:border-transparent"
          >
            <option value="all">All Tags</option>
            {Array.from(new Set(customers.flatMap(c => c.tags))).map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <div className="text-xs text-telegram-hint whitespace-nowrap">
            Showing {filteredCustomers.length} of {customers.length}
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="bg-telegram-secondary-bg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-telegram-bg">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Last Order
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-telegram-hint uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-telegram-secondary-bg divide-y divide-telegram-hint/10">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-telegram-bg">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-telegram-button flex items-center justify-center">
                          <span className="text-xs font-medium text-telegram-button-text">
                            {customer.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center gap-2">
                          <div className="text-xs font-medium text-telegram-text">{customer.name || 'Unknown'}</div>
                          {customer.telegramId && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">TG</span>
                          )}
                        </div>
                        {customer.username && (
                          <div className="text-xs text-telegram-hint">@{customer.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs text-telegram-text">
                      {customer.email && (
                        <div className="flex items-center">
                          <Mail className="w-3 h-3 mr-1 text-telegram-hint" />
                          {customer.email}
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center mt-1">
                          <Phone className="w-3 h-3 mr-1 text-telegram-hint" />
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-telegram-text">{customer.totalOrders}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs font-medium text-telegram-text">${customer.totalSpent.toFixed(2)}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-xs text-telegram-text">
                      {customer.lastOrderDate ? format(customer.lastOrderDate, 'MMM dd, yyyy') : 'Never'}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map((tag, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs font-medium">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-telegram-button hover:text-telegram-button/80 p-1 rounded"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-telegram-hint" />
            <h3 className="mt-2 text-sm font-medium text-telegram-text">
              {customers.length === 0 ? 'No customers yet' : 'No customers match your filters'}
            </h3>
            <p className="mt-1 text-xs text-telegram-hint">
              {customers.length === 0
                ? 'Customers will appear here once they place orders.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

// Customer Detail Modal Component
interface CustomerDetailModalProps {
  customer: CRMContact;
  onClose: () => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({ customer, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-telegram-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-telegram-hint/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-telegram-text">Customer Details</h2>
            <button
              onClick={onClose}
              className="text-telegram-hint hover:text-telegram-text p-2 rounded-full hover:bg-telegram-secondary-bg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Customer Info */}
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-telegram-button flex items-center justify-center">
              <span className="text-lg font-bold text-telegram-button-text">
                {customer.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-telegram-text">{customer.name || 'Unknown'}</h3>
                {customer.telegramId && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Telegram</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {customer.tags.map((tag, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTagColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Source Badge */}
          <div className="bg-telegram-secondary-bg rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-telegram-hint">Customer Since:</span>
                <p className="font-medium text-telegram-text mt-0.5">
                  {format(customer.createdAt, 'MMM dd, yyyy')}
                </p>
              </div>
              <div>
                <span className="text-telegram-hint">Source:</span>
                <p className="font-medium text-telegram-text mt-0.5">
                  {customer.telegramId ? 'Telegram Bot' : 'Web Portal'}
                </p>
              </div>
              <div>
                <span className="text-telegram-hint">Activity Status:</span>
                <p className="font-medium text-telegram-text mt-0.5">
                  <span className={`px-2 py-0.5 rounded ${
                    customer.activityStatus === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {customer.activityStatus === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-telegram-text mb-2 text-sm">Contact Information</h4>
              <div className="space-y-2 text-xs">
                {customer.email && (
                  <div className="flex items-center">
                    <Mail className="w-3 h-3 mr-2 text-telegram-hint" />
                    <span className="text-telegram-text">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center">
                    <Phone className="w-3 h-3 mr-2 text-telegram-hint" />
                    <span className="text-telegram-text">{customer.phone}</span>
                  </div>
                )}
                {customer.username && (
                  <div className="flex items-center">
                    <span className="w-3 h-3 mr-2 text-telegram-hint">@</span>
                    <span className="text-telegram-text">{customer.username}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-telegram-text mb-2 text-sm">Order Statistics</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Total Orders:</span>
                  <span className="font-medium text-telegram-text">{customer.totalOrders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Total Spent:</span>
                  <span className="font-medium text-telegram-text">${customer.totalSpent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Average Order:</span>
                  <span className="font-medium text-telegram-text">
                    ${customer.totalOrders > 0 ? (customer.totalSpent / customer.totalOrders).toFixed(2) : '0.00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Last Order:</span>
                  <span className="font-medium text-telegram-text">
                    {customer.lastOrderDate ? format(customer.lastOrderDate, 'MMM dd, yyyy') : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-telegram-hint">Customer Since:</span>
                  <span className="font-medium text-telegram-text">
                    {format(customer.createdAt, 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-telegram-hint/20 bg-telegram-secondary-bg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-telegram-button text-telegram-button-text rounded-lg transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;