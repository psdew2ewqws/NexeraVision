import { createContext, useContext, useState, ReactNode } from 'react'

type Language = 'en' | 'ar'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  isRTL: boolean
}

const translations = {
  en: {
    // Header
    'restaurant_management': 'Restaurant Management Dashboard',
    'system_online': 'System Online',
    'logout': 'Logout',
    
    // Stats
    'todays_sales': "Today's Sales",
    'orders_today': 'Orders Today',
    'avg_order_value': 'Avg Order Value',
    'active_branches': 'Active Branches',
    
    // Groups
    'analytics_operations': 'Analytics & Operations',
    'analytics_operations_desc': 'Charts, live orders, order history, reports',
    'branches': 'Branches',
    'branches_desc': 'Manage restaurant locations',
    'menu_management': 'Products & Menu Management',
    'menu_management_desc': 'Products, menus, availability, discounts, promocodes',
    'customer_management': 'Customer Management',
    'customer_management_desc': 'Customer info, complaints, blacklist',
    'settings': 'Settings',
    'settings_desc': 'Sounds, printing, chatbot, customers, delivery, users, phone ordering',
    
    // Analytics & Operations
    'charts_reports': 'Charts & Reports',
    'charts_reports_desc': 'View sales charts, performance analytics',
    'live_orders': 'Live Orders',
    'live_orders_desc': 'Monitor orders in real-time',
    'order_history': 'Order History',
    'order_history_desc': 'View all past transactions',
    
    // Branches
    'manage_branches': 'Manage Branches',
    'manage_branches_desc': 'Add, edit, and manage branch locations',
    
    // Menu Management
    'products_menus': 'Products & Menus',
    'products_menus_desc': 'Manage menu items and categories',
    'availability': 'Availability',
    'availability_desc': 'Set item availability and timing',
    'discounts_promocodes': 'Discounts & Promocodes',
    'discounts_promocodes_desc': 'Create promotions and discount codes',
    
    // Customer Management
    'customer_info': 'Customer Info',
    'customer_info_desc': 'View and manage customer data',
    'complaints': 'Complaints',
    'complaints_desc': 'Handle customer complaints',
    'blacklist': 'Blacklist',
    'blacklist_desc': 'Manage unwanted customers',
    
    // Settings
    'sounds': 'Sounds',
    'sounds_desc': 'Configure notification sounds',
    'printing': 'Printing',
    'printing_desc': 'Set up receipt and order printing',
    'chatbot': 'Chatbot',
    'chatbot_desc': 'Configure automated responses',
    'customers_settings': 'Customers',
    'customers_settings_desc': 'Customer management settings',
    'delivery': 'Delivery',
    'delivery_desc': 'Delivery zones and settings',
    'users': 'Users',
    'users_desc': 'Manage system users and roles',
    'phone_ordering': 'Phone Ordering',
    'phone_ordering_desc': 'Configure phone order system',
    
    // Live Orders
    'real_time': 'Real-time',
    'view_all_live_orders': 'View All Live Orders →',
    
    // System Health
    'system_health': 'System Health',
    'database': 'Database',
    'connected': 'Connected',
    'pos_integration': 'POS Integration',
    'online': 'Online',
    'payment_gateway': 'Payment Gateway',
    'active': 'Active',
    'phone_system': 'Phone System',
    'pending_setup': 'Pending Setup',
    
    // Order Status
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready': 'Ready',
    'delivered': 'Delivered',
    
    // Common
    'management_sections': 'Restaurant Management Sections',
    'overview': 'Overview',
    'analytics': 'Analytics',
    'orders': 'Orders',
    'operations': 'Operations',
    'manage': 'Manage'
  },
  ar: {
    // Header
    'restaurant_management': 'لوحة إدارة المطاعم',
    'system_online': 'النظام متصل',
    'logout': 'تسجيل خروج',
    
    // Stats
    'todays_sales': 'مبيعات اليوم',
    'orders_today': 'طلبات اليوم',
    'avg_order_value': 'متوسط قيمة الطلب',
    'active_branches': 'الفروع النشطة',
    
    // Groups
    'analytics_operations': 'التحليلات والعمليات',
    'analytics_operations_desc': 'الرسوم البيانية، الطلبات المباشرة، تاريخ الطلبات، التقارير',
    'branches': 'الفروع',
    'branches_desc': 'إدارة مواقع المطاعم',
    'menu_management': 'إدارة المنتجات والقوائم',
    'menu_management_desc': 'المنتجات، القوائم، التوفر، الخصومات، رموز الترويج',
    'customer_management': 'إدارة العملاء',
    'customer_management_desc': 'معلومات العملاء، الشكاوى، القائمة السوداء',
    'settings': 'الإعدادات',
    'settings_desc': 'الأصوات، الطباعة، الشات بوت، العملاء، التوصيل، المستخدمين، طلبات الهاتف',
    
    // Analytics & Operations
    'charts_reports': 'الرسوم البيانية والتقارير',
    'charts_reports_desc': 'عرض رسوم المبيعات وتحليل الأداء',
    'live_orders': 'الطلبات المباشرة',
    'live_orders_desc': 'مراقبة الطلبات في الوقت الفعلي',
    'order_history': 'تاريخ الطلبات',
    'order_history_desc': 'عرض جميع المعاملات السابقة',
    
    // Branches
    'manage_branches': 'إدارة الفروع',
    'manage_branches_desc': 'إضافة وتعديل وإدارة مواقع الفروع',
    
    // Menu Management
    'products_menus': 'المنتجات والقوائم',
    'products_menus_desc': 'إدارة عناصر القائمة والفئات',
    'availability': 'التوفر',
    'availability_desc': 'تحديد توفر العناصر والتوقيت',
    'discounts_promocodes': 'الخصومات ورموز الترويج',
    'discounts_promocodes_desc': 'إنشاء عروض ترويجية ورموز خصم',
    
    // Customer Management
    'customer_info': 'معلومات العملاء',
    'customer_info_desc': 'عرض وإدارة بيانات العملاء',
    'complaints': 'الشكاوى',
    'complaints_desc': 'التعامل مع شكاوى العملاء',
    'blacklist': 'القائمة السوداء',
    'blacklist_desc': 'إدارة العملاء غير المرغوب فيهم',
    
    // Settings
    'sounds': 'الأصوات',
    'sounds_desc': 'تكوين أصوات الإشعارات',
    'printing': 'الطباعة',
    'printing_desc': 'إعداد طباعة الإيصالات والطلبات',
    'chatbot': 'الشات بوت',
    'chatbot_desc': 'تكوين الردود التلقائية',
    'customers_settings': 'العملاء',
    'customers_settings_desc': 'إعدادات إدارة العملاء',
    'delivery': 'التوصيل',
    'delivery_desc': 'مناطق التوصيل والإعدادات',
    'users': 'المستخدمين',
    'users_desc': 'إدارة مستخدمي النظام والأدوار',
    'phone_ordering': 'طلبات الهاتف',
    'phone_ordering_desc': 'تكوين نظام طلبات الهاتف',
    
    // Live Orders
    'real_time': 'الوقت الفعلي',
    'view_all_live_orders': 'عرض جميع الطلبات المباشرة ←',
    
    // System Health
    'system_health': 'حالة النظام',
    'database': 'قاعدة البيانات',
    'connected': 'متصل',
    'pos_integration': 'تكامل نقاط البيع',
    'online': 'متصل',
    'payment_gateway': 'بوابة الدفع',
    'active': 'نشط',
    'phone_system': 'نظام الهاتف',
    'pending_setup': 'في انتظار الإعداد',
    
    // Order Status
    'confirmed': 'مؤكد',
    'preparing': 'قيد التحضير',
    'ready': 'جاهز',
    'delivered': 'تم التوصيل',
    
    // Common
    'management_sections': 'أقسام إدارة المطعم',
    'overview': 'نظرة عامة',
    'analytics': 'التحليلات',
    'orders': 'الطلبات',
    'operations': 'العمليات',
    'manage': 'إدارة'
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  
  const t = (key: string): string => {
    return translations[language][key] || key
  }
  
  const isRTL = language === 'ar'
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div 
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`font-sans transition-all duration-300 ease-in-out ${isRTL ? 'text-arabic font-arabic' : ''}`}
        style={{
          fontFamily: isRTL ? "'Noto Sans Arabic', 'Inter', system-ui, sans-serif" : "'Inter', system-ui, sans-serif",
          letterSpacing: isRTL ? '0.025em' : 'normal',
          lineHeight: isRTL ? '1.8' : '1.6'
        }}
      >
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}