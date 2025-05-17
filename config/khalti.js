require('dotenv').config();

const KHALTI_API_KEY = process.env.KHALTI_API_KEY || "05bf95cc57244045b8df5fad06748dab";
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

module.exports = {
  KHALTI_API_KEY,
  BASE_URL
};