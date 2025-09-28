export default function handler(req, res) {
  res.status(200).json({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}