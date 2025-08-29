import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import HomePage from './pages/HomePage';
import PracticePage from './pages/PracticePage';
import UploadPage from './pages/UploadPage';
import StatisticsPage from './pages/StatisticsPage';

function App() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PDF to Question Bank
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/statistics/:textbookId" element={<StatisticsPage />} />
        </Routes>
      </Container>
    </Box>
  );
}

export default App;