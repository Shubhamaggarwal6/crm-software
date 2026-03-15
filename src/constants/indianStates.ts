export const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
  '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
  '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
  '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
  '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
  '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana',
  '37': 'Andhra Pradesh', '38': 'Ladakh',
};

export function getStateFromGST(gstNumber: string): { stateCode: string; stateName: string } | null {
  if (!gstNumber || gstNumber.length < 2) return null;
  const code = gstNumber.substring(0, 2);
  const name = INDIAN_STATE_CODES[code];
  if (!name) return null;
  return { stateCode: code, stateName: name };
}

export function detectTaxType(customerState: string | undefined, ownerState: string | undefined): 'intra' | 'inter' {
  if (!customerState || !ownerState) return 'intra';
  return customerState.toLowerCase() === ownerState.toLowerCase() ? 'intra' : 'inter';
}
