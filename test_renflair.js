import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const testRenflair = async () => {
    const phone = '1234567890';
    const otp = '1234';
    const url = `${process.env.RENFLAIR_SMS_URL}?API=${process.env.RENFLAIR_API_KEY}&PHONE=${phone}&OTP=${otp}`;

    console.log('Testing Renflair URL:', url);

    try {
        const response = await axios.get(url);
        console.log('Renflair Response:', JSON.stringify(response.data));
    } catch (error) {
        console.error('Renflair Error:', error.message);
    }
};

testRenflair();
