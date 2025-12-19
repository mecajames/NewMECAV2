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
  { code: 'PL', name: 'Poland' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'BR', name: 'Brazil' },
  { code: 'IN', name: 'India' },
  { code: 'TT', name: 'Trinidad and Tobago' },
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

// UK Countries/Nations (ISO 3166-2:GB)
export const UK_COUNTRIES = [
  { code: 'ENG', name: 'England' },
  { code: 'SCT', name: 'Scotland' },
  { code: 'WLS', name: 'Wales' },
  { code: 'NIR', name: 'Northern Ireland' },
] as const;

// Spain Autonomous Communities (ISO 3166-2:ES)
export const SPAIN_REGIONS = [
  { code: 'AN', name: 'Andalucía' },
  { code: 'AR', name: 'Aragón' },
  { code: 'AS', name: 'Asturias' },
  { code: 'IB', name: 'Balearic Islands' },
  { code: 'PV', name: 'Basque Country' },
  { code: 'CN', name: 'Canary Islands' },
  { code: 'CB', name: 'Cantabria' },
  { code: 'CL', name: 'Castile and León' },
  { code: 'CM', name: 'Castilla-La Mancha' },
  { code: 'CT', name: 'Catalonia' },
  { code: 'CE', name: 'Ceuta' },
  { code: 'EX', name: 'Extremadura' },
  { code: 'GA', name: 'Galicia' },
  { code: 'RI', name: 'La Rioja' },
  { code: 'MD', name: 'Madrid' },
  { code: 'ML', name: 'Melilla' },
  { code: 'MC', name: 'Murcia' },
  { code: 'NC', name: 'Navarre' },
  { code: 'VC', name: 'Valencia' },
] as const;

// France Regions (ISO 3166-2:FR)
export const FRANCE_REGIONS = [
  { code: 'ARA', name: 'Auvergne-Rhône-Alpes' },
  { code: 'BFC', name: 'Bourgogne-Franche-Comté' },
  { code: 'BRE', name: 'Brittany' },
  { code: 'CVL', name: 'Centre-Val de Loire' },
  { code: 'COR', name: 'Corsica' },
  { code: 'GES', name: 'Grand Est' },
  { code: 'HDF', name: 'Hauts-de-France' },
  { code: 'IDF', name: 'Île-de-France' },
  { code: 'NOR', name: 'Normandy' },
  { code: 'NAQ', name: 'Nouvelle-Aquitaine' },
  { code: 'OCC', name: 'Occitanie' },
  { code: 'PDL', name: 'Pays de la Loire' },
  { code: 'PAC', name: "Provence-Alpes-Côte d'Azur" },
  { code: 'GUA', name: 'Guadeloupe' },
  { code: 'MTQ', name: 'Martinique' },
  { code: 'GUF', name: 'French Guiana' },
  { code: 'REU', name: 'Réunion' },
  { code: 'MAY', name: 'Mayotte' },
] as const;

// Poland Voivodeships (ISO 3166-2:PL)
export const POLAND_VOIVODESHIPS = [
  { code: 'DS', name: 'Lower Silesian' },
  { code: 'KP', name: 'Kuyavian-Pomeranian' },
  { code: 'LU', name: 'Lublin' },
  { code: 'LB', name: 'Lubusz' },
  { code: 'LD', name: 'Łódź' },
  { code: 'MA', name: 'Lesser Poland' },
  { code: 'MZ', name: 'Masovian' },
  { code: 'OP', name: 'Opole' },
  { code: 'PK', name: 'Subcarpathian' },
  { code: 'PD', name: 'Podlaskie' },
  { code: 'PM', name: 'Pomeranian' },
  { code: 'SL', name: 'Silesian' },
  { code: 'SK', name: 'Holy Cross' },
  { code: 'WN', name: 'Warmian-Masurian' },
  { code: 'WP', name: 'Greater Poland' },
  { code: 'ZP', name: 'West Pomeranian' },
] as const;

