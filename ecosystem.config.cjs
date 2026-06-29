module.exports = {
  apps: [
    {
      name: 'controlpanel-3090',
      cwd: '/home/myecs/ai-lab/controlpanel',
      script: 'npx',
      args: 'vite preview --port 3090 --host 0.0.0.0',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      max_memory_restart: '500M',
    },
  ],
};
