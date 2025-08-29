import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  LinearProgress,
  Alert,
  Fab
} from '@mui/material';
import {
  Upload,
  MenuBook,
  Quiz,
  Analytics,
  Add
} from '@mui/icons-material';
import { uploadAPI } from '../services/api';

const HomePage = () => {
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadTextbooks();
  }, []);

  const loadTextbooks = async () => {
    try {
      setLoading(true);
      const data = await uploadAPI.getTextbooks();
      setTextbooks(data);
    } catch (err) {
      setError('Failed to load textbooks');
      console.error('Error loading textbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Processing...';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Loading textbooks...
        </Typography>
        <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          PDF to Question Bank
        </Typography>
        <Typography variant="h6" color="textSecondary" gutterBottom>
          Upload textbooks and practice with extracted questions
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Upload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Upload PDF
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Upload a textbook to extract questions
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Button 
                component={Link} 
                to="/upload" 
                variant="contained"
                size="small"
              >
                Upload
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Quiz sx={{ fontSize: 48, color: 'secondary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Practice
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Practice with random questions
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center' }}>
              <Button 
                component={Link} 
                to="/practice" 
                variant="contained"
                size="small"
                color="secondary"
              >
                Practice
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <MenuBook sx={{ fontSize: 48, color: 'info.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Textbooks
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {textbooks.length} textbooks uploaded
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Analytics sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Statistics
              </Typography>
              <Typography variant="body2" color="textSecondary">
                View processing statistics
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Textbooks List */}
      <Typography variant="h4" gutterBottom>
        Your Textbooks
      </Typography>

      {textbooks.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <MenuBook sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No textbooks uploaded yet
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              Upload your first PDF textbook to get started
            </Typography>
            <Button
              component={Link}
              to="/upload"
              variant="contained"
              startIcon={<Upload />}
              sx={{ mt: 2 }}
            >
              Upload Textbook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {textbooks.map((textbook) => (
            <Grid item xs={12} sm={6} md={4} key={textbook.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom noWrap>
                    {textbook.title}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {textbook.filename}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Chip 
                      label={getStatusText(textbook.status)}
                      color={getStatusColor(textbook.status)}
                      size="small"
                    />
                    {textbook.status === 'processing' && (
                      <LinearProgress sx={{ flexGrow: 1 }} />
                    )}
                  </Box>

                  <Typography variant="body2" color="textSecondary">
                    Pages: {textbook.total_pages || 'Unknown'}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary">
                    Chapters: {textbook.chapters_count}
                  </Typography>
                  
                  <Typography variant="body2" color="textSecondary">
                    Uploaded: {new Date(textbook.upload_date).toLocaleDateString()}
                  </Typography>
                </CardContent>
                
                <CardActions>
                  {textbook.status === 'completed' && (
                    <>
                      <Button
                        size="small"
                        onClick={() => navigate('/practice', { state: { textbookId: textbook.id } })}
                      >
                        Practice
                      </Button>
                      <Button
                        size="small"
                        onClick={() => navigate(`/statistics/${textbook.id}`)}
                      >
                        Statistics
                      </Button>
                    </>
                  )}
                  {textbook.status === 'processing' && (
                    <Button
                      size="small"
                      disabled
                    >
                      Processing...
                    </Button>
                  )}
                  {textbook.status === 'failed' && (
                    <Button
                      size="small"
                      color="error"
                    >
                      Failed
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        component={Link}
        to="/upload"
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default HomePage;