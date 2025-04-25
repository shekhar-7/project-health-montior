import app from './app';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const port = Number(process.env.PORT) || 3001;

// Get local IP address
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIpAddress();

// Listen on all network interfaces (0.0.0.0)
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running at:`);
  console.log(`   Local:   http://localhost:${port}`);
  console.log(`   Network: http://${localIp}:${port}`);
  console.log(`\n📚 Documentation available at:`);
  console.log(`   Local:   http://localhost:${port}/api-docs`);
  console.log(`   Network: http://${localIp}:${port}/api-docs\n`);
});

// Handle server errors
server.on('error', (e: any) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use`);
  } else {
    console.error('Server error:', e);
  }
});
