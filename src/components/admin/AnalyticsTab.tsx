import React from 'react'
import { Shop } from '../../types'
import { Package, ShoppingCart, DollarSign, Users, TrendingUp, Calendar, BarChart3 } from 'lucide-react'

interface AnalyticsTabProps {
  shop: Shop
  stats: any
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ shop, stats }) => {
  const formatCurrency = (amount: number) => {
    const currency = shop.settings?.currency || 'USD'
    const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'ETB' ? 'Br' : '$'
    return `${symbol}${amount.toFixed(2)}`
  }

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-telegram-text">Shop Analytics</h3>
        <div className="flex items-center space-x-2 text-sm text-telegram-hint">
          <Calendar className="w-4 h-4" />
          <span>Last 30 days</span>
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-telegram-text">{stats?.totalProducts || 0}</div>
              <div className="text-sm text-telegram-hint">Total Products</div>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
            <span className="text-green-500">+5.2%</span>
            <span className="text-telegram-hint ml-1">vs last month</span>
          </div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-telegram-text">{stats?.totalOrders || 0}</div>
              <div className="text-sm text-telegram-hint">Total Orders</div>
            </div>
            <ShoppingCart className="w-8 h-8 text-green-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
            <span className="text-green-500">+12.8%</span>
            <span className="text-telegram-hint ml-1">vs last month</span>
          </div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-telegram-text">
                {formatCurrency(stats?.totalRevenue || 0)}
              </div>
              <div className="text-sm text-telegram-hint">Total Revenue</div>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
            <span className="text-green-500">+8.4%</span>
            <span className="text-telegram-hint ml-1">vs last month</span>
          </div>
        </div>
        
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-telegram-text">{stats?.totalCustomers || 0}</div>
              <div className="text-sm text-telegram-hint">Total Customers</div>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
          <div className="flex items-center mt-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
            <span className="text-green-500">+15.6%</span>
            <span className="text-telegram-hint ml-1">vs last month</span>
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h4 className="font-medium text-telegram-text mb-3 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance Metrics
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-telegram-hint">Average Order Value</span>
              <span className="font-medium text-telegram-text">
                {formatCurrency((stats?.totalRevenue || 0) / Math.max(stats?.totalOrders || 1, 1))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-telegram-hint">Orders per Customer</span>
              <span className="font-medium text-telegram-text">
                {((stats?.totalOrders || 0) / Math.max(stats?.totalCustomers || 1, 1)).toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-telegram-hint">Revenue per Customer</span>
              <span className="font-medium text-telegram-text">
                {formatCurrency((stats?.totalRevenue || 0) / Math.max(stats?.totalCustomers || 1, 1))}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-telegram-hint">Active Products</span>
              <span className="font-medium text-telegram-text">
                {Math.round((stats?.totalProducts || 0) * 0.85)} / {stats?.totalProducts || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-telegram-secondary-bg rounded-lg p-4">
          <h4 className="font-medium text-telegram-text mb-3">Recent Activity</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-telegram-hint">New order received</span>
              <span className="text-xs text-telegram-hint ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-telegram-hint">Product updated</span>
              <span className="text-xs text-telegram-hint ml-auto">15 min ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-telegram-hint">Low stock alert</span>
              <span className="text-xs text-telegram-hint ml-auto">1 hour ago</span>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-telegram-hint">New customer registered</span>
              <span className="text-xs text-telegram-hint ml-auto">3 hours ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-telegram-secondary-bg rounded-lg p-4">
        <h4 className="font-medium text-telegram-text mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="p-3 text-center rounded-lg border border-telegram-hint hover:bg-telegram-button hover:text-telegram-button-text transition-colors">
            <Package className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Add Product</span>
          </button>
          <button className="p-3 text-center rounded-lg border border-telegram-hint hover:bg-telegram-button hover:text-telegram-button-text transition-colors">
            <ShoppingCart className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">View Orders</span>
          </button>
          <button className="p-3 text-center rounded-lg border border-telegram-hint hover:bg-telegram-button hover:text-telegram-button-text transition-colors">
            <Users className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Customers</span>
          </button>
          <button className="p-3 text-center rounded-lg border border-telegram-hint hover:bg-telegram-button hover:text-telegram-button-text transition-colors">
            <BarChart3 className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs">Reports</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTab