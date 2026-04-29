import { api } from './client.js';

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

export const users = {
  list: (params) => api.get('/users', { params }).then((r) => {
    if (params && params.page !== undefined) return r.data;
    return r.data.users;
  }),
  create: (data) => api.post('/users', data).then((r) => r.data.user),
  update: (id, data) => api.patch(`/users/${id}`, data).then((r) => r.data.user),
};

export const clients = {
  list: (params) => api.get('/clients', { params }).then((r) => {
    if (params && params.page !== undefined) return r.data;
    return r.data.clients;
  }),
  get: (id) => api.get(`/clients/${id}`).then((r) => r.data.client),
  create: (data) => api.post('/clients', data).then((r) => r.data.client),
  update: (id, data) => api.patch(`/clients/${id}`, data).then((r) => r.data.client),
  updateKyc: (id, data) => api.patch(`/clients/${id}/kyc`, data).then((r) => r.data.client),
};

export const sites = {
  list: (params) => api.get('/sites', { params }).then((r) => {
    if (params && params.page !== undefined) return r.data;
    return r.data.sites;
  }),
  create: (data) => api.post('/sites', data).then((r) => r.data.site),
  update: (id, data) => api.patch(`/sites/${id}`, data).then((r) => r.data.site),
};

export const grades = {
  list: () => api.get('/grades').then((r) => r.data.grades),
  create: (data) => api.post('/grades', data).then((r) => r.data.grade),
};

export const salesOrders = {
  list: (params) => api.get('/sales-orders', { params }).then((r) => r.data.salesOrders),
  get: (id) => api.get(`/sales-orders/${id}`).then((r) => r.data.salesOrder),
  create: (data) => api.post('/sales-orders', data).then((r) => r.data.salesOrder),
  close: (id) => api.patch(`/sales-orders/${id}/close`).then((r) => r.data.salesOrder),
  createFromOrder: (orderId, numberOfVehicles, quantity) =>
    api.post(`/sales-orders/from-order/${orderId}`, { numberOfVehicles, quantity }).then((r) => r.data.salesOrder),
};

export const orders = {
  list: (params) => api.get('/orders', { params }).then((r) => r.data.orders),
  listPaginated: (params) => api.get('/orders', { params }).then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data.order),
  create: (data) => api.post('/orders', data).then((r) => r.data.order),
  update: (id, data) => api.patch(`/orders/${id}`, data).then((r) => r.data.order),
  approve: (id) => api.patch(`/orders/${id}/approve`).then((r) => r.data.order),
  reject: (id, reason) => api.patch(`/orders/${id}/reject`, { reason }).then((r) => r.data.order),
  authorizeSale: (id) => api.patch(`/orders/${id}/authorize-sale`).then((r) => r.data.order),
};

export const dispatches = {
  list: (params) => api.get('/dispatches', { params }).then((r) => r.data.dispatches),
  get: (id) => api.get(`/dispatches/${id}`).then((r) => r.data.dispatch),
  create: (data) => api.post('/dispatches', data).then((r) => r.data.dispatch),
  createFromSalesOrder: (soId, data) =>
    api.post('/dispatches', { salesOrder: soId, ...data }).then((r) => r.data.dispatch),
  authorize: (id) => api.patch(`/dispatches/${id}/authorize`).then((r) => r.data.dispatch),
};


export const invoices = {
  list: (params) => api.get('/invoices', { params }).then((r) => r.data.invoices),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data.invoice),
  create: (data) => api.post('/invoices', data).then((r) => r.data.invoice),
  reserveBlock: (count = 50) => api.post('/invoices/reserve-block', { count }).then((r) => r.data),
  myBlocks: () => api.get('/invoices/blocks').then((r) => r.data.blocks),
  sync: (invoicesArr) => api.post('/invoices/sync', { invoices: invoicesArr }).then((r) => r.data.results),
  pdfUrl: (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`,
};

export const batchsheetTemplates = {
  list: () => api.get('/batchsheet-templates').then((r) => r.data.templates),
  create: (data) => api.post('/batchsheet-templates', data).then((r) => r.data.template),
  update: (id, data) => api.patch(`/batchsheet-templates/${id}`, data).then((r) => r.data.template),
};

export const batchsheets = {
  list: (params) => api.get('/batchsheets', { params }).then((r) => r.data.batchsheets),
  create: (data) => api.post('/batchsheets', data).then((r) => r.data.batchsheet),
  update: (id, data) => api.patch(`/batchsheets/${id}`, data).then((r) => r.data.batchsheet),
  pdfUrl: (id) => `${api.defaults.baseURL}/batchsheets/${id}/pdf`,
};

export const payments = {
  list: (params) => api.get('/payments', { params }).then((r) => {
    if (params && params.page !== undefined) return r.data;
    return r.data.payments;
  }),
  create: (data) => api.post('/payments', data).then((r) => r.data.payment),
  update: (id, data) => api.patch(`/payments/${id}`, data).then((r) => r.data.payment),
};

export const notifications = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data.notifications),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data.notification),
  markAll: () => api.patch('/notifications/read-all').then((r) => r.data),
};

export const reports = {
  dailyDispatch: (params) => api.get('/reports/daily-dispatch', { params }).then((r) => r.data.rows),
  salesOrders: (params) => api.get('/reports/sales-orders', { params }).then((r) => r.data.rows),
  clients: (params) => api.get('/reports/clients', { params }).then((r) => r.data.rows),
  downloadUrl: (name, params = {}) => {
    const base = api.defaults.baseURL + '/reports/' + name;
    const qs = new URLSearchParams(params).toString();
    return qs ? `${base}?${qs}` : base;
  },
};

export const admin = {
  deleteDispatchData: (data) => api.delete('/admin/dispatch-data', { data }).then((r) => r.data),
  deleteBatchsheetData: (data) => api.delete('/admin/batchsheet-data', { data }).then((r) => r.data),
};

export const companySettings = {
  get: () => api.get('/admin/settings').then((r) => r.data.settings),
  update: (data) => api.patch('/admin/settings', data).then((r) => r.data.settings),
};
