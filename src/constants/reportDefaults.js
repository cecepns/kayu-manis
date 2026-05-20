export const DEFAULT_TERMS_OF_PAYMENT = [
  '30% Deposit 70% Balance Payments Agains Documents',
  'L/C Irrevocable',
];

export const DEFAULT_DELIVERY_TERMS = [
  'FOB - Semarang PORT',
  'EX Workshop - Semarang Port',
];

export const DEFAULT_CARGO_READY_BY = '12 WEEKS AFTER DEPOSITE RECEIVED';

export const BANK_OPTIONS = [
  {
    id: 'permata-euro',
    name: 'PERMATA EURO',
    address: 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA',
    accountName: 'CV KAYU MANIS',
    account: '6902700445',
    accountCurrency: 'EURO',
    swiftCode: 'BBBAIDJA',
  },
  {
    id: 'permata-escrow',
    name: 'PERMATA ESCROW',
    address: 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA',
    accountName: 'CV KAYU MANIS',
    account: '701466403',
    accountCurrency: 'USD',
    swiftCode: 'BBBAIDJA',
  },
  {
    id: 'permata-usd',
    name: 'PERMATA USD',
    address: 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA',
    accountName: 'CV KAYU MANIS',
    account: '701466101',
    accountCurrency: 'USD',
    swiftCode: 'BBBAIDJA',
  },
  {
    id: 'permata-alex',
    name: 'PERMATA ALEX K.',
    address: 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA',
    accountName: 'ALEX KURNIAWAN',
    account: '6903701232',
    accountCurrency: '',
    swiftCode: 'BBBAIDJA',
  },
];

export const DEFAULT_BANK_ID = 'permata-euro';

/** Resolve bank by id (supports legacy `permata` id). */
export const getBankDetails = (bankId) => {
  const normalized =
    !bankId || bankId === 'permata' ? DEFAULT_BANK_ID : bankId;
  return (
    BANK_OPTIONS.find((b) => b.id === normalized) || BANK_OPTIONS[0]
  );
};

export const formatBankAccount = (bank) => {
  if (!bank?.account) return '-';
  return bank.accountCurrency
    ? `${bank.account} (${bank.accountCurrency})`
    : bank.account;
};
