import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box, Avatar, Chip } from '@mui/material';
import { Notifications as NotificationsIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useAuthStore } from '../auth/authStore';
import { useNavigate } from 'react-router-dom';
import { DRAWER_WIDTH } from './Sidebar';

const HeaderBar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: `calc(100% - ${DRAWER_WIDTH}px)`,
        ml: `${DRAWER_WIDTH}px`,
        bgcolor: '#fff',
        color: '#333',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
          Business Service Management
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {user?.role && (
            <Chip
              label={user.role}
              size="small"
              sx={{ bgcolor: '#e8eaf6', color: '#3f51b5', fontWeight: 500 }}
            />
          )}
          <IconButton size="small" sx={{ color: '#666' }}>
            <NotificationsIcon />
          </IconButton>
          <Avatar sx={{ width: 32, height: 32, bgcolor: '#3f51b5', fontSize: 14 }}>
            {user?.name?.[0] || 'U'}
          </Avatar>
          <IconButton onClick={handleLogout} size="small" sx={{ color: '#666' }}>
            <LogoutIcon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default HeaderBar;
