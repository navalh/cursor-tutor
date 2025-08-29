import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Upload,
  Autorenew,
  CheckCircle
} from '@mui/icons-material';
import FileUpload from '../components/FileUpload';
import { uploadAPI } from '../services/api';

const steps = [
  {
    label: 'Upload PDF',
    description: 'Select and upload your textbook PDF file',
    icon: <Upload />
  },
  {
    label: 'Processing',
    description: 'Extracting chapters and questions from your textbook',
    icon: <Autorenew />
  },
  {
    label: 'Complete',
    description: 'Your textbook is ready for practice!',
    icon: <CheckCircle />
  }
];

const UploadPage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [textbookId, setTextbookId] = useState(null);
  const [processingStatus, setProcessingStatus] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleUploadComplete = async (result) => {
    setTextbookId(result.textbook_id);
    setActiveStep(1);
    
    // Start polling for processing status
    pollProcessingStatus(result.textbook_id);
  };

  const pollProcessingStatus = async (textbookId) => {
    try {
      const status = await uploadAPI.getProcessingStatus(textbookId);
      setProcessingStatus(status);
      
      if (status.status === 'completed') {
        setActiveStep(2);
      } else if (status.status === 'failed') {
        setError('Processing failed. Please try uploading again.');
        setActiveStep(0);
      } else if (status.status === 'processing') {
        // Continue polling
        setTimeout(() => pollProcessingStatus(textbookId), 3000);
      }
    } catch (err) {
      setError('Failed to check processing status');
    }
  };

  const handleStartPractice = () => {
    navigate('/practice', { state: { textbookId } });
  };

  const handleReset = () => {
    setActiveStep(0);
    setTextbookId(null);
    setProcessingStatus(null);
    setError(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          component={Link}
          to="/"
          startIcon={<ArrowBack />}
          sx={{ mr: 2 }}
        >
          Back to Home
        </Button>
        <Typography variant="h4" component="h1">
          Upload Textbook
        </Typography>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={handleReset}>
              Try Again
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* Progress Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={step.label}>
              <StepLabel
                optional={
                  index === 1 && processingStatus && (
                    <Typography variant="caption">
                      {processingStatus.total_pages} pages • {processingStatus.status}
                    </Typography>
                  )
                }
              >
                {step.label}
              </StepLabel>
              <StepContent>
                <Typography sx={{ mb: 2 }}>
                  {step.description}
                </Typography>
                
                {index === 0 && (
                  <FileUpload onUploadComplete={handleUploadComplete} />
                )}
                
                {index === 1 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CircularProgress size={24} />
                    <Typography>
                      Processing your textbook... This may take a few minutes.
                    </Typography>
                  </Box>
                )}
                
                {index === 2 && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Your textbook has been processed successfully!
                    </Alert>
                    
                    {processingStatus && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          <strong>File:</strong> {processingStatus.filename}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Pages:</strong> {processingStatus.total_pages}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleStartPractice}
                        size="large"
                      >
                        Start Practice
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => navigate(`/statistics/${textbookId}`)}
                      >
                        View Statistics
                      </Button>
                      <Button
                        variant="text"
                        onClick={handleReset}
                      >
                        Upload Another
                      </Button>
                    </Box>
                  </Box>
                )}
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Instructions */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Instructions
        </Typography>
        <Box component="ul" sx={{ pl: 2 }}>
          <Typography component="li" variant="body2" gutterBottom>
            <strong>Upload:</strong> Select a PDF textbook file from your device
          </Typography>
          <Typography component="li" variant="body2" gutterBottom>
            <strong>Processing:</strong> The system will analyze your textbook and extract:
            <Box component="ul" sx={{ pl: 2, mt: 1 }}>
              <Typography component="li" variant="body2">
                Table of contents and chapter structure
              </Typography>
              <Typography component="li" variant="body2">
                Practice questions and exercises
              </Typography>
              <Typography component="li" variant="body2">
                Question context and metadata
              </Typography>
            </Box>
          </Typography>
          <Typography component="li" variant="body2" gutterBottom>
            <strong>Practice:</strong> Once processing is complete, you can start practicing with questions from any chapter
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default UploadPage;