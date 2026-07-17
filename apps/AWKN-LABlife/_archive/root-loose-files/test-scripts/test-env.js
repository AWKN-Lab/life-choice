require('dotenv').config({path: '/opt/awkn-life/.env'});
console.log('MOONSHOT_API_KEY:', process.env.MOONSHOT_API_KEY ? 'SET' : 'NOT SET');
console.log('KIMI_API_KEY:', process.env.KIMI_API_KEY ? 'SET' : 'NOT SET');
console.log('MINIMAX_API_KEY:', process.env.MINIMAX_API_KEY ? 'SET' : 'NOT SET');
