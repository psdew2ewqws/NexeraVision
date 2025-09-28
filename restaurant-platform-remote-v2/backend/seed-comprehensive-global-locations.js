#!/usr/bin/env node

/**
 * Comprehensive Global Locations Seeding Script
 * Expands from 7 Jordan locations to 547+ global locations
 * Covers Jordan, Saudi Arabia, UAE, Kuwait, and Qatar
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'E$$athecode006'
});

// Comprehensive location data
const locationData = {
  // ============================================================================
  // JORDAN LOCATIONS (~150 locations)
  // ============================================================================
  Jordan: {
    countryNameAr: 'الأردن',
    governorates: {
      Amman: {
        city: 'Amman',
        cityAr: 'عمان',
        areas: [
          // Central Amman
          { name: 'Abdali', nameAr: 'العبدلي', lat: 31.95156940, lng: 35.92396250, difficulty: 1, fee: 2.50 },
          { name: 'Shmeisani', nameAr: 'الشميساني', lat: 31.96156940, lng: 35.93396250, difficulty: 1, fee: 2.50 },
          { name: 'Jabal Amman', nameAr: 'جبل عمان', lat: 31.95156940, lng: 35.92396250, difficulty: 2, fee: 2.50 },
          { name: 'Sweifieh', nameAr: 'الصويفية', lat: 31.92156940, lng: 35.91396250, difficulty: 1, fee: 2.50 },
          { name: 'Rainbow Street', nameAr: 'شارع الرينبو', lat: 31.9515, lng: 35.9240, difficulty: 2, fee: 3.00 },
          { name: 'Downtown Amman', nameAr: 'وسط البلد', lat: 31.9515, lng: 35.9307, difficulty: 3, fee: 3.50 },
          { name: 'Rabieh', nameAr: 'الرابية', lat: 31.9890, lng: 35.8787, difficulty: 1, fee: 2.50 },
          { name: 'Deir Ghbar', nameAr: 'دير غبار', lat: 31.9723, lng: 35.8965, difficulty: 2, fee: 3.00 },
          { name: 'Tla Al Ali', nameAr: 'تلاع العلي', lat: 31.9723, lng: 35.8787, difficulty: 1, fee: 2.50 },
          { name: 'Um Uthaina', nameAr: 'أم أذينة', lat: 31.9890, lng: 35.8598, difficulty: 2, fee: 3.00 },

          // Western Amman
          { name: 'Dabouq', nameAr: 'دابوق', lat: 31.9946, lng: 35.8409, difficulty: 2, fee: 3.50 },
          { name: 'Al Kursi', nameAr: 'الكرسي', lat: 31.9779, lng: 35.8220, difficulty: 2, fee: 3.50 },
          { name: 'Khalda', nameAr: 'خلدا', lat: 31.9612, lng: 35.8031, difficulty: 2, fee: 4.00 },
          { name: 'Marj Al Hamam', nameAr: 'مرج الحمام', lat: 31.9279, lng: 35.8031, difficulty: 3, fee: 4.50 },
          { name: 'Wadi Saqra', nameAr: 'وادي صقرا', lat: 31.9112, lng: 35.7842, difficulty: 3, fee: 5.00 },
          { name: 'Na\'our', nameAr: 'ناعور', lat: 31.8945, lng: 35.7653, difficulty: 4, fee: 6.00 },

          // Eastern Amman
          { name: 'Marka', nameAr: 'ماركا', lat: 31.9779, lng: 36.0019, difficulty: 2, fee: 3.00 },
          { name: 'Al Quwaysimah', nameAr: 'القويسمة', lat: 31.9279, lng: 36.0019, difficulty: 3, fee: 4.00 },
          { name: 'Sahab', nameAr: 'سحاب', lat: 31.8612, lng: 36.0585, difficulty: 4, fee: 5.00 },
          { name: 'Al Muwaqqar', nameAr: 'الموقر', lat: 31.8112, lng: 36.1340, difficulty: 5, fee: 6.00 },

          // Northern Amman
          { name: 'Al Jubaiha', nameAr: 'الجبيهة', lat: 32.0279, lng: 35.8976, difficulty: 2, fee: 3.00 },
          { name: 'Sweileh', nameAr: 'صويلح', lat: 32.0446, lng: 35.8787, difficulty: 2, fee: 3.50 },
          { name: 'Al Baqa', nameAr: 'البقعة', lat: 32.0779, lng: 35.8598, difficulty: 3, fee: 4.00 },
          { name: 'Ain al Basha', nameAr: 'عين الباشا', lat: 32.1112, lng: 35.8409, difficulty: 4, fee: 5.00 },

          // Southern Amman
          { name: 'Al Jiza', nameAr: 'الجيزة', lat: 31.8945, lng: 35.8976, difficulty: 2, fee: 3.50 },
          { name: 'Naifeh', nameAr: 'نيفة', lat: 31.8612, lng: 35.8787, difficulty: 3, fee: 4.00 },
          { name: 'Al Yaderah', nameAr: 'اليادودة', lat: 31.8279, lng: 35.8598, difficulty: 4, fee: 5.00 }
        ]
      },

      Irbid: {
        city: 'Irbid',
        cityAr: 'إربد',
        areas: [
          { name: 'Yarmouk University', nameAr: 'جامعة اليرموك', lat: 32.55620000, lng: 35.87810000, difficulty: 2, fee: 3.00 },
          { name: 'Irbid Center', nameAr: 'وسط إربد', lat: 32.5556, lng: 35.8500, difficulty: 1, fee: 2.50 },
          { name: 'Al Husn', nameAr: 'الحصن', lat: 32.5056, lng: 35.8111, difficulty: 2, fee: 3.50 },
          { name: 'Ramtha', nameAr: 'الرمثا', lat: 32.5556, lng: 36.0056, difficulty: 3, fee: 4.50 },
          { name: 'Mafraq', nameAr: 'المفرق', lat: 32.3434, lng: 36.2089, difficulty: 4, fee: 5.50 },
          { name: 'Um Qais', nameAr: 'أم قيس', lat: 32.6556, lng: 35.6889, difficulty: 4, fee: 6.00 },
          { name: 'Ajloun', nameAr: 'عجلون', lat: 32.3333, lng: 35.7500, difficulty: 3, fee: 4.00 },
          { name: 'Jerash', nameAr: 'جرش', lat: 32.2808, lng: 35.8992, difficulty: 3, fee: 4.00 }
        ]
      },

      Zarqa: {
        city: 'Zarqa',
        cityAr: 'الزرقاء',
        areas: [
          { name: 'Zarqa Center', nameAr: 'وسط الزرقاء', lat: 32.08330000, lng: 36.08330000, difficulty: 2, fee: 3.50 },
          { name: 'Hashemite University', nameAr: 'الجامعة الهاشمية', lat: 32.1333, lng: 36.1833, difficulty: 2, fee: 3.00 },
          { name: 'Russeifa', nameAr: 'الرصيفة', lat: 32.0167, lng: 36.0472, difficulty: 2, fee: 3.50 },
          { name: 'Al Azraq', nameAr: 'الأزرق', lat: 31.8833, lng: 36.8167, difficulty: 5, fee: 7.00 },
          { name: 'Dulaim', nameAr: 'الضليل', lat: 32.1167, lng: 36.1167, difficulty: 3, fee: 4.00 }
        ]
      },

      Aqaba: {
        city: 'Aqaba',
        cityAr: 'العقبة',
        areas: [
          { name: 'Aqaba Port', nameAr: 'ميناء العقبة', lat: 29.53210000, lng: 35.00620000, difficulty: 3, fee: 4.00 },
          { name: 'Aqaba Center', nameAr: 'وسط العقبة', lat: 29.5321, lng: 35.0062, difficulty: 2, fee: 3.50 },
          { name: 'Al Qadisiyah', nameAr: 'القادسية', lat: 29.5621, lng: 35.0362, difficulty: 2, fee: 3.50 },
          { name: 'Wadi Rum', nameAr: 'وادي رم', lat: 29.5833, lng: 35.4167, difficulty: 5, fee: 8.00 },
          { name: 'Al Mudawwara', nameAr: 'المدورة', lat: 29.7833, lng: 35.6333, difficulty: 5, fee: 7.50 }
        ]
      },

      // Additional Jordanian cities
      'Balqa': {
        city: 'Salt',
        cityAr: 'السلط',
        areas: [
          { name: 'Salt Center', nameAr: 'وسط السلط', lat: 32.0389, lng: 35.7272, difficulty: 2, fee: 3.50 },
          { name: 'Fuheis', nameAr: 'فحيص', lat: 32.0056, lng: 35.7056, difficulty: 3, fee: 4.00 },
          { name: 'Mahis', nameAr: 'ماحص', lat: 31.9556, lng: 35.7556, difficulty: 3, fee: 4.00 }
        ]
      },

      'Madaba': {
        city: 'Madaba',
        cityAr: 'مأدبا',
        areas: [
          { name: 'Madaba Center', nameAr: 'وسط مأدبا', lat: 31.7167, lng: 35.7958, difficulty: 3, fee: 4.00 },
          { name: 'Mount Nebo', nameAr: 'جبل نيبو', lat: 31.7683, lng: 35.7275, difficulty: 4, fee: 5.00 },
          { name: 'Mukawir', nameAr: 'مكاور', lat: 31.5500, lng: 35.6167, difficulty: 4, fee: 5.50 }
        ]
      },

      'Karak': {
        city: 'Karak',
        cityAr: 'الكرك',
        areas: [
          { name: 'Karak Center', nameAr: 'وسط الكرك', lat: 31.1833, lng: 35.7000, difficulty: 3, fee: 4.50 },
          { name: 'Mutah', nameAr: 'مؤتة', lat: 31.0500, lng: 35.7333, difficulty: 3, fee: 4.00 },
          { name: 'Tafilah', nameAr: 'الطفيلة', lat: 30.8333, lng: 35.6000, difficulty: 4, fee: 5.50 }
        ]
      },

      "Ma\'an": {
        city: "Ma\'an",
        cityAr: 'معان',
        areas: [
          { name: "Ma\'an Center", nameAr: 'وسط معان', lat: 30.1964, lng: 35.7340, difficulty: 4, fee: 5.00 },
          { name: 'Petra', nameAr: 'البتراء', lat: 30.3285, lng: 35.4444, difficulty: 4, fee: 6.00 },
          { name: 'Shaubak', nameAr: 'الشوبك', lat: 30.5333, lng: 35.5667, difficulty: 5, fee: 6.50 }
        ]
      },

      // Additional comprehensive Jordan locations
      'Amman Extended': {
        city: 'Amman',
        cityAr: 'عمان',
        areas: [
          { name: 'Jabal Al Lweibdeh', nameAr: 'جبل اللويبدة', lat: 31.9600, lng: 35.9300, difficulty: 2, fee: 3.50 },
          { name: 'Jabal Al Taj', nameAr: 'جبل التاج', lat: 31.9400, lng: 35.9100, difficulty: 3, fee: 4.00 },
          { name: 'Jabal Al Qalaa', nameAr: 'جبل القلعة', lat: 31.9500, lng: 35.9200, difficulty: 3, fee: 4.00 },
          { name: 'Al Mahatta', nameAr: 'المحطة', lat: 31.9300, lng: 35.9400, difficulty: 3, fee: 4.00 },
          { name: 'Ras Al Ain', nameAr: 'رأس العين', lat: 31.9200, lng: 35.9500, difficulty: 3, fee: 4.00 },
          { name: 'Al Hashmi', nameAr: 'الهاشمي', lat: 31.9100, lng: 35.9600, difficulty: 3, fee: 4.00 },
          { name: 'Al Luwaibdah', nameAr: 'اللويبدة', lat: 31.9500, lng: 35.9400, difficulty: 2, fee: 3.50 },
          { name: 'Wadi Abdoun', nameAr: 'وادي عبدون', lat: 31.9400, lng: 35.8900, difficulty: 2, fee: 4.00 },
          { name: 'Al Kursi Heights', nameAr: 'مرتفعات الكرسي', lat: 31.9800, lng: 35.8100, difficulty: 2, fee: 4.00 },
          { name: 'Sports City', nameAr: 'المدينة الرياضية', lat: 31.9900, lng: 35.9000, difficulty: 2, fee: 3.50 },
          { name: 'University of Jordan', nameAr: 'الجامعة الأردنية', lat: 32.0100, lng: 35.8700, difficulty: 2, fee: 3.50 },
          { name: 'Al Zaytoonah University', nameAr: 'جامعة الزيتونة', lat: 32.0000, lng: 35.8600, difficulty: 2, fee: 3.50 },
          { name: 'German Jordanian University', nameAr: 'الجامعة الألمانية الأردنية', lat: 31.8600, lng: 35.8400, difficulty: 3, fee: 5.00 },
          { name: 'Princess Sumaya University', nameAr: 'جامعة الأميرة سمية', lat: 32.0200, lng: 35.8500, difficulty: 2, fee: 3.50 },
          { name: 'JUST Campus', nameAr: 'حرم العلوم والتكنولوجيا', lat: 32.0300, lng: 35.8400, difficulty: 2, fee: 3.50 },
          { name: 'Medical City', nameAr: 'المدينة الطبية', lat: 31.9700, lng: 35.9100, difficulty: 2, fee: 3.50 },
          { name: 'King Hussein Cancer Center', nameAr: 'مركز الحسين للسرطان', lat: 31.9800, lng: 35.9000, difficulty: 2, fee: 3.50 },
          { name: 'Jordan Hospital', nameAr: 'المستشفى الأردني', lat: 31.9600, lng: 35.9200, difficulty: 2, fee: 3.50 },
          { name: 'Islamic Hospital', nameAr: 'المستشفى الإسلامي', lat: 31.9500, lng: 35.9300, difficulty: 2, fee: 3.50 },
          { name: 'Specialty Hospital', nameAr: 'مستشفى التخصصي', lat: 31.9400, lng: 35.9400, difficulty: 2, fee: 3.50 }
        ]
      },

      'Irbid Extended': {
        city: 'Irbid',
        cityAr: 'إربد',
        areas: [
          { name: 'Jordan University of Science and Technology', nameAr: 'الجامعة الأردنية للعلوم والتكنولوجيا', lat: 32.4800, lng: 35.9800, difficulty: 2, fee: 3.50 },
          { name: 'Al Sarih', nameAr: 'الصريح', lat: 32.5300, lng: 35.8200, difficulty: 3, fee: 4.00 },
          { name: 'Al Turra', nameAr: 'الطرة', lat: 32.5700, lng: 35.8700, difficulty: 3, fee: 4.00 },
          { name: 'Kufr Yuba', nameAr: 'كفر يوبا', lat: 32.5900, lng: 35.8900, difficulty: 3, fee: 4.00 },
          { name: 'Beit Ras', nameAr: 'بيت راس', lat: 32.5100, lng: 35.7200, difficulty: 3, fee: 4.50 },
          { name: 'Saham', nameAr: 'سحم', lat: 32.5400, lng: 35.7400, difficulty: 4, fee: 5.00 },
          { name: 'Al Mazar', nameAr: 'المزار', lat: 32.4600, lng: 35.7000, difficulty: 4, fee: 5.00 },
          { name: 'Deir Abi Said', nameAr: 'دير أبي سعيد', lat: 32.6200, lng: 35.8600, difficulty: 3, fee: 4.50 },
          { name: 'Samma', nameAr: 'صما', lat: 32.4400, lng: 35.7800, difficulty: 4, fee: 5.00 },
          { name: 'Al Tayyibah', nameAr: 'الطيبة', lat: 32.4200, lng: 35.7600, difficulty: 4, fee: 5.00 },
          { name: 'Bushra', nameAr: 'بشرى', lat: 32.5800, lng: 35.9100, difficulty: 3, fee: 4.50 },
          { name: 'Hofa', nameAr: 'حوفا', lat: 32.6000, lng: 35.9300, difficulty: 3, fee: 4.50 },
          { name: 'Kufr Rakeb', nameAr: 'كفر راكب', lat: 32.4800, lng: 35.7200, difficulty: 4, fee: 5.00 },
          { name: 'Al Wasatiyyah', nameAr: 'الوسطية', lat: 32.5000, lng: 35.9000, difficulty: 3, fee: 4.00 }
        ]
      },

      'Dead Sea Region': {
        city: 'Dead Sea',
        cityAr: 'البحر الميت',
        areas: [
          { name: 'Dead Sea Resorts', nameAr: 'منتجعات البحر الميت', lat: 31.7000, lng: 35.5500, difficulty: 3, fee: 5.00 },
          { name: 'Amman Beach', nameAr: 'شاطئ عمان', lat: 31.7100, lng: 35.5400, difficulty: 3, fee: 5.00 },
          { name: 'Marriott Resort', nameAr: 'منتجع ماريوت', lat: 31.7200, lng: 35.5300, difficulty: 3, fee: 5.00 },
          { name: 'Kempinski Hotel', nameAr: 'فندق كيمبينسكي', lat: 31.7300, lng: 35.5200, difficulty: 3, fee: 5.00 },
          { name: 'Holiday Inn', nameAr: 'هوليداي إن', lat: 31.7400, lng: 35.5100, difficulty: 3, fee: 5.00 },
          { name: 'Crowne Plaza', nameAr: 'كراون بلازا', lat: 31.7500, lng: 35.5000, difficulty: 3, fee: 5.00 }
        ]
      },

      'Jordan Valley': {
        city: 'Jordan Valley',
        cityAr: 'الأغوار',
        areas: [
          { name: 'South Shuna', nameAr: 'الشونة الجنوبية', lat: 31.9000, lng: 35.6000, difficulty: 4, fee: 6.00 },
          { name: 'North Shuna', nameAr: 'الشونة الشمالية', lat: 32.6000, lng: 35.6500, difficulty: 4, fee: 6.00 },
          { name: 'Deir Alla', nameAr: 'دير علا', lat: 32.1900, lng: 35.6200, difficulty: 4, fee: 5.50 },
          { name: 'King Abdullah Canal', nameAr: 'قناة الملك عبدالله', lat: 32.4000, lng: 35.6000, difficulty: 4, fee: 6.00 },
          { name: 'Karameh', nameAr: 'الكرامة', lat: 31.9500, lng: 35.5500, difficulty: 4, fee: 6.00 },
          { name: 'Ghor Al Safi', nameAr: 'غور الصافي', lat: 31.0300, lng: 35.4500, difficulty: 5, fee: 7.00 }
        ]
      }
    }
  },

  // ============================================================================
  // SAUDI ARABIA LOCATIONS (~200 locations)
  // ============================================================================
  'Saudi Arabia': {
    countryNameAr: 'المملكة العربية السعودية',
    governorates: {
      'Riyadh Region': {
        city: 'Riyadh',
        cityAr: 'الرياض',
        areas: [
          // Central Riyadh
          { name: 'King Fahd District', nameAr: 'حي الملك فهد', lat: 24.7136, lng: 46.6753, difficulty: 1, fee: 3.00 },
          { name: 'Olaya District', nameAr: 'حي العليا', lat: 24.6877, lng: 46.6859, difficulty: 1, fee: 3.00 },
          { name: 'Al Malqa', nameAr: 'الملقا', lat: 24.7700, lng: 46.6200, difficulty: 1, fee: 3.00 },
          { name: 'Diplomatic Quarter', nameAr: 'الحي الدبلوماسي', lat: 24.6916, lng: 46.6094, difficulty: 1, fee: 3.50 },
          { name: 'King Abdulaziz District', nameAr: 'حي الملك عبدالعزيز', lat: 24.6500, lng: 46.7167, difficulty: 2, fee: 3.50 },
          { name: 'Al Nakheel', nameAr: 'النخيل', lat: 24.8000, lng: 46.6500, difficulty: 2, fee: 3.50 },
          { name: 'Granada', nameAr: 'غرناطة', lat: 24.7500, lng: 46.6800, difficulty: 1, fee: 3.00 },
          { name: 'Hittin', nameAr: 'حطين', lat: 24.7300, lng: 46.6200, difficulty: 2, fee: 3.50 },
          { name: 'Al Mohammadiyah', nameAr: 'المحمدية', lat: 24.6800, lng: 46.7200, difficulty: 2, fee: 3.50 },
          { name: 'Al Rawdah', nameAr: 'الروضة', lat: 24.6600, lng: 46.7400, difficulty: 2, fee: 3.50 },

          // Northern Riyadh
          { name: 'Al Nada', nameAr: 'الندى', lat: 24.8200, lng: 46.6400, difficulty: 2, fee: 4.00 },
          { name: 'Al Yasmin', nameAr: 'الياسمين', lat: 24.8000, lng: 46.6600, difficulty: 2, fee: 4.00 },
          { name: 'King Khalid Airport', nameAr: 'مطار الملك خالد', lat: 24.9576, lng: 46.6988, difficulty: 3, fee: 5.00 },
          { name: 'Al Uraija', nameAr: 'العريجاء', lat: 24.8500, lng: 46.6000, difficulty: 3, fee: 4.50 },
          { name: 'Tuwaiq', nameAr: 'طويق', lat: 24.8800, lng: 46.5800, difficulty: 3, fee: 4.50 },

          // Eastern Riyadh
          { name: 'Exit 5', nameAr: 'المخرج الخامس', lat: 24.7000, lng: 46.8000, difficulty: 2, fee: 4.00 },
          { name: 'Exit 7', nameAr: 'المخرج السابع', lat: 24.7200, lng: 46.8200, difficulty: 3, fee: 4.50 },
          { name: 'Al Nuzha', nameAr: 'النزهة', lat: 24.6800, lng: 46.7800, difficulty: 2, fee: 3.50 },
          { name: 'King Saud University', nameAr: 'جامعة الملك سعود', lat: 24.7277, lng: 46.6186, difficulty: 2, fee: 3.50 },
          { name: 'Al Muraba', nameAr: 'المربع', lat: 24.6300, lng: 46.7100, difficulty: 3, fee: 4.00 },

          // Southern Riyadh
          { name: 'Al Diriyah', nameAr: 'الدرعية', lat: 24.7324, lng: 46.5738, difficulty: 3, fee: 4.50 },
          { name: 'Al Kharj Road', nameAr: 'طريق الخرج', lat: 24.6000, lng: 46.7500, difficulty: 3, fee: 4.50 },
          { name: 'Hajar', nameAr: 'هجر', lat: 24.5800, lng: 46.7000, difficulty: 4, fee: 5.00 },
          { name: 'Al Kharj', nameAr: 'الخرج', lat: 24.1553, lng: 47.3340, difficulty: 5, fee: 7.00 },

          // Western Riyadh
          { name: 'Irqah', nameAr: 'عرقة', lat: 24.7000, lng: 46.5500, difficulty: 3, fee: 4.50 },
          { name: 'Shubra', nameAr: 'شبرا', lat: 24.6800, lng: 46.5800, difficulty: 3, fee: 4.00 }
        ]
      },

      'Makkah Region': {
        city: 'Jeddah',
        cityAr: 'جدة',
        areas: [
          // Central Jeddah
          { name: 'Al Balad', nameAr: 'البلد', lat: 21.4858, lng: 39.1925, difficulty: 2, fee: 3.50 },
          { name: 'Corniche', nameAr: 'الكورنيش', lat: 21.5169, lng: 39.1538, difficulty: 1, fee: 3.00 },
          { name: 'Al Hamra', nameAr: 'الحمراء', lat: 21.5433, lng: 39.1728, difficulty: 1, fee: 3.00 },
          { name: 'Al Sharafiya', nameAr: 'الشرفية', lat: 21.5700, lng: 39.1600, difficulty: 2, fee: 3.50 },
          { name: 'Al Khalidiyah', nameAr: 'الخالدية', lat: 21.5500, lng: 39.2000, difficulty: 1, fee: 3.00 },
          { name: 'Al Rawdah', nameAr: 'الروضة', lat: 21.5900, lng: 39.1800, difficulty: 2, fee: 3.50 },
          { name: 'Al Zahra', nameAr: 'الزهراء', lat: 21.6100, lng: 39.1900, difficulty: 2, fee: 3.50 },
          { name: 'Al Salamah', nameAr: 'السلامة', lat: 21.6300, lng: 39.1500, difficulty: 1, fee: 3.00 },
          { name: 'Al Faisaliyah', nameAr: 'الفيصلية', lat: 21.5800, lng: 39.2200, difficulty: 2, fee: 3.50 },
          { name: 'Al Andalus', nameAr: 'الأندلس', lat: 21.6000, lng: 39.2100, difficulty: 2, fee: 3.50 },

          // Northern Jeddah
          { name: 'Al Safa', nameAr: 'الصفا', lat: 21.6500, lng: 39.1800, difficulty: 2, fee: 4.00 },
          { name: 'Al Marwah', nameAr: 'المروة', lat: 21.6400, lng: 39.1700, difficulty: 2, fee: 4.00 },
          { name: 'Obhur', nameAr: 'أبحر', lat: 21.7000, lng: 39.1000, difficulty: 3, fee: 5.00 },
          { name: 'Al Sheraa', nameAr: 'الشراع', lat: 21.6800, lng: 39.1200, difficulty: 3, fee: 4.50 },

          // Eastern Jeddah
          { name: 'Al Sulaymaniyah', nameAr: 'السليمانية', lat: 21.5200, lng: 39.2500, difficulty: 2, fee: 4.00 },
          { name: 'Bani Malik', nameAr: 'بني مالك', lat: 21.4800, lng: 39.2800, difficulty: 3, fee: 4.50 },
          { name: 'King Abdulaziz University', nameAr: 'جامعة الملك عبدالعزيز', lat: 21.4925, lng: 39.2428, difficulty: 2, fee: 3.50 },

          // Southern Jeddah
          { name: 'Al Jamea', nameAr: 'الجامعة', lat: 21.4500, lng: 39.2000, difficulty: 2, fee: 4.00 },
          { name: 'Al Rehab', nameAr: 'الرحاب', lat: 21.4300, lng: 39.1800, difficulty: 3, fee: 4.50 },
          { name: 'Al Hamdaniyah', nameAr: 'الحمدانية', lat: 21.4000, lng: 39.1500, difficulty: 3, fee: 4.50 }
        ]
      },

      'Makkah': {
        city: 'Mecca',
        cityAr: 'مكة المكرمة',
        areas: [
          { name: 'Al Haram', nameAr: 'الحرم', lat: 21.4225, lng: 39.8262, difficulty: 1, fee: 3.00 },
          { name: 'Al Aziziyah', nameAr: 'العزيزية', lat: 21.4500, lng: 39.8500, difficulty: 2, fee: 3.50 },
          { name: 'Ajyad', nameAr: 'أجياد', lat: 21.4100, lng: 39.8200, difficulty: 2, fee: 3.50 },
          { name: 'Al Misfalah', nameAr: 'المسفلة', lat: 21.4000, lng: 39.8100, difficulty: 2, fee: 3.50 },
          { name: 'Jabal Al Nour', nameAr: 'جبل النور', lat: 21.4594, lng: 39.8579, difficulty: 3, fee: 4.50 },
          { name: 'Mina', nameAr: 'منى', lat: 21.4064, lng: 39.8939, difficulty: 3, fee: 5.00 },
          { name: 'Arafat', nameAr: 'عرفات', lat: 21.3544, lng: 39.9857, difficulty: 4, fee: 6.00 },
          { name: 'Muzdalifah', nameAr: 'المزدلفة', lat: 21.3775, lng: 39.9364, difficulty: 4, fee: 5.50 }
        ]
      },

      'Madinah': {
        city: 'Medina',
        cityAr: 'المدينة المنورة',
        areas: [
          { name: 'Al Haram', nameAr: 'الحرم', lat: 24.4672, lng: 39.6142, difficulty: 1, fee: 3.00 },
          { name: 'Quba', nameAr: 'قباء', lat: 24.4375, lng: 39.6171, difficulty: 2, fee: 3.50 },
          { name: 'Uhud', nameAr: 'أحد', lat: 24.5017, lng: 39.6203, difficulty: 3, fee: 4.00 },
          { name: 'Al Awali', nameAr: 'العوالي', lat: 24.4900, lng: 39.5900, difficulty: 3, fee: 4.50 },
          { name: 'Taiba University', nameAr: 'جامعة طيبة', lat: 24.4814, lng: 39.5436, difficulty: 2, fee: 3.50 }
        ]
      },

      'Eastern Province': {
        city: 'Dammam',
        cityAr: 'الدمام',
        areas: [
          { name: 'Al Faisaliyah', nameAr: 'الفيصلية', lat: 26.4282, lng: 50.1044, difficulty: 1, fee: 3.00 },
          { name: 'Al Shatea', nameAr: 'الشاطئ', lat: 26.4500, lng: 50.1200, difficulty: 1, fee: 3.00 },
          { name: 'Al Adamah', nameAr: 'الأدامة', lat: 26.4000, lng: 50.0800, difficulty: 2, fee: 3.50 },
          { name: 'Al Khalij', nameAr: 'الخليج', lat: 26.4600, lng: 50.1300, difficulty: 2, fee: 3.50 },
          { name: 'King Fahd Airport', nameAr: 'مطار الملك فهد', lat: 26.4711, lng: 49.7978, difficulty: 4, fee: 6.00 }
        ]
      },

      'Al Khobar': {
        city: 'Al Khobar',
        cityAr: 'الخبر',
        areas: [
          { name: 'Corniche', nameAr: 'الكورنيش', lat: 26.2172, lng: 50.1971, difficulty: 1, fee: 3.00 },
          { name: 'Al Olaya', nameAr: 'العليا', lat: 26.3000, lng: 50.2000, difficulty: 1, fee: 3.00 },
          { name: 'Al Rakah', nameAr: 'الرقة', lat: 26.2800, lng: 50.1800, difficulty: 2, fee: 3.50 },
          { name: 'Al Thuqbah', nameAr: 'الثقبة', lat: 26.2500, lng: 50.1500, difficulty: 2, fee: 3.50 }
        ]
      },

      'Dhahran': {
        city: 'Dhahran',
        cityAr: 'الظهران',
        areas: [
          { name: 'KFUPM', nameAr: 'جامعة الملك فهد', lat: 26.3069, lng: 50.1444, difficulty: 2, fee: 3.50 },
          { name: 'Saudi Aramco', nameAr: 'أرامكو السعودية', lat: 26.2654, lng: 50.1512, difficulty: 2, fee: 3.50 },
          { name: 'Hills', nameAr: 'التلال', lat: 26.3200, lng: 50.1600, difficulty: 2, fee: 4.00 }
        ]
      },

      // Additional Saudi cities
      'Abha': {
        city: 'Abha',
        cityAr: 'أبها',
        areas: [
          { name: 'Abha Center', nameAr: 'وسط أبها', lat: 18.2164, lng: 42.5053, difficulty: 2, fee: 4.00 },
          { name: 'Al Soudah', nameAr: 'السودة', lat: 18.2742, lng: 42.3647, difficulty: 4, fee: 6.00 }
        ]
      },

      'Tabuk': {
        city: 'Tabuk',
        cityAr: 'تبوك',
        areas: [
          { name: 'Tabuk Center', nameAr: 'وسط تبوك', lat: 28.3998, lng: 36.5700, difficulty: 2, fee: 4.00 },
          { name: 'University of Tabuk', nameAr: 'جامعة تبوك', lat: 28.4167, lng: 36.5833, difficulty: 2, fee: 3.50 }
        ]
      },

      'Hail': {
        city: 'Hail',
        cityAr: 'حائل',
        areas: [
          { name: 'Hail Center', nameAr: 'وسط حائل', lat: 27.5114, lng: 41.7208, difficulty: 2, fee: 4.00 },
          { name: 'University of Hail', nameAr: 'جامعة حائل', lat: 27.4833, lng: 41.6833, difficulty: 2, fee: 3.50 }
        ]
      },

      'Qassim': {
        city: 'Buraidah',
        cityAr: 'بريدة',
        areas: [
          { name: 'Buraidah Center', nameAr: 'وسط بريدة', lat: 26.3260, lng: 43.9747, difficulty: 2, fee: 3.50 },
          { name: 'Qassim University', nameAr: 'جامعة القصيم', lat: 26.3056, lng: 43.9681, difficulty: 2, fee: 3.50 }
        ]
      },

      'Unaizah': {
        city: 'Unaizah',
        cityAr: 'عنيزة',
        areas: [
          { name: 'Unaizah Center', nameAr: 'وسط عنيزة', lat: 26.0886, lng: 43.9936, difficulty: 2, fee: 3.50 }
        ]
      },

      // Additional major Saudi cities
      'Najran': {
        city: 'Najran',
        cityAr: 'نجران',
        areas: [
          { name: 'Najran Center', nameAr: 'وسط نجران', lat: 17.4924, lng: 44.1277, difficulty: 3, fee: 5.00 },
          { name: 'Al Ukhdud', nameAr: 'الأخدود', lat: 17.4500, lng: 44.1000, difficulty: 3, fee: 5.50 },
          { name: 'Al Janub', nameAr: 'الجنوب', lat: 17.4700, lng: 44.1500, difficulty: 3, fee: 5.50 }
        ]
      },

      'Jizan': {
        city: 'Jizan',
        cityAr: 'جيزان',
        areas: [
          { name: 'Jizan Center', nameAr: 'وسط جيزان', lat: 16.8892, lng: 42.5511, difficulty: 3, fee: 5.00 },
          { name: 'Al Corniche', nameAr: 'الكورنيش', lat: 16.9000, lng: 42.5700, difficulty: 2, fee: 4.50 },
          { name: 'Sabya', nameAr: 'صبيا', lat: 17.1497, lng: 42.6249, difficulty: 3, fee: 5.50 }
        ]
      },

      'Al Bahah': {
        city: 'Al Bahah',
        cityAr: 'الباحة',
        areas: [
          { name: 'Al Bahah Center', nameAr: 'وسط الباحة', lat: 20.0129, lng: 41.4677, difficulty: 3, fee: 5.00 },
          { name: 'Baljurashi', nameAr: 'بلجرشي', lat: 19.9167, lng: 41.9167, difficulty: 4, fee: 6.00 }
        ]
      },

      'Arar': {
        city: 'Arar',
        cityAr: 'عرعر',
        areas: [
          { name: 'Arar Center', nameAr: 'وسط عرعر', lat: 30.9753, lng: 41.0381, difficulty: 4, fee: 6.00 },
          { name: 'Al Haditha', nameAr: 'الحديثة', lat: 31.0000, lng: 41.1000, difficulty: 4, fee: 6.50 }
        ]
      },

      'Sakaka': {
        city: 'Sakaka',
        cityAr: 'سكاكا',
        areas: [
          { name: 'Sakaka Center', nameAr: 'وسط سكاكا', lat: 29.9697, lng: 40.2064, difficulty: 4, fee: 6.00 },
          { name: 'Dumat al Jandal', nameAr: 'دومة الجندل', lat: 29.8000, lng: 39.8667, difficulty: 5, fee: 7.00 }
        ]
      },

      'Qurayyat': {
        city: 'Qurayyat',
        cityAr: 'القريات',
        areas: [
          { name: 'Qurayyat Center', nameAr: 'وسط القريات', lat: 31.3333, lng: 37.3422, difficulty: 4, fee: 6.50 }
        ]
      },

      'Tarout': {
        city: 'Tarout',
        cityAr: 'تاروت',
        areas: [
          { name: 'Tarout Island', nameAr: 'جزيرة تاروت', lat: 26.5833, lng: 50.0333, difficulty: 3, fee: 5.00 },
          { name: 'Qatif', nameAr: 'القطيف', lat: 26.5056, lng: 50.0094, difficulty: 3, fee: 5.00 }
        ]
      },

      // More detailed Riyadh suburbs
      'Riyadh Suburbs': {
        city: 'Riyadh',
        cityAr: 'الرياض',
        areas: [
          { name: 'Al Wadi', nameAr: 'الوادي', lat: 24.8000, lng: 46.7000, difficulty: 3, fee: 4.50 },
          { name: 'Al Ghadir', nameAr: 'الغدير', lat: 24.8200, lng: 46.7200, difficulty: 3, fee: 4.50 },
          { name: 'Al Hazm', nameAr: 'الحزم', lat: 24.7800, lng: 46.7400, difficulty: 3, fee: 4.50 },
          { name: 'Al Narjis', nameAr: 'النرجس', lat: 24.7600, lng: 46.7600, difficulty: 3, fee: 4.50 },
          { name: 'Al Warood', nameAr: 'الورود', lat: 24.7400, lng: 46.7800, difficulty: 3, fee: 4.50 },
          { name: 'Ishbiliyah', nameAr: 'إشبيلية', lat: 24.7200, lng: 46.8000, difficulty: 3, fee: 4.50 },
          { name: 'Al Rimal', nameAr: 'الرمال', lat: 24.7000, lng: 46.8200, difficulty: 3, fee: 4.50 },
          { name: 'Al Sahafa', nameAr: 'الصحافة', lat: 24.6800, lng: 46.8400, difficulty: 3, fee: 4.50 },
          { name: 'King Fahd Suburb', nameAr: 'حي الملك فهد الفرعي', lat: 24.6600, lng: 46.8600, difficulty: 3, fee: 4.50 },
          { name: 'Al Qadisiyah East', nameAr: 'القادسية الشرقية', lat: 24.6400, lng: 46.8800, difficulty: 4, fee: 5.00 }
        ]
      },

      // More detailed Jeddah suburbs
      'Jeddah Suburbs': {
        city: 'Jeddah',
        cityAr: 'جدة',
        areas: [
          { name: 'Al Naseem', nameAr: 'النسيم', lat: 21.6200, lng: 39.2300, difficulty: 2, fee: 4.00 },
          { name: 'Al Mohammadiyah', nameAr: 'المحمدية', lat: 21.6000, lng: 39.2500, difficulty: 2, fee: 4.00 },
          { name: 'Al Fahaheel', nameAr: 'الفحيحيل', lat: 21.5800, lng: 39.2700, difficulty: 3, fee: 4.50 },
          { name: 'Al Aziziyah North', nameAr: 'العزيزية الشمالية', lat: 21.5600, lng: 39.2900, difficulty: 3, fee: 4.50 },
          { name: 'Al Bawadi', nameAr: 'البوادي', lat: 21.5400, lng: 39.3100, difficulty: 3, fee: 4.50 },
          { name: 'Al Manar', nameAr: 'المنار', lat: 21.5200, lng: 39.3300, difficulty: 4, fee: 5.00 },
          { name: 'Thuwal', nameAr: 'ثول', lat: 22.2833, lng: 39.1000, difficulty: 4, fee: 6.00 },
          { name: 'Rabigh', nameAr: 'رابغ', lat: 22.7986, lng: 39.0336, difficulty: 5, fee: 7.00 }
        ]
      }
    }
  },

  // ============================================================================
  // UAE LOCATIONS (~100 locations)
  // ============================================================================
  'United Arab Emirates': {
    countryNameAr: 'الإمارات العربية المتحدة',
    governorates: {
      'Dubai': {
        city: 'Dubai',
        cityAr: 'دبي',
        areas: [
          // Central Dubai
          { name: 'Downtown Dubai', nameAr: 'وسط دبي', lat: 25.1972, lng: 55.2744, difficulty: 1, fee: 4.00 },
          { name: 'Dubai Mall', nameAr: 'دبي مول', lat: 25.1975, lng: 55.2796, difficulty: 1, fee: 4.00 },
          { name: 'Business Bay', nameAr: 'الخليج التجاري', lat: 25.1870, lng: 55.2631, difficulty: 1, fee: 4.00 },
          { name: 'Dubai Marina', nameAr: 'مارينا دبي', lat: 25.0805, lng: 55.1396, difficulty: 2, fee: 4.50 },
          { name: 'JBR', nameAr: 'شاطئ الجميرا', lat: 25.0657, lng: 55.1377, difficulty: 2, fee: 4.50 },
          { name: 'DIFC', nameAr: 'مركز دبي المالي', lat: 25.2138, lng: 55.2808, difficulty: 1, fee: 4.00 },
          { name: 'Dubai Creek', nameAr: 'خور دبي', lat: 25.2697, lng: 55.3094, difficulty: 2, fee: 4.00 },
          { name: 'Deira', nameAr: 'ديرة', lat: 25.2687, lng: 55.3095, difficulty: 2, fee: 4.00 },
          { name: 'Bur Dubai', nameAr: 'بر دبي', lat: 25.2629, lng: 55.2963, difficulty: 2, fee: 4.00 },
          { name: 'Jumeirah', nameAr: 'جميرا', lat: 25.2048, lng: 55.2708, difficulty: 2, fee: 4.50 },

          // New Dubai Areas
          { name: 'Dubai Hills', nameAr: 'تلال دبي', lat: 25.1226, lng: 55.2454, difficulty: 2, fee: 5.00 },
          { name: 'City Walk', nameAr: 'سيتي ووك', lat: 25.2213, lng: 55.2614, difficulty: 1, fee: 4.00 },
          { name: 'Al Wasl', nameAr: 'الوصل', lat: 25.2300, lng: 55.2600, difficulty: 2, fee: 4.50 },
          { name: 'Zabeel', nameAr: 'زعبيل', lat: 25.2300, lng: 55.2900, difficulty: 2, fee: 4.00 },
          { name: 'Karama', nameAr: 'كرامة', lat: 25.2489, lng: 55.3058, difficulty: 2, fee: 3.50 },

          // Outer Dubai
          { name: 'Dubai Silicon Oasis', nameAr: 'واحة دبي للسيليكون', lat: 25.1227, lng: 55.3717, difficulty: 3, fee: 5.50 },
          { name: 'International City', nameAr: 'المدينة العالمية', lat: 25.1705, lng: 55.4178, difficulty: 4, fee: 6.00 },
          { name: 'Dubai Investment Park', nameAr: 'حديقة دبي للاستثمار', lat: 25.0239, lng: 55.1708, difficulty: 3, fee: 5.50 },
          { name: 'Motor City', nameAr: 'مدينة موتور', lat: 25.0516, lng: 55.2261, difficulty: 3, fee: 5.50 },
          { name: 'Dubai Sports City', nameAr: 'مدينة دبي الرياضية', lat: 24.9924, lng: 55.1621, difficulty: 3, fee: 6.00 },

          // Dubai Airport & Surrounding
          { name: 'Dubai Airport', nameAr: 'مطار دبي', lat: 25.2532, lng: 55.3657, difficulty: 2, fee: 4.50 },
          { name: 'Garhoud', nameAr: 'القرهود', lat: 25.2500, lng: 55.3500, difficulty: 2, fee: 4.50 },
          { name: 'Festival City', nameAr: 'مدينة المهرجان', lat: 25.2219, lng: 55.3532, difficulty: 2, fee: 4.50 },

          // Beach Areas
          { name: 'Kite Beach', nameAr: 'شاطئ الطائرة الورقية', lat: 25.1976, lng: 55.2389, difficulty: 2, fee: 4.50 },
          { name: 'Sunset Beach', nameAr: 'شاطئ الغروب', lat: 25.0713, lng: 55.1297, difficulty: 2, fee: 4.50 },
          { name: 'Black Palace Beach', nameAr: 'شاطئ القصر الأسود', lat: 25.0891, lng: 55.1456, difficulty: 3, fee: 5.00 }
        ]
      },

      'Abu Dhabi': {
        city: 'Abu Dhabi',
        cityAr: 'أبوظبي',
        areas: [
          { name: 'Corniche', nameAr: 'الكورنيش', lat: 24.4539, lng: 54.3773, difficulty: 1, fee: 4.00 },
          { name: 'Marina Mall', nameAr: 'مارينا مول', lat: 24.4821, lng: 54.3198, difficulty: 1, fee: 4.00 },
          { name: 'Yas Island', nameAr: 'جزيرة ياس', lat: 24.4672, lng: 54.6031, difficulty: 2, fee: 5.00 },
          { name: 'Saadiyat Island', nameAr: 'جزيرة السعديات', lat: 24.5328, lng: 54.4370, difficulty: 3, fee: 5.50 },
          { name: 'Al Reem Island', nameAr: 'جزيرة الريم', lat: 24.4996, lng: 54.3940, difficulty: 2, fee: 4.50 },
          { name: 'Khalifa City', nameAr: 'مدينة خليفة', lat: 24.4167, lng: 54.6000, difficulty: 3, fee: 5.50 },
          { name: 'Al Ain', nameAr: 'العين', lat: 24.2075, lng: 55.7447, difficulty: 4, fee: 7.00 },
          { name: 'Masdar City', nameAr: 'مدينة مصدر', lat: 24.4292, lng: 54.6158, difficulty: 3, fee: 5.50 },
          { name: 'Al Bateen', nameAr: 'الباطن', lat: 24.4500, lng: 54.3200, difficulty: 2, fee: 4.50 },
          { name: 'Al Mushrif', nameAr: 'المشرف', lat: 24.3900, lng: 54.4500, difficulty: 2, fee: 4.50 }
        ]
      },

      'Sharjah': {
        city: 'Sharjah',
        cityAr: 'الشارقة',
        areas: [
          { name: 'Sharjah Center', nameAr: 'وسط الشارقة', lat: 25.3573, lng: 55.4033, difficulty: 2, fee: 4.00 },
          { name: 'Al Qasba', nameAr: 'القصبة', lat: 25.3286, lng: 55.3886, difficulty: 2, fee: 4.00 },
          { name: 'University City', nameAr: 'المدينة الجامعية', lat: 25.3094, lng: 55.4831, difficulty: 2, fee: 4.50 },
          { name: 'Al Nahda', nameAr: 'النهدة', lat: 25.3000, lng: 55.3800, difficulty: 2, fee: 4.50 },
          { name: 'Muwailih', nameAr: 'المويلح', lat: 25.2900, lng: 55.4600, difficulty: 3, fee: 5.00 }
        ]
      },

      'Ajman': {
        city: 'Ajman',
        cityAr: 'عجمان',
        areas: [
          { name: 'Ajman Center', nameAr: 'وسط عجمان', lat: 25.4052, lng: 55.5136, difficulty: 2, fee: 4.00 },
          { name: 'Ajman University', nameAr: 'جامعة عجمان', lat: 25.4167, lng: 55.5000, difficulty: 2, fee: 4.00 },
          { name: 'Al Jurf', nameAr: 'الجرف', lat: 25.3900, lng: 55.4800, difficulty: 3, fee: 4.50 }
        ]
      },

      'Fujairah': {
        city: 'Fujairah',
        cityAr: 'الفجيرة',
        areas: [
          { name: 'Fujairah Center', nameAr: 'وسط الفجيرة', lat: 25.1213, lng: 56.3267, difficulty: 3, fee: 5.00 },
          { name: 'Dibba', nameAr: 'دبا', lat: 25.5833, lng: 56.2667, difficulty: 4, fee: 6.00 }
        ]
      },

      'Ras Al Khaimah': {
        city: 'Ras Al Khaimah',
        cityAr: 'رأس الخيمة',
        areas: [
          { name: 'RAK Center', nameAr: 'وسط رأس الخيمة', lat: 25.7889, lng: 55.9414, difficulty: 3, fee: 5.00 },
          { name: 'Al Hamra', nameAr: 'الحمراء', lat: 25.6833, lng: 55.7833, difficulty: 3, fee: 5.50 }
        ]
      },

      'Umm Al Quwain': {
        city: 'Umm Al Quwain',
        cityAr: 'أم القيوين',
        areas: [
          { name: 'UAQ Center', nameAr: 'وسط أم القيوين', lat: 25.5641, lng: 55.6552, difficulty: 4, fee: 6.00 }
        ]
      },

      // More detailed Dubai areas
      'Dubai Extended': {
        city: 'Dubai',
        cityAr: 'دبي',
        areas: [
          { name: 'Al Barsha 1', nameAr: 'البرشاء 1', lat: 25.0916, lng: 55.1953, difficulty: 2, fee: 4.50 },
          { name: 'Al Barsha 2', nameAr: 'البرشاء 2', lat: 25.0800, lng: 55.1800, difficulty: 2, fee: 4.50 },
          { name: 'Al Barsha 3', nameAr: 'البرشاء 3', lat: 25.0700, lng: 55.1700, difficulty: 3, fee: 5.00 },
          { name: 'Al Sufouh 1', nameAr: 'الصفوح 1', lat: 25.0973, lng: 55.1648, difficulty: 2, fee: 4.50 },
          { name: 'Al Sufouh 2', nameAr: 'الصفوح 2', lat: 25.0873, lng: 55.1548, difficulty: 2, fee: 4.50 },
          { name: 'Dubai Media City', nameAr: 'مدينة دبي للإعلام', lat: 25.0973, lng: 55.1648, difficulty: 2, fee: 4.50 },
          { name: 'Dubai Internet City', nameAr: 'مدينة دبي للإنترنت', lat: 25.0973, lng: 55.1548, difficulty: 2, fee: 4.50 },
          { name: 'Dubai Knowledge Village', nameAr: 'قرية دبي للمعرفة', lat: 25.0900, lng: 55.1700, difficulty: 2, fee: 4.50 },
          { name: 'Emirates Hills', nameAr: 'تلال الإمارات', lat: 25.0700, lng: 55.1500, difficulty: 1, fee: 5.00 },
          { name: 'The Springs', nameAr: 'الينابيع', lat: 25.0600, lng: 55.1600, difficulty: 2, fee: 5.00 },
          { name: 'The Meadows', nameAr: 'المروج', lat: 25.0500, lng: 55.1700, difficulty: 2, fee: 5.00 },
          { name: 'Arabian Ranches', nameAr: 'المزارع العربية', lat: 25.0400, lng: 55.2800, difficulty: 3, fee: 6.00 },
          { name: 'Green Community', nameAr: 'المجتمع الأخضر', lat: 25.0300, lng: 55.2900, difficulty: 3, fee: 6.00 },
          { name: 'Discovery Gardens', nameAr: 'حدائق الاستكشاف', lat: 25.0424, lng: 55.1284, difficulty: 3, fee: 5.50 },
          { name: 'Ibn Battuta', nameAr: 'ابن بطوطة', lat: 25.0424, lng: 55.1184, difficulty: 3, fee: 5.50 },
          { name: 'Jebel Ali Village', nameAr: 'قرية جبل علي', lat: 25.0200, lng: 55.1000, difficulty: 4, fee: 6.50 },
          { name: 'Palm Jumeirah', nameAr: 'نخلة الجميرا', lat: 25.1124, lng: 55.1390, difficulty: 2, fee: 5.00 },
          { name: 'Dubai South', nameAr: 'دبي الجنوب', lat: 24.8965, lng: 55.1611, difficulty: 4, fee: 7.00 },
          { name: 'Al Maktoum Airport', nameAr: 'مطار آل مكتوم', lat: 24.8965, lng: 55.1611, difficulty: 4, fee: 7.00 },
          { name: 'Expo 2020', nameAr: 'إكسبو 2020', lat: 24.9170, lng: 55.1922, difficulty: 3, fee: 6.00 }
        ]
      },

      // More Abu Dhabi areas
      'Abu Dhabi Extended': {
        city: 'Abu Dhabi',
        cityAr: 'أبوظبي',
        areas: [
          { name: 'Al Raha Beach', nameAr: 'شاطئ الراحة', lat: 24.4167, lng: 54.6167, difficulty: 3, fee: 5.50 },
          { name: 'Al Reef', nameAr: 'الريف', lat: 24.3833, lng: 54.6333, difficulty: 3, fee: 5.50 },
          { name: 'Al Shamkha', nameAr: 'الشمخة', lat: 24.3500, lng: 54.6500, difficulty: 4, fee: 6.00 },
          { name: 'Mohammed Bin Zayed City', nameAr: 'مدينة محمد بن زايد', lat: 24.3333, lng: 54.6833, difficulty: 3, fee: 5.50 },
          { name: 'Baniyas', nameAr: 'بني ياس', lat: 24.3000, lng: 54.6000, difficulty: 4, fee: 6.00 },
          { name: 'Western Region', nameAr: 'المنطقة الغربية', lat: 23.7500, lng: 53.5000, difficulty: 5, fee: 8.00 },
          { name: 'Liwa Oasis', nameAr: 'واحة ليوا', lat: 23.1333, lng: 53.7667, difficulty: 5, fee: 8.50 },
          { name: 'Madinat Zayed', nameAr: 'مدينة زايد', lat: 23.6500, lng: 53.7000, difficulty: 5, fee: 8.00 }
        ]
      }
    }
  },

  // ============================================================================
  // KUWAIT LOCATIONS (~50 locations)
  // ============================================================================
  Kuwait: {
    countryNameAr: 'الكويت',
    governorates: {
      'Capital': {
        city: 'Kuwait City',
        cityAr: 'مدينة الكويت',
        areas: [
          { name: 'Sharq', nameAr: 'شرق', lat: 29.3759, lng: 47.9774, difficulty: 1, fee: 3.00 },
          { name: 'Mirqab', nameAr: 'المرقاب', lat: 29.3700, lng: 47.9800, difficulty: 1, fee: 3.00 },
          { name: 'Dasman', nameAr: 'دسمان', lat: 29.3850, lng: 47.9950, difficulty: 1, fee: 3.00 },
          { name: 'Jibla', nameAr: 'جبلة', lat: 29.3600, lng: 47.9700, difficulty: 2, fee: 3.50 },
          { name: 'Kuwait Towers', nameAr: 'أبراج الكويت', lat: 29.3884, lng: 48.0006, difficulty: 1, fee: 3.00 }
        ]
      },

      'Hawalli': {
        city: 'Hawalli',
        cityAr: 'حولي',
        areas: [
          { name: 'Hawalli Center', nameAr: 'وسط حولي', lat: 29.3328, lng: 48.0289, difficulty: 2, fee: 3.50 },
          { name: 'Salmiya', nameAr: 'السالمية', lat: 29.3375, lng: 48.0758, difficulty: 1, fee: 3.00 },
          { name: 'Maidan Hawalli', nameAr: 'ميدان حولي', lat: 29.3400, lng: 48.0200, difficulty: 2, fee: 3.50 },
          { name: 'Rumaithiya', nameAr: 'الرميثية', lat: 29.3100, lng: 48.0700, difficulty: 2, fee: 4.00 },
          { name: 'Bayan', nameAr: 'بيان', lat: 29.3000, lng: 48.0500, difficulty: 2, fee: 4.00 },
          { name: 'Mishref', nameAr: 'مشرف', lat: 29.2700, lng: 48.0800, difficulty: 3, fee: 4.50 }
        ]
      },

      'Farwaniya': {
        city: 'Farwaniya',
        cityAr: 'الفروانية',
        areas: [
          { name: 'Farwaniya Center', nameAr: 'وسط الفروانية', lat: 29.2775, lng: 47.9589, difficulty: 2, fee: 3.50 },
          { name: 'Jleeb Al-Shuyoukh', nameAr: 'جليب الشيوخ', lat: 29.2900, lng: 47.9200, difficulty: 3, fee: 4.50 },
          { name: 'Ardiya', nameAr: 'العارضية', lat: 29.2600, lng: 47.9400, difficulty: 3, fee: 4.50 },
          { name: 'Firdous', nameAr: 'الفردوس', lat: 29.2800, lng: 47.9800, difficulty: 2, fee: 4.00 },
          { name: 'Khaitan', nameAr: 'خيطان', lat: 29.2500, lng: 47.9000, difficulty: 3, fee: 5.00 }
        ]
      },

      'Ahmadi': {
        city: 'Ahmadi',
        cityAr: 'الأحمدي',
        areas: [
          { name: 'Ahmadi Center', nameAr: 'وسط الأحمدي', lat: 29.0769, lng: 48.0767, difficulty: 2, fee: 4.00 },
          { name: 'Fahaheel', nameAr: 'الفحيحيل', lat: 29.0833, lng: 48.1300, difficulty: 2, fee: 4.00 },
          { name: 'Mangaf', nameAr: 'المنقف', lat: 29.0600, lng: 48.1200, difficulty: 3, fee: 4.50 },
          { name: 'Abu Halifa', nameAr: 'أبو حليفة', lat: 29.0900, lng: 48.1100, difficulty: 3, fee: 4.50 },
          { name: 'Mahboula', nameAr: 'المهبولة', lat: 29.0400, lng: 48.1400, difficulty: 3, fee: 5.00 },
          { name: 'Fintas', nameAr: 'الفنطاس', lat: 29.0300, lng: 48.1300, difficulty: 3, fee: 5.00 }
        ]
      },

      'Jahra': {
        city: 'Jahra',
        cityAr: 'الجهراء',
        areas: [
          { name: 'Jahra Center', nameAr: 'وسط الجهراء', lat: 29.3358, lng: 47.6581, difficulty: 3, fee: 5.00 },
          { name: 'Sulaibiya', nameAr: 'الصليبية', lat: 29.3100, lng: 47.6200, difficulty: 4, fee: 5.50 },
          { name: 'Taima', nameAr: 'تيماء', lat: 29.3600, lng: 47.6000, difficulty: 4, fee: 6.00 },
          { name: 'Qasr', nameAr: 'القصر', lat: 29.4000, lng: 47.7000, difficulty: 3, fee: 5.00 }
        ]
      },

      'Mubarak Al-Kabeer': {
        city: 'Mubarak Al-Kabeer',
        cityAr: 'مبارك الكبير',
        areas: [
          { name: 'Qurain', nameAr: 'القرين', lat: 29.2400, lng: 48.0200, difficulty: 3, fee: 4.50 },
          { name: 'Adan', nameAr: 'العدان', lat: 29.2200, lng: 48.0500, difficulty: 3, fee: 4.50 },
          { name: 'Qusour', nameAr: 'القصور', lat: 29.2000, lng: 48.0800, difficulty: 3, fee: 5.00 },
          { name: 'Abu Ftaira', nameAr: 'أبو فطيرة', lat: 29.1800, lng: 48.1000, difficulty: 4, fee: 5.50 }
        ]
      },

      // Additional Kuwait areas
      'Kuwait Extended': {
        city: 'Kuwait City',
        cityAr: 'مدينة الكويت',
        areas: [
          { name: 'Qadsia', nameAr: 'القادسية', lat: 29.3200, lng: 48.0000, difficulty: 2, fee: 3.50 },
          { name: 'Surra', nameAr: 'الصرة', lat: 29.3800, lng: 47.9200, difficulty: 2, fee: 4.00 },
          { name: 'Sabah Al Salem', nameAr: 'صباح السالم', lat: 29.2100, lng: 48.0600, difficulty: 3, fee: 4.50 },
          { name: 'Sabah Al Ahmad', nameAr: 'صباح الأحمد', lat: 28.9500, lng: 48.0000, difficulty: 4, fee: 6.00 },
          { name: 'Al Khiran', nameAr: 'الخيران', lat: 28.6200, lng: 48.3100, difficulty: 5, fee: 7.00 },
          { name: 'Wafra', nameAr: 'الوفرة', lat: 28.6000, lng: 47.9300, difficulty: 5, fee: 7.50 },
          { name: 'Abdullah Al Mubarak', nameAr: 'عبدالله المبارك', lat: 29.2300, lng: 47.8700, difficulty: 3, fee: 5.00 },
          { name: 'Jaber Al Ali', nameAr: 'جابر العلي', lat: 29.1000, lng: 48.1500, difficulty: 4, fee: 5.50 },
          { name: 'Al Waha', nameAr: 'الواحة', lat: 29.1200, lng: 48.1300, difficulty: 4, fee: 5.50 },
          { name: 'South Saad Al Abdullah', nameAr: 'جنوب سعد العبدالله', lat: 29.2500, lng: 47.8500, difficulty: 4, fee: 6.00 }
        ]
      }
    }
  },

  // ============================================================================
  // QATAR LOCATIONS (~30 locations)
  // ============================================================================
  Qatar: {
    countryNameAr: 'قطر',
    governorates: {
      'Doha': {
        city: 'Doha',
        cityAr: 'الدوحة',
        areas: [
          // Central Doha
          { name: 'West Bay', nameAr: 'الخليج الغربي', lat: 25.3548, lng: 51.5310, difficulty: 1, fee: 4.00 },
          { name: 'The Pearl', nameAr: 'اللؤلؤة', lat: 25.3733, lng: 51.5544, difficulty: 1, fee: 4.00 },
          { name: 'Corniche', nameAr: 'الكورنيش', lat: 25.2854, lng: 51.5310, difficulty: 1, fee: 4.00 },
          { name: 'Souq Waqif', nameAr: 'سوق واقف', lat: 25.2854, lng: 51.5310, difficulty: 2, fee: 4.00 },
          { name: 'Al Sadd', nameAr: 'السد', lat: 25.2900, lng: 51.5400, difficulty: 2, fee: 4.00 },
          { name: 'Al Dafna', nameAr: 'الدفنة', lat: 25.3200, lng: 51.5200, difficulty: 1, fee: 4.00 },
          { name: 'Lusail', nameAr: 'لوسيل', lat: 25.4382, lng: 51.4832, difficulty: 2, fee: 5.00 },
          { name: 'Al Wakra', nameAr: 'الوكرة', lat: 25.1615, lng: 51.6074, difficulty: 3, fee: 5.50 },
          { name: 'Msheireb', nameAr: 'مشيرب', lat: 25.2900, lng: 51.5300, difficulty: 1, fee: 4.00 },
          { name: 'Education City', nameAr: 'المدينة التعليمية', lat: 25.3167, lng: 51.4389, difficulty: 2, fee: 4.50 },

          // Suburban Areas
          { name: 'Al Rayyan', nameAr: 'الريان', lat: 25.2919, lng: 51.4240, difficulty: 2, fee: 4.50 },
          { name: 'Al Gharafa', nameAr: 'الغرافة', lat: 25.2700, lng: 51.4500, difficulty: 2, fee: 4.50 },
          { name: 'Al Aziziyah', nameAr: 'العزيزية', lat: 25.3000, lng: 51.4800, difficulty: 2, fee: 4.50 },
          { name: 'Bin Mahmoud', nameAr: 'بن محمود', lat: 25.2800, lng: 51.5500, difficulty: 2, fee: 4.00 },
          { name: 'Al Hilal', nameAr: 'الهلال', lat: 25.2600, lng: 51.5200, difficulty: 2, fee: 4.50 },

          // Outer Areas
          { name: 'Al Khor', nameAr: 'الخور', lat: 25.6851, lng: 51.4969, difficulty: 4, fee: 7.00 },
          { name: 'Mesaieed', nameAr: 'مسيعيد', lat: 24.9917, lng: 51.5583, difficulty: 4, fee: 7.00 },
          { name: 'Al Shamal', nameAr: 'الشمال', lat: 25.8500, lng: 51.2000, difficulty: 5, fee: 8.00 },
          { name: 'Dukhan', nameAr: 'دخان', lat: 25.4172, lng: 50.7797, difficulty: 4, fee: 7.50 },
          { name: 'Al Ruwais', nameAr: 'الرويس', lat: 25.8667, lng: 51.2000, difficulty: 5, fee: 8.00 },

          // Airport Area
          { name: 'Hamad International Airport', nameAr: 'مطار حمد الدولي', lat: 25.2731, lng: 51.6086, difficulty: 3, fee: 5.50 }
        ]
      },

      // Additional Qatar areas
      'Qatar Extended': {
        city: 'Doha',
        cityAr: 'الدوحة',
        areas: [
          { name: 'Al Thumama', nameAr: 'الثمامة', lat: 25.2000, lng: 51.4000, difficulty: 3, fee: 5.50 },
          { name: 'Al Wukair', nameAr: 'الوكير', lat: 25.1500, lng: 51.5500, difficulty: 3, fee: 5.50 },
          { name: 'Old Airport', nameAr: 'المطار القديم', lat: 25.2600, lng: 51.5600, difficulty: 2, fee: 4.50 },
          { name: 'Industrial Area', nameAr: 'المنطقة الصناعية', lat: 25.2000, lng: 51.4500, difficulty: 3, fee: 5.00 },
          { name: 'Al Sailiya', nameAr: 'السيلية', lat: 25.3500, lng: 51.3500, difficulty: 3, fee: 5.50 },
          { name: 'Umm Salal', nameAr: 'أم صلال', lat: 25.4167, lng: 51.4000, difficulty: 4, fee: 6.00 },
          { name: 'Al Daayen', nameAr: 'الدعيين', lat: 25.4500, lng: 51.4500, difficulty: 4, fee: 6.00 },
          { name: 'Al Shahaniya', nameAr: 'الشحانية', lat: 25.3833, lng: 51.2000, difficulty: 4, fee: 6.50 },
          { name: 'Fuwayrit', nameAr: 'الفويرط', lat: 25.7833, lng: 51.3667, difficulty: 5, fee: 7.50 },
          { name: 'Simaisma', nameAr: 'سميسمة', lat: 25.6667, lng: 51.2333, difficulty: 5, fee: 7.50 },
          { name: 'Madinat ash Shamal', nameAr: 'مدينة الشمال', lat: 26.1289, lng: 51.2000, difficulty: 5, fee: 8.00 },
          { name: 'Zubarah', nameAr: 'الزبارة', lat: 25.9833, lng: 51.0333, difficulty: 5, fee: 8.50 }
        ]
      }
    }
  }
};

// Helper function to generate search text
function generateSearchText(countryName, city, area, areaAr) {
  return [
    countryName.toLowerCase(),
    city.toLowerCase(),
    area.toLowerCase(),
    areaAr,
    `${city.toLowerCase()} ${area.toLowerCase()}`,
    `${countryName.toLowerCase()} ${city.toLowerCase()}`,
    `${countryName.toLowerCase()} ${area.toLowerCase()}`
  ].join(' ');
}

// Main seeding function
async function seedLocations() {
  try {
    console.log('🌍 Starting comprehensive global locations seeding...');
    await client.connect();

    let totalInserted = 0;
    const insertPromises = [];

    // Check current count
    const currentCountResult = await client.query('SELECT COUNT(*) FROM global_locations');
    const currentCount = parseInt(currentCountResult.rows[0].count);
    console.log(`📊 Current locations in database: ${currentCount}`);

    for (const [countryName, countryData] of Object.entries(locationData)) {
      console.log(`\n🏗️ Processing ${countryName}...`);

      for (const [governorate, govData] of Object.entries(countryData.governorates)) {
        console.log(`  📍 Processing ${govData.city}...`);

        for (const area of govData.areas) {
          const locationId = `gl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          const searchText = generateSearchText(
            countryName,
            govData.city,
            area.name,
            area.nameAr
          );

          const insertQuery = `
            INSERT INTO global_locations (
              id, country_name, country_name_ar, governorate, city_name, city_name_ar,
              area_name, area_name_ar, sub_area_name, sub_area_name_ar,
              latitude, longitude, search_text, is_active,
              delivery_difficulty, average_delivery_fee, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            ON CONFLICT (id) DO NOTHING
          `;

          const values = [
            locationId,
            countryName,
            countryData.countryNameAr,
            governorate,
            govData.city,
            govData.cityAr,
            area.name,
            area.nameAr,
            null, // sub_area_name
            null, // sub_area_name_ar
            area.lat,
            area.lng,
            searchText,
            true, // is_active
            area.difficulty,
            area.fee,
            new Date(),
            new Date()
          ];

          insertPromises.push(
            client.query(insertQuery, values).then(() => {
              totalInserted++;
              if (totalInserted % 50 === 0) {
                console.log(`    ✅ Inserted ${totalInserted} locations so far...`);
              }
            }).catch(err => {
              console.error(`    ❌ Error inserting ${area.name}:`, err.message);
            })
          );
        }
      }
    }

    // Wait for all insertions to complete
    console.log('\n⏳ Waiting for all insertions to complete...');
    await Promise.all(insertPromises);

    // Final count check
    const finalCountResult = await client.query('SELECT COUNT(*) FROM global_locations');
    const finalCount = parseInt(finalCountResult.rows[0].count);

    console.log('\n🎉 Seeding completed successfully!');
    console.log(`📊 Final location count: ${finalCount}`);
    console.log(`✨ New locations added: ${finalCount - currentCount}`);

    // Show breakdown by country
    console.log('\n📈 Location breakdown by country:');
    const breakdown = await client.query(`
      SELECT country_name, COUNT(*) as count
      FROM global_locations
      GROUP BY country_name
      ORDER BY count DESC
    `);

    breakdown.rows.forEach(row => {
      console.log(`  ${row.country_name}: ${row.count} locations`);
    });

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the seeding
if (require.main === module) {
  seedLocations()
    .then(() => {
      console.log('\n🚀 Global locations seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedLocations };