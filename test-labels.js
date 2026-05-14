const axios = require('axios');

const headers = {
  'Content-Type': 'application/json',
  'SecretKey': '9ef1ce45-8fc8-410d-b600-fff2aea3cca7L',
  'PublicToken': '01957166-18ca-486b-aacc-df1d95690f50',
  'DeviceToken': '975e48aa-74db-464d-97a3-0ef7a523764d',
  'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOi8vZ2F0ZXdheS5hcGlicmFzaWwuaW8vYXBpL3YyL2F1dGgvcmVnaXN0ZXIiLCJpYXQiOjE3NjE0OTQ2MzksImV4cCI6MTc5MzAzMDYzOSwibmJmIjoxNzYxNDk0NjM5LCJqdGkiOiJuWWJtTVhHSGNVQzFqZkFNIiwic3ViIjoiMTc5MzQiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3In0.47hESUk1HdzjHaoFn8mO3AhsYKiQywM6RimO0ArAuqA'
};

async function run() {
  try {
    const res = await axios.post('http://gateway.apibrasil.io/api/v2/whatsapp/getAllLabels', {}, { headers });
    console.log("LABELS:", JSON.stringify(res.data).substring(0, 500));
  } catch (e) {
    console.log("LABELS ERR:", e.response ? e.response.data : e.message);
  }
}
run();