// Germany Bundesländer (ISO 3166-2:DE)
export const GERMANY_STATES = [
  { code: 'BW', name: 'Baden-Württemberg' },
  { code: 'BY', name: 'Bavaria' },
  { code: 'BE', name: 'Berlin' },
  { code: 'BB', name: 'Brandenburg' },
  { code: 'HB', name: 'Bremen' },
  { code: 'HH', name: 'Hamburg' },
  { code: 'HE', name: 'Hesse' },
  { code: 'MV', name: 'Mecklenburg-Vorpommern' },
  { code: 'NI', name: 'Lower Saxony' },
  { code: 'NW', name: 'North Rhine-Westphalia' },
  { code: 'RP', name: 'Rhineland-Palatinate' },
  { code: 'SL', name: 'Saarland' },
  { code: 'SN', name: 'Saxony' },
  { code: 'ST', name: 'Saxony-Anhalt' },
  { code: 'SH', name: 'Schleswig-Holstein' },
  { code: 'TH', name: 'Thuringia' },
] as const;

// Italy Regions (ISO 3166-2:IT)
export const ITALY_REGIONS = [
  { code: 'ABR', name: 'Abruzzo' },
  { code: 'VDA', name: 'Aosta Valley' },
  { code: 'PUG', name: 'Apulia' },
  { code: 'BAS', name: 'Basilicata' },
  { code: 'CAL', name: 'Calabria' },
  { code: 'CAM', name: 'Campania' },
  { code: 'EMR', name: 'Emilia-Romagna' },
  { code: 'FVG', name: 'Friuli Venezia Giulia' },
  { code: 'LAZ', name: 'Lazio' },
  { code: 'LIG', name: 'Liguria' },
  { code: 'LOM', name: 'Lombardy' },
  { code: 'MAR', name: 'Marche' },
  { code: 'MOL', name: 'Molise' },
  { code: 'PMN', name: 'Piedmont' },
  { code: 'SAR', name: 'Sardinia' },
  { code: 'SIC', name: 'Sicily' },
  { code: 'TOS', name: 'Tuscany' },
  { code: 'TAA', name: 'Trentino-Alto Adige' },
  { code: 'UMB', name: 'Umbria' },
  { code: 'VEN', name: 'Veneto' },
] as const;

// Australia States and Territories (ISO 3166-2:AU)
export const AUSTRALIA_STATES = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
] as const;

// Japan Prefectures (ISO 3166-2:JP)
export const JAPAN_PREFECTURES = [
  { code: 'JP-01', name: 'Hokkaido' },
  { code: 'JP-02', name: 'Aomori' },
  { code: 'JP-03', name: 'Iwate' },
  { code: 'JP-04', name: 'Miyagi' },
  { code: 'JP-05', name: 'Akita' },
  { code: 'JP-06', name: 'Yamagata' },
  { code: 'JP-07', name: 'Fukushima' },
  { code: 'JP-08', name: 'Ibaraki' },
  { code: 'JP-09', name: 'Tochigi' },
  { code: 'JP-10', name: 'Gunma' },
  { code: 'JP-11', name: 'Saitama' },
  { code: 'JP-12', name: 'Chiba' },
  { code: 'JP-13', name: 'Tokyo' },
  { code: 'JP-14', name: 'Kanagawa' },
  { code: 'JP-15', name: 'Niigata' },
  { code: 'JP-16', name: 'Toyama' },
  { code: 'JP-17', name: 'Ishikawa' },
  { code: 'JP-18', name: 'Fukui' },
  { code: 'JP-19', name: 'Yamanashi' },
  { code: 'JP-20', name: 'Nagano' },
  { code: 'JP-21', name: 'Gifu' },
  { code: 'JP-22', name: 'Shizuoka' },
  { code: 'JP-23', name: 'Aichi' },
  { code: 'JP-24', name: 'Mie' },
  { code: 'JP-25', name: 'Shiga' },
  { code: 'JP-26', name: 'Kyoto' },
  { code: 'JP-27', name: 'Osaka' },
  { code: 'JP-28', name: 'Hyogo' },
  { code: 'JP-29', name: 'Nara' },
  { code: 'JP-30', name: 'Wakayama' },
  { code: 'JP-31', name: 'Tottori' },
  { code: 'JP-32', name: 'Shimane' },
  { code: 'JP-33', name: 'Okayama' },
  { code: 'JP-34', name: 'Hiroshima' },
  { code: 'JP-35', name: 'Yamaguchi' },
  { code: 'JP-36', name: 'Tokushima' },
  { code: 'JP-37', name: 'Kagawa' },
  { code: 'JP-38', name: 'Ehime' },
  { code: 'JP-39', name: 'Kochi' },
  { code: 'JP-40', name: 'Fukuoka' },
  { code: 'JP-41', name: 'Saga' },
  { code: 'JP-42', name: 'Nagasaki' },
  { code: 'JP-43', name: 'Kumamoto' },
  { code: 'JP-44', name: 'Oita' },
  { code: 'JP-45', name: 'Miyazaki' },
  { code: 'JP-46', name: 'Kagoshima' },
  { code: 'JP-47', name: 'Okinawa' },
] as const;

