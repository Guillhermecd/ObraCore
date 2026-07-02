const PAYMENT_METHODS = [
  'Dinheiro',
  'PIX',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Boleto',
  'Transferência',
];

module.exports = {
  PAYMENT_METHODS,

  isValidPaymentMethod(paymentMethod) {
    return PAYMENT_METHODS.includes(paymentMethod);
  },
};
