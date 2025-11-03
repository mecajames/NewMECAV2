// ISO 3166-1 alpha-2 country codes
export const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'IT', name: 'Italy' },
  { code: 'ES', name: 'Spain' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
] as const;

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

export const CANADIAN_PROVINCES = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'YT', name: 'Yukon' },
] as const;

export const MEXICAN_STATES = [
  { code: 'AGS', name: 'Aguascalientes' },
  { code: 'BC', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAMP', name: 'Campeche' },
  { code: 'CHIS', name: 'Chiapas' },
  { code: 'CHIH', name: 'Chihuahua' },
  { code: 'COAH', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'DF', name: 'Mexico City' },
  { code: 'DGO', name: 'Durango' },
  { code: 'GTO', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HGO', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Mexico State' },
  { code: 'MICH', name: 'Michoacán' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NL', name: 'Nuevo León' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QRO', name: 'Querétaro' },
  { code: 'QROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosí' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAMPS', name: 'Tamaulipas' },
  { code: 'TLAX', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatán' },
  { code: 'ZAC', name: 'Zacatecas' },
] as const;

export function getStatesForCountry(countryCode: string) {
  switch (countryCode) {
    case 'US':
      return US_STATES;
    case 'CA':
      return CANADIAN_PROVINCES;
    case 'MX':
      return MEXICAN_STATES;
    default:
      return [];
  }
}

export function getStateLabel(countryCode: string) {
  switch (countryCode) {
    case 'US':
      return 'State';
    case 'CA':
      return 'Province';
    case 'MX':
      return 'State';
    case 'GB':
      return 'County';
    case 'AU':
      return 'State/Territory';
    default:
      return 'State/Province/Region';
  }
}

export function getPostalCodeLabel(countryCode: string) {
  switch (countryCode) {
    case 'US':
      return 'ZIP Code';
    case 'CA':
    case 'GB':
      return 'Postal Code';
    default:
      return 'Postal/ZIP Code';
  }
}
