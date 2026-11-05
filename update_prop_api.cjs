const fs = require('fs');
const file = 'F:/ghar_plot/ghar-plot-application/src/services/propertyapi.js';
let content = fs.readFileSync(file, 'utf8');

const addition = `
/**
 * Fetch inquiries received by the logged-in client on their properties
 * cURL: GET /api/inquiry/my-received
 * @returns {Promise<object>} { success, canReceiveInquiries, count, data, message }
 */
export const getClientReceivedInquiriesAPI = async () => {
    try {
        const response = await get('/api/inquiry/my-received');
        return response;
    } catch (error) {
        console.error('Error in getClientReceivedInquiriesAPI:', error);
        throw error;
    }
};
`;

content += addition;
fs.writeFileSync(file, content, 'utf8');
console.log('propertyapi.js updated with getClientReceivedInquiriesAPI');

