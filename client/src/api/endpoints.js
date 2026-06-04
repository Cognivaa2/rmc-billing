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

export const orders = {
  list: (params) => api.get('/orders', { params }).then((r) => r.data.orders),
  listPaginated: (params) => api.get('/orders', { params }).then((r) => r.data),
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data.order),
  create: (data) => api.post('/orders', data).then((r) => r.data.order),
  update: (id, data) => api.patch(`/orders/${id}`, data).then((r) => r.data.order),
  approve: (id) => api.patch(`/orders/${id}/approve`).then((r) => r.data.order),
  reject: (id, reason) => api.patch(`/orders/${id}/reject`, { reason }).then((r) => r.data.order),
  authorizeSale: (id, data) => api.patch(`/orders/${id}/authorize-sale`, data).then((r) => r.data.order),
  close: (id) => api.patch(`/orders/${id}/close`).then((r) => r.data.order),
};

export const dispatches = {
  list: (params) => api.get('/dispatches', { params }).then((r) => r.data.dispatches),
  get: (id) => api.get(`/dispatches/${id}`).then((r) => r.data.dispatch),
  create: (data) => api.post('/dispatches', data).then((r) => r.data.dispatch),
  authorize: (id) => api.patch(`/dispatches/${id}/authorize`).then((r) => r.data.dispatch),
};


export const invoices = {
  list: (params) => api.get('/invoices', { params }).then((r) => r.data.invoices),
  get: (id) => api.get(`/invoices/${id}`).then((r) => r.data.invoice),
  create: (data) => api.post('/invoices', data).then((r) => r.data.invoice),
  createFromOrder: (data) => api.post('/invoices/from-order', data).then((r) => r.data.invoice),
  pdfUrl: (id) => `${api.defaults.baseURL}/invoices/${id}/pdf`,
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
  clients: (params) => api.get('/reports/clients', { params }).then((r) => r.data.rows),
  downloadUrl: (name, params = {}) => {
    const base = api.defaults.baseURL + '/reports/' + name;
    const qs = new URLSearchParams(params).toString();
    return qs ? `${base}?${qs}` : base;
  },
};

export const admin = {
  deleteDispatchData: (data) => api.delete('/admin/dispatch-data', { data }).then((r) => r.data),
};

export const companySettings = {
  get: () => api.get('/admin/settings').then((r) => r.data.settings),
  update: (data) => api.patch('/admin/settings', data).then((r) => r.data.settings),
};
