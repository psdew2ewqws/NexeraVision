import { z } from 'zod';
import { COUNTRY_CODES } from '../../constants/countries';

// Common field validations
export const commonFields = {
  name: z.string().min(2, 'Name must be at least 2 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  countryCode: z.string().min(1, 'Country code is required'),
  phone: z.string().min(7, 'Phone number is required'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
  city: z.string().min(2, 'City is required'),
  openTime: z.string().min(1, 'Opening time is required'),
  closeTime: z.string().min(1, 'Closing time is required'),
};

// Phone number validation factory
export const createPhoneValidation = (phoneField = 'phone', countryField = 'countryCode') => 
  z.object({}).refine((data: any) => {
    const countryData = COUNTRY_CODES.find(c => c.code === data[countryField]);
    if (countryData && data[phoneField]) {
      return countryData.pattern.test(data[phoneField]);
    }
    return true;
  }, {
    message: 'Invalid phone number format for selected country',
    path: [phoneField]
  });