// China Provinces and Regions (ISO 3166-2:CN)
export const CHINA_PROVINCES = [
  { code: 'AH', name: 'Anhui' },
  { code: 'BJ', name: 'Beijing' },
  { code: 'CQ', name: 'Chongqing' },
  { code: 'FJ', name: 'Fujian' },
  { code: 'GS', name: 'Gansu' },
  { code: 'GD', name: 'Guangdong' },
  { code: 'GX', name: 'Guangxi' },
  { code: 'GZ', name: 'Guizhou' },
  { code: 'HI', name: 'Hainan' },
  { code: 'HE', name: 'Hebei' },
  { code: 'HL', name: 'Heilongjiang' },
  { code: 'HA', name: 'Henan' },
  { code: 'HB', name: 'Hubei' },
  { code: 'HN', name: 'Hunan' },
  { code: 'JS', name: 'Jiangsu' },
  { code: 'JX', name: 'Jiangxi' },
  { code: 'JL', name: 'Jilin' },
  { code: 'LN', name: 'Liaoning' },
  { code: 'NM', name: 'Inner Mongolia' },
  { code: 'NX', name: 'Ningxia' },
  { code: 'QH', name: 'Qinghai' },
  { code: 'SN', name: 'Shaanxi' },
  { code: 'SD', name: 'Shandong' },
  { code: 'SH', name: 'Shanghai' },
  { code: 'SX', name: 'Shanxi' },
  { code: 'SC', name: 'Sichuan' },
  { code: 'TJ', name: 'Tianjin' },
  { code: 'XJ', name: 'Xinjiang' },
  { code: 'XZ', name: 'Tibet' },
  { code: 'YN', name: 'Yunnan' },
  { code: 'ZJ', name: 'Zhejiang' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'MO', name: 'Macau' },
  { code: 'TW', name: 'Taiwan' },
] as const;

// Brazil States (ISO 3166-2:BR)
export const BRAZIL_STATES = [
  { code: 'AC', name: 'Acre' },
  { code: 'AL', name: 'Alagoas' },
  { code: 'AP', name: 'Amapá' },
  { code: 'AM', name: 'Amazonas' },
  { code: 'BA', name: 'Bahia' },
  { code: 'CE', name: 'Ceará' },
  { code: 'DF', name: 'Federal District' },
  { code: 'ES', name: 'Espírito Santo' },
  { code: 'GO', name: 'Goiás' },
  { code: 'MA', name: 'Maranhão' },
  { code: 'MT', name: 'Mato Grosso' },
  { code: 'MS', name: 'Mato Grosso do Sul' },
  { code: 'MG', name: 'Minas Gerais' },
  { code: 'PA', name: 'Pará' },
  { code: 'PB', name: 'Paraíba' },
  { code: 'PR', name: 'Paraná' },
  { code: 'PE', name: 'Pernambuco' },
  { code: 'PI', name: 'Piauí' },
  { code: 'RJ', name: 'Rio de Janeiro' },
  { code: 'RN', name: 'Rio Grande do Norte' },
  { code: 'RS', name: 'Rio Grande do Sul' },
  { code: 'RO', name: 'Rondônia' },
  { code: 'RR', name: 'Roraima' },
  { code: 'SC', name: 'Santa Catarina' },
  { code: 'SP', name: 'São Paulo' },
  { code: 'SE', name: 'Sergipe' },
  { code: 'TO', name: 'Tocantins' },
] as const;

// India States and Union Territories (ISO 3166-2:IN)
export const INDIA_STATES = [
  { code: 'AN', name: 'Andaman and Nicobar Islands' },
  { code: 'AP', name: 'Andhra Pradesh' },
  { code: 'AR', name: 'Arunachal Pradesh' },
  { code: 'AS', name: 'Assam' },
  { code: 'BR', name: 'Bihar' },
  { code: 'CH', name: 'Chandigarh' },
  { code: 'CT', name: 'Chhattisgarh' },
  { code: 'DN', name: 'Dadra and Nagar Haveli' },
  { code: 'DD', name: 'Daman and Diu' },
  { code: 'DL', name: 'Delhi' },
  { code: 'GA', name: 'Goa' },
  { code: 'GJ', name: 'Gujarat' },
  { code: 'HR', name: 'Haryana' },
  { code: 'HP', name: 'Himachal Pradesh' },
  { code: 'JK', name: 'Jammu and Kashmir' },
  { code: 'JH', name: 'Jharkhand' },
  { code: 'KA', name: 'Karnataka' },
  { code: 'KL', name: 'Kerala' },
  { code: 'LA', name: 'Ladakh' },
  { code: 'LD', name: 'Lakshadweep' },
  { code: 'MP', name: 'Madhya Pradesh' },
  { code: 'MH', name: 'Maharashtra' },
  { code: 'MN', name: 'Manipur' },
  { code: 'ML', name: 'Meghalaya' },
  { code: 'MZ', name: 'Mizoram' },
  { code: 'NL', name: 'Nagaland' },
  { code: 'OR', name: 'Odisha' },
  { code: 'PY', name: 'Puducherry' },
  { code: 'PB', name: 'Punjab' },
  { code: 'RJ', name: 'Rajasthan' },
  { code: 'SK', name: 'Sikkim' },
  { code: 'TN', name: 'Tamil Nadu' },
  { code: 'TG', name: 'Telangana' },
  { code: 'TR', name: 'Tripura' },
  { code: 'UP', name: 'Uttar Pradesh' },
  { code: 'UK', name: 'Uttarakhand' },
  { code: 'WB', name: 'West Bengal' },
] as const;

// Trinidad and Tobago Regions/Municipalities (ISO 3166-2:TT)
export const TRINIDAD_TOBAGO_REGIONS = [
  { code: 'ARI', name: 'Arima' },
  { code: 'CHA', name: 'Chaguanas' },
  { code: 'CTT', name: 'Couva-Tabaquite-Talparo' },
  { code: 'DMN', name: 'Diego Martin' },
  { code: 'MRC', name: 'Mayaro-Rio Claro' },
  { code: 'PED', name: 'Penal-Debe' },
  { code: 'PTF', name: 'Point Fortin' },
  { code: 'POS', name: 'Port of Spain' },
  { code: 'PRT', name: 'Princes Town' },
  { code: 'SFO', name: 'San Fernando' },
  { code: 'SJL', name: 'San Juan-Laventille' },
  { code: 'SGE', name: 'Sangre Grande' },
  { code: 'SIP', name: 'Siparia' },
  { code: 'TUP', name: 'Tunapuna-Piarco' },
  { code: 'TOB', name: 'Tobago' },
] as const;

export function getStatesForCountry(countryCode: string) {
  switch (countryCode) {
    case 'US':
      return US_STATES;
    case 'CA':
      return CANADIAN_PROVINCES;
    case 'MX':
      return MEXICAN_STATES;
    case 'GB':
      return UK_COUNTRIES;
    case 'ES':
      return SPAIN_REGIONS;
    case 'FR':
      return FRANCE_REGIONS;
    case 'PL':
      return POLAND_VOIVODESHIPS;
    case 'DE':
      return GERMANY_STATES;
    case 'IT':
      return ITALY_REGIONS;
    case 'AU':
      return AUSTRALIA_STATES;
    case 'JP':
      return JAPAN_PREFECTURES;
    case 'CN':
      return CHINA_PROVINCES;
    case 'BR':
      return BRAZIL_STATES;
    case 'IN':
      return INDIA_STATES;
    case 'TT':
      return TRINIDAD_TOBAGO_REGIONS;
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
      return 'Country';
    case 'AU':
      return 'State/Territory';
    case 'ES':
      return 'Region';
    case 'FR':
      return 'Region';
    case 'PL':
      return 'Voivodeship';
    case 'DE':
      return 'State';
    case 'IT':
      return 'Region';
    case 'JP':
      return 'Prefecture';
    case 'CN':
      return 'Province';
    case 'BR':
      return 'State';
    case 'IN':
      return 'State/Territory';
    case 'TT':
      return 'Region';
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
    case 'AU':
      return 'Postcode';
    case 'JP':
      return 'Postal Code';
    case 'CN':
      return 'Postal Code';
    case 'BR':
      return 'CEP';
    case 'IN':
      return 'PIN Code';
    case 'DE':
    case 'IT':
    case 'ES':
    case 'FR':
    case 'PL':
    case 'TT':
      return 'Postal Code';
    default:
      return 'Postal/ZIP Code';
  }
}
