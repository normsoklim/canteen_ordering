export interface SalesDataItem {
  menuItemId: number;
  menuItemName: string;
  categoryName?: string;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
}

export interface ReportSummary {
  totalRevenue: number;
  totalOrders: number;
  totalItemsSold: number;
  averageOrderValue: number;
  paidTransactions: number;
  period: string;
}
