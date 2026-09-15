import api from './api';

export const paymentService = {
  // Fetch public plans
  async getPlans() {
    const res = await api.get('/api/subscriptions/plans');
    return res.data.plans;
  },

  // Fetch current user subscription
  async getCurrentSubscription() {
    const res = await api.get('/api/subscriptions/current');
    return res.data;
  },

  // Check access for specific language
  async checkAccess(targetLanguage = 'en') {
    const res = await api.get(`/api/subscriptions/check-access?target_language=${targetLanguage}`);
    return res.data;
  },

  // Initiate real PayHere checkout
  async initiateCheckout(planId, billingCycle = 'monthly') {
    const res = await api.post('/api/subscriptions/checkout', {
      plan_id: planId,
      billing_cycle: billingCycle
    });

    if (!res.data || !res.data.checkout_data) {
      throw new Error('Failed to retrieve checkout configuration from server.');
    }

    const { action_url, ...fields } = res.data.checkout_data;

    // Dynamically create and submit PayHere form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action_url || 'https://sandbox.payhere.lk/pay/checkout';
    form.style.display = 'none';

    Object.entries(fields).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      }
    });

    document.body.appendChild(form);
    form.submit();
  },

  // Poll order status for success page
  async getPaymentStatus(orderId) {
    const res = await api.get(`/api/payments/status/${orderId}`);
    return res.data;
  },

  // Fetch payment invoices/history
  async getPaymentHistory() {
    const res = await api.get('/api/payments/history');
    return res.data;
  },

  // Cancel subscription auto-renewal
  async cancelSubscription() {
    const res = await api.post('/api/subscriptions/cancel');
    return res.data;
  },

  // Start or refresh free trial from login date
  async startTrial() {
    const res = await api.post('/api/subscriptions/start-trial');
    return res.data;
  }
};

export default paymentService;